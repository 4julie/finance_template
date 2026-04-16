// SPDX-License-Identifier: BUSL-1.1

// LocalBackupService.swift
// Finance
//
// Offline-first backup and restore service that serialises all financial
// data to a local encrypted backup file and supports iCloud document
// storage for cross-device restore.
//
// Architecture:
// - All reads go through the repository layer (edge-first, offline-first)
// - Backup files are JSON-encoded and optionally stored in iCloud Documents
// - Sensitive credentials remain in Keychain — never included in backups
// - Uses os.Logger for structured, privacy-aware logging
//
// Refs #302

import Foundation
import os

// MARK: - Backup Error

/// Errors that can occur during backup or restore operations.
enum BackupError: LocalizedError, Sendable {
    case serializationFailed(underlying: String)
    case deserializationFailed(underlying: String)
    case fileWriteFailed(underlying: String)
    case fileReadFailed(underlying: String)
    case incompatibleVersion(found: Int, expected: Int)
    case noBackupFound
    case iCloudUnavailable
    case restoreFailed(underlying: String)

    var errorDescription: String? {
        switch self {
        case .serializationFailed(let reason):
            String(localized: "Failed to create backup: \(reason)")
        case .deserializationFailed(let reason):
            String(localized: "Failed to read backup: \(reason)")
        case .fileWriteFailed(let reason):
            String(localized: "Failed to save backup file: \(reason)")
        case .fileReadFailed(let reason):
            String(localized: "Failed to open backup file: \(reason)")
        case .incompatibleVersion(let found, let expected):
            String(localized: "Backup version \(found) is not compatible with app version (expected \(expected) or earlier).")
        case .noBackupFound:
            String(localized: "No backup file was found.")
        case .iCloudUnavailable:
            String(localized: "iCloud is not available. Please sign in to iCloud in Settings.")
        case .restoreFailed(let reason):
            String(localized: "Failed to restore data: \(reason)")
        }
    }
}

// MARK: - Backup Status

/// Observable status of a backup or restore operation.
enum BackupStatus: Sendable, Equatable {
    case idle
    case inProgress(phase: String)
    case completed(manifest: BackupManifest)
    case failed(message: String)
}

// MARK: - Local Backup Service

/// Manages offline-first data backup and restore operations.
///
/// The service reads all financial data from local repositories,
/// serialises it to a JSON payload with a manifest, and writes it to
/// the app's documents directory. When iCloud is available, the backup
/// is also stored in the iCloud Documents container for cross-device
/// availability.
///
/// **Security**: Backup payloads contain financial data but **never**
/// include authentication tokens, encryption keys, or Keychain items.
/// Those remain device-bound in the Apple Keychain.
actor LocalBackupService {

    // MARK: - Dependencies

    private let accountRepository: any AccountRepository
    private let transactionRepository: any TransactionRepository
    private let budgetRepository: any BudgetRepository
    private let goalRepository: any GoalRepository
    private let categoryRepository: any CategoryRepository

    // MARK: - Logging

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.finance",
        category: "LocalBackupService"
    )

    // MARK: - Constants

    static let backupFileName = "finance-backup.json"
    static let backupDirectoryName = "Backups"

    // MARK: - Initialisation

    init(
        accountRepository: any AccountRepository = RepositoryProvider.shared.accounts,
        transactionRepository: any TransactionRepository = RepositoryProvider.shared.transactions,
        budgetRepository: any BudgetRepository = RepositoryProvider.shared.budgets,
        goalRepository: any GoalRepository = RepositoryProvider.shared.goals,
        categoryRepository: any CategoryRepository = RepositoryProvider.shared.categories
    ) {
        self.accountRepository = accountRepository
        self.transactionRepository = transactionRepository
        self.budgetRepository = budgetRepository
        self.goalRepository = goalRepository
        self.categoryRepository = categoryRepository
    }

    // MARK: - Backup

    /// Creates a full backup of all financial data.
    ///
    /// - Parameter includeICloud: If `true` and iCloud is available, also
    ///   writes the backup to the iCloud Documents container.
    /// - Returns: The manifest describing the created backup.
    /// - Throws: ``BackupError`` if serialisation or file writing fails.
    func createBackup(includeICloud: Bool = true) async throws -> BackupManifest {
        Self.logger.info("Starting backup creation")

        // 1. Fetch all data from local repositories
        let accounts = try await fetchAccounts()
        let transactions = try await fetchTransactions()
        let budgets = try await fetchBudgets()
        let goals = try await fetchGoals()
        let categories = try await fetchCategories()

        // 2. Build the payload
        let payload = BackupPayload(
            manifest: .create(
                accounts: accounts.count,
                transactions: transactions.count,
                budgets: budgets.count,
                goals: goals.count,
                categories: categories.count,
                payloadSize: 0 // Updated after encoding
            ),
            accounts: accounts,
            transactions: transactions,
            budgets: budgets,
            goals: goals,
            categories: categories
        )

        // 3. Encode to JSON
        let data = try encodePayload(payload)

        // Update manifest with actual size
        let manifest = BackupManifest.create(
            accounts: accounts.count,
            transactions: transactions.count,
            budgets: budgets.count,
            goals: goals.count,
            categories: categories.count,
            payloadSize: Int64(data.count)
        )

        let finalPayload = BackupPayload(
            manifest: manifest,
            accounts: accounts,
            transactions: transactions,
            budgets: budgets,
            goals: goals,
            categories: categories
        )

        let finalData = try encodePayload(finalPayload)

        // 4. Write to local documents directory
        try writeToLocalStorage(finalData)

        // 5. Optionally write to iCloud
        if includeICloud {
            writeToICloud(finalData)
        }

        Self.logger.info(
            "Backup created: \(manifest.totalItemCount) items, \(finalData.count) bytes"
        )

        // 6. Record last backup date
        UserDefaults.standard.set(
            Date().timeIntervalSince1970,
            forKey: BackupUserDefaultsKey.lastBackupDate
        )

        return manifest
    }

    // MARK: - Restore

    /// Restores financial data from a backup file.
    ///
    /// Attempts to read from local storage first, falling back to iCloud
    /// if available. This follows the offline-first principle.
    ///
    /// - Returns: The manifest of the restored backup.
    /// - Throws: ``BackupError`` if reading, parsing, or restoring fails.
    func restoreFromBackup() async throws -> BackupManifest {
        Self.logger.info("Starting backup restore")

        // 1. Try to read from local storage first (offline-first)
        var data: Data?
        data = readFromLocalStorage()

        // 2. Fall back to iCloud if local not found
        if data == nil {
            data = readFromICloud()
        }

        guard let backupData = data else {
            throw BackupError.noBackupFound
        }

        // 3. Decode the payload
        let payload = try decodePayload(backupData)

        // 4. Verify version compatibility
        guard payload.manifest.isCompatible else {
            throw BackupError.incompatibleVersion(
                found: payload.manifest.version,
                expected: BackupManifest.currentVersion
            )
        }

        // 5. Restore data through repositories
        try await restoreAccounts(payload.accounts)
        try await restoreTransactions(payload.transactions)
        try await restoreBudgets(payload.budgets)
        try await restoreGoals(payload.goals)
        try await restoreCategories(payload.categories)

        Self.logger.info(
            "Restore complete: \(payload.manifest.totalItemCount) items"
        )

        // 6. Record last restore date
        UserDefaults.standard.set(
            Date().timeIntervalSince1970,
            forKey: BackupUserDefaultsKey.lastRestoreDate
        )

        return payload.manifest
    }

    /// Returns the manifest of the most recent backup, if any.
    func getLastBackupManifest() -> BackupManifest? {
        guard let data = readFromLocalStorage() else { return nil }
        guard let payload = try? decodePayload(data) else { return nil }
        return payload.manifest
    }

    // MARK: - Data Fetching

    private func fetchAccounts() async throws -> [BackupAccount] {
        let accounts = try await accountRepository.getAllAccounts()
        return accounts.map { account in
            BackupAccount(
                id: account.id,
                name: account.name,
                balanceMinorUnits: account.balanceMinorUnits,
                currencyCode: account.currencyCode,
                type: account.type.rawValue,
                icon: account.icon,
                isArchived: account.isArchived
            )
        }
    }

    private func fetchTransactions() async throws -> [BackupTransaction] {
        let transactions = try await transactionRepository.getTransactions()
        return transactions.map { tx in
            BackupTransaction(
                id: tx.id,
                payee: tx.payee,
                category: tx.category,
                accountName: tx.accountName,
                amountMinorUnits: tx.amountMinorUnits,
                currencyCode: tx.currencyCode,
                date: tx.date,
                type: tx.type.rawValue,
                status: tx.status.rawValue,
                notes: tx.notes,
                isRecurring: tx.isRecurring
            )
        }
    }

    private func fetchBudgets() async throws -> [BackupBudget] {
        let budgets = try await budgetRepository.getBudgets()
        return budgets.map { budget in
            BackupBudget(
                id: budget.id,
                name: budget.name,
                categoryName: budget.categoryName,
                spentMinorUnits: budget.spentMinorUnits,
                limitMinorUnits: budget.limitMinorUnits,
                currencyCode: budget.currencyCode,
                period: budget.period,
                icon: budget.icon
            )
        }
    }

    private func fetchGoals() async throws -> [BackupGoal] {
        let goals = try await goalRepository.getGoals()
        return goals.map { goal in
            BackupGoal(
                id: goal.id,
                name: goal.name,
                currentMinorUnits: goal.currentMinorUnits,
                targetMinorUnits: goal.targetMinorUnits,
                currencyCode: goal.currencyCode,
                targetDate: goal.targetDate,
                notes: goal.notes,
                status: goal.status.rawValue,
                icon: goal.icon
            )
        }
    }

    private func fetchCategories() async throws -> [BackupCategory] {
        let categories = try await categoryRepository.getCategories()
        return categories.map { category in
            BackupCategory(
                id: category.id,
                name: category.name,
                colorHex: category.colorHex,
                icon: category.icon,
                sortOrder: category.sortOrder
            )
        }
    }

    // MARK: - Restore Operations

    private func restoreAccounts(_ accounts: [BackupAccount]) async throws {
        // Clear existing data before restore to avoid duplicates
        try await accountRepository.deleteAllAccounts()

        for account in accounts {
            let item = AccountItem(
                id: account.id,
                name: account.name,
                balanceMinorUnits: account.balanceMinorUnits,
                currencyCode: account.currencyCode,
                type: AccountTypeUI(rawValue: account.type) ?? .other,
                icon: account.icon,
                isArchived: account.isArchived
            )
            try await accountRepository.updateAccount(item)
        }
    }

    private func restoreTransactions(_ transactions: [BackupTransaction]) async throws {
        try await transactionRepository.deleteAllTransactions()

        for tx in transactions {
            let item = TransactionItem(
                id: tx.id,
                payee: tx.payee,
                category: tx.category,
                accountName: tx.accountName,
                amountMinorUnits: tx.amountMinorUnits,
                currencyCode: tx.currencyCode,
                date: tx.date,
                type: TransactionTypeUI(rawValue: tx.type) ?? .expense,
                status: TransactionStatusUI(rawValue: tx.status) ?? .cleared,
                notes: tx.notes,
                isRecurring: tx.isRecurring
            )
            try await transactionRepository.createTransaction(item)
        }
    }

    private func restoreBudgets(_ budgets: [BackupBudget]) async throws {
        try await budgetRepository.deleteAllBudgets()

        for budget in budgets {
            let item = BudgetItem(
                id: budget.id,
                name: budget.name,
                categoryName: budget.categoryName,
                spentMinorUnits: budget.spentMinorUnits,
                limitMinorUnits: budget.limitMinorUnits,
                currencyCode: budget.currencyCode,
                period: budget.period,
                icon: budget.icon
            )
            try await budgetRepository.createBudget(item)
        }
    }

    private func restoreGoals(_ goals: [BackupGoal]) async throws {
        try await goalRepository.deleteAllGoals()

        for goal in goals {
            let item = GoalItem(
                id: goal.id,
                name: goal.name,
                currentMinorUnits: goal.currentMinorUnits,
                targetMinorUnits: goal.targetMinorUnits,
                currencyCode: goal.currencyCode,
                targetDate: goal.targetDate,
                notes: goal.notes,
                status: GoalStatusUI(rawValue: goal.status) ?? .active,
                icon: goal.icon,
                color: .blue
            )
            try await goalRepository.createGoal(item)
        }
    }

    private func restoreCategories(_ categories: [BackupCategory]) async throws {
        for category in categories {
            let item = CategoryItem(
                id: category.id,
                name: category.name,
                colorHex: category.colorHex,
                icon: category.icon,
                sortOrder: category.sortOrder
            )
            try await categoryRepository.createCategory(item)
        }
    }

    // MARK: - Encoding / Decoding

    private func encodePayload(_ payload: BackupPayload) throws -> Data {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

        do {
            return try encoder.encode(payload)
        } catch {
            throw BackupError.serializationFailed(
                underlying: error.localizedDescription
            )
        }
    }

    func decodePayload(_ data: Data) throws -> BackupPayload {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        do {
            return try decoder.decode(BackupPayload.self, from: data)
        } catch {
            throw BackupError.deserializationFailed(
                underlying: error.localizedDescription
            )
        }
    }

    // MARK: - File I/O

    /// Writes backup data to the app's local documents directory.
    private func writeToLocalStorage(_ data: Data) throws {
        let url = try localBackupURL()

        let directoryURL = url.deletingLastPathComponent()
        try FileManager.default.createDirectory(
            at: directoryURL,
            withIntermediateDirectories: true
        )

        do {
            try data.write(to: url, options: [.atomic, .completeFileProtection])
        } catch {
            throw BackupError.fileWriteFailed(
                underlying: error.localizedDescription
            )
        }

        Self.logger.info(
            "Backup written to local storage: \(data.count) bytes"
        )
    }

    /// Reads backup data from the app's local documents directory.
    func readFromLocalStorage() -> Data? {
        guard let url = try? localBackupURL() else { return nil }
        return try? Data(contentsOf: url)
    }

    /// Writes backup data to the iCloud Documents container.
    private func writeToICloud(_ data: Data) {
        guard let iCloudURL = iCloudBackupURL() else {
            Self.logger.info("iCloud not available — skipping cloud backup")
            return
        }

        let directoryURL = iCloudURL.deletingLastPathComponent()
        try? FileManager.default.createDirectory(
            at: directoryURL,
            withIntermediateDirectories: true
        )

        do {
            try data.write(to: iCloudURL, options: .atomic)
            Self.logger.info(
                "Backup written to iCloud: \(data.count) bytes"
            )
        } catch {
            Self.logger.error(
                "Failed to write iCloud backup: \(error.localizedDescription, privacy: .public)"
            )
        }
    }

    /// Reads backup data from the iCloud Documents container.
    func readFromICloud() -> Data? {
        guard let url = iCloudBackupURL() else { return nil }
        return try? Data(contentsOf: url)
    }

    // MARK: - URL Helpers

    /// Returns the URL for the local backup file.
    func localBackupURL() throws -> URL {
        let documents = try FileManager.default.url(
            for: .documentDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        return documents
            .appendingPathComponent(Self.backupDirectoryName)
            .appendingPathComponent(Self.backupFileName)
    }

    /// Returns the URL for the iCloud backup file, or nil if iCloud is unavailable.
    private func iCloudBackupURL() -> URL? {
        guard let container = FileManager.default.url(
            forUbiquityContainerIdentifier: nil
        ) else {
            return nil
        }
        return container
            .appendingPathComponent("Documents")
            .appendingPathComponent(Self.backupDirectoryName)
            .appendingPathComponent(Self.backupFileName)
    }
}

// MARK: - UserDefaults Keys

enum BackupUserDefaultsKey {
    static let lastBackupDate = "backup.lastBackupDate"
    static let lastRestoreDate = "backup.lastRestoreDate"
    static let autoBackupEnabled = "backup.autoBackupEnabled"
}
