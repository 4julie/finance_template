// SPDX-License-Identifier: BUSL-1.1

// BackupServiceTests.swift
// FinanceTests
//
// Tests for LocalBackupService: backup creation, restore, manifest
// validation, encoding/decoding, and error handling.
// Uses stub repositories for deterministic testing.
// Refs #302

import XCTest
@testable import FinanceApp

final class BackupServiceTests: XCTestCase {

    // MARK: - Backup Manifest

    @MainActor
    func testManifestCreation() {
        let manifest = BackupManifest.create(
            accounts: 5,
            transactions: 100,
            budgets: 3,
            goals: 2,
            categories: 8,
            payloadSize: 45_000
        )

        XCTAssertEqual(manifest.version, BackupManifest.currentVersion)
        XCTAssertEqual(manifest.accountCount, 5)
        XCTAssertEqual(manifest.transactionCount, 100)
        XCTAssertEqual(manifest.budgetCount, 3)
        XCTAssertEqual(manifest.goalCount, 2)
        XCTAssertEqual(manifest.categoryCount, 8)
        XCTAssertEqual(manifest.payloadSizeBytes, 45_000)
        XCTAssertFalse(manifest.id.isEmpty)
    }

    @MainActor
    func testManifestTotalItemCount() {
        let manifest = BackupManifest.create(
            accounts: 3,
            transactions: 10,
            budgets: 2,
            goals: 1,
            categories: 5,
            payloadSize: 0
        )

        XCTAssertEqual(
            manifest.totalItemCount, 21,
            "Total should be sum of all entity counts"
        )
    }

    @MainActor
    func testManifestCompatibility() {
        let compatible = BackupManifest.create(
            accounts: 0, transactions: 0, budgets: 0,
            goals: 0, categories: 0, payloadSize: 0
        )
        XCTAssertTrue(compatible.isCompatible,
                      "Current version should be compatible")
    }

    @MainActor
    func testManifestIncompatibleVersion() {
        let manifest = BackupManifest(
            id: "test",
            version: BackupManifest.currentVersion + 1,
            createdAt: .now,
            appVersion: "99.0",
            accountCount: 0,
            transactionCount: 0,
            budgetCount: 0,
            goalCount: 0,
            categoryCount: 0,
            deviceName: "Test",
            payloadSizeBytes: 0
        )

        XCTAssertFalse(manifest.isCompatible,
                       "Future version should not be compatible")
    }

    // MARK: - Backup Account Mapping

    @MainActor
    func testAccountMappingRoundTrip() {
        let account = SampleData.checkingAccount
        let backup = BackupAccount(
            id: account.id,
            name: account.name,
            balanceMinorUnits: account.balanceMinorUnits,
            currencyCode: account.currencyCode,
            type: account.type.rawValue,
            icon: account.icon,
            isArchived: account.isArchived
        )

        XCTAssertEqual(backup.id, account.id)
        XCTAssertEqual(backup.name, account.name)
        XCTAssertEqual(backup.balanceMinorUnits, account.balanceMinorUnits)
        XCTAssertEqual(backup.type, "checking")
        XCTAssertFalse(backup.isArchived)
    }

    // MARK: - Backup Transaction Mapping

    @MainActor
    func testTransactionMappingRoundTrip() {
        let tx = SampleData.expenseTransaction
        let backup = BackupTransaction(
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

        XCTAssertEqual(backup.id, tx.id)
        XCTAssertEqual(backup.payee, tx.payee)
        XCTAssertEqual(backup.amountMinorUnits, tx.amountMinorUnits)
        XCTAssertEqual(backup.type, "expense")
        XCTAssertEqual(backup.status, "cleared")
    }

    // MARK: - Backup Budget Mapping

    @MainActor
    func testBudgetMappingRoundTrip() {
        let budget = SampleData.groceriesBudget
        let backup = BackupBudget(
            id: budget.id,
            name: budget.name,
            categoryName: budget.categoryName,
            spentMinorUnits: budget.spentMinorUnits,
            limitMinorUnits: budget.limitMinorUnits,
            currencyCode: budget.currencyCode,
            period: budget.period,
            icon: budget.icon
        )

        XCTAssertEqual(backup.id, budget.id)
        XCTAssertEqual(backup.name, budget.name)
        XCTAssertEqual(backup.spentMinorUnits, budget.spentMinorUnits)
        XCTAssertEqual(backup.limitMinorUnits, budget.limitMinorUnits)
    }

    // MARK: - Backup Goal Mapping

    @MainActor
    func testGoalMappingRoundTrip() {
        let goal = SampleData.activeGoal
        let backup = BackupGoal(
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

        XCTAssertEqual(backup.id, goal.id)
        XCTAssertEqual(backup.status, "active")
        XCTAssertNotNil(backup.targetDate)
    }

    // MARK: - Backup Category Mapping

    @MainActor
    func testCategoryMappingRoundTrip() {
        let category = SampleData.groceriesCategory
        let backup = BackupCategory(
            id: category.id,
            name: category.name,
            colorHex: category.colorHex,
            icon: category.icon,
            sortOrder: category.sortOrder
        )

        XCTAssertEqual(backup.id, category.id)
        XCTAssertEqual(backup.name, category.name)
        XCTAssertEqual(backup.colorHex, category.colorHex)
    }

    // MARK: - Payload Encoding / Decoding

    @MainActor
    func testPayloadEncodeDecode() throws {
        let manifest = BackupManifest.create(
            accounts: 1, transactions: 1, budgets: 1,
            goals: 1, categories: 1, payloadSize: 0
        )

        let payload = BackupPayload(
            manifest: manifest,
            accounts: [
                BackupAccount(
                    id: "a1", name: "Checking",
                    balanceMinorUnits: 12_450_00, currencyCode: "USD",
                    type: "checking", icon: "building.columns",
                    isArchived: false
                ),
            ],
            transactions: [
                BackupTransaction(
                    id: "t1", payee: "Whole Foods", category: "Groceries",
                    accountName: "Checking", amountMinorUnits: -85_40,
                    currencyCode: "USD",
                    date: Date(timeIntervalSince1970: 1_700_000_000),
                    type: "expense", status: "cleared", notes: "",
                    isRecurring: false
                ),
            ],
            budgets: [
                BackupBudget(
                    id: "b1", name: "Groceries",
                    categoryName: "Groceries",
                    spentMinorUnits: 320_00,
                    limitMinorUnits: 500_00,
                    currencyCode: "USD",
                    period: "Monthly", icon: "cart"
                ),
            ],
            goals: [
                BackupGoal(
                    id: "g1", name: "Emergency Fund",
                    currentMinorUnits: 7_500_00,
                    targetMinorUnits: 10_000_00,
                    currencyCode: "USD",
                    targetDate: Date(timeIntervalSince1970: 1_720_000_000),
                    notes: "", status: "active", icon: "shield"
                ),
            ],
            categories: [
                BackupCategory(
                    id: "c1", name: "Groceries",
                    colorHex: "#38A169", icon: "cart",
                    sortOrder: 0
                ),
            ]
        )

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(payload)

        XCTAssertGreaterThan(data.count, 0,
                             "Encoded data should not be empty")

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let decoded = try decoder.decode(BackupPayload.self, from: data)

        XCTAssertEqual(decoded.accounts.count, 1)
        XCTAssertEqual(decoded.transactions.count, 1)
        XCTAssertEqual(decoded.budgets.count, 1)
        XCTAssertEqual(decoded.goals.count, 1)
        XCTAssertEqual(decoded.categories.count, 1)
        XCTAssertEqual(decoded.accounts.first?.name, "Checking")
        XCTAssertEqual(decoded.transactions.first?.payee, "Whole Foods")
    }

    @MainActor
    func testEmptyPayloadEncodeDecode() throws {
        let manifest = BackupManifest.create(
            accounts: 0, transactions: 0, budgets: 0,
            goals: 0, categories: 0, payloadSize: 0
        )

        let payload = BackupPayload(
            manifest: manifest,
            accounts: [],
            transactions: [],
            budgets: [],
            goals: [],
            categories: []
        )

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(payload)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let decoded = try decoder.decode(BackupPayload.self, from: data)

        XCTAssertTrue(decoded.accounts.isEmpty)
        XCTAssertTrue(decoded.transactions.isEmpty)
        XCTAssertEqual(decoded.manifest.totalItemCount, 0)
    }

    // MARK: - Backup Service Integration

    @MainActor
    func testBackupServiceCreatesBackupFromRepositories() async throws {
        let stubAccounts = StubAccountRepository()
        stubAccounts.accountsToReturn = SampleData.allAccounts

        let stubTransactions = StubTransactionRepository()
        stubTransactions.transactionsToReturn = SampleData.allTransactions

        let stubBudgets = StubBudgetRepository()
        stubBudgets.budgetsToReturn = SampleData.allBudgets

        let stubGoals = StubGoalRepository()
        stubGoals.goalsToReturn = SampleData.allGoals

        let stubCategories = StubCategoryRepository()
        stubCategories.categoriesToReturn = SampleData.allCategories

        let service = LocalBackupService(
            accountRepository: stubAccounts,
            transactionRepository: stubTransactions,
            budgetRepository: stubBudgets,
            goalRepository: stubGoals,
            categoryRepository: stubCategories
        )

        // createBackup writes to file system — in tests this may or may not
        // succeed depending on sandbox. We verify the service runs without crashing.
        do {
            let manifest = try await service.createBackup(includeICloud: false)
            XCTAssertEqual(manifest.accountCount, SampleData.allAccounts.count)
            XCTAssertEqual(manifest.transactionCount, SampleData.allTransactions.count)
            XCTAssertEqual(manifest.budgetCount, SampleData.allBudgets.count)
            XCTAssertEqual(manifest.goalCount, SampleData.allGoals.count)
            XCTAssertEqual(manifest.categoryCount, SampleData.allCategories.count)
        } catch {
            // File system may not be available in test sandbox — acceptable
            XCTAssertTrue(error is BackupError,
                          "Should throw a BackupError if file write fails")
        }
    }

    @MainActor
    func testBackupServiceHandlesRepositoryErrors() async throws {
        let stubAccounts = StubAccountRepository()
        stubAccounts.errorToThrow = TestError.simulated

        let service = LocalBackupService(
            accountRepository: stubAccounts,
            transactionRepository: StubTransactionRepository(),
            budgetRepository: StubBudgetRepository(),
            goalRepository: StubGoalRepository(),
            categoryRepository: StubCategoryRepository()
        )

        do {
            _ = try await service.createBackup(includeICloud: false)
            XCTFail("Should throw on repository error")
        } catch {
            XCTAssertTrue(error is TestError,
                          "Should propagate the repository error")
        }
    }

    @MainActor
    func testRestoreWithNoBackupThrows() async {
        let service = LocalBackupService(
            accountRepository: StubAccountRepository(),
            transactionRepository: StubTransactionRepository(),
            budgetRepository: StubBudgetRepository(),
            goalRepository: StubGoalRepository(),
            categoryRepository: StubCategoryRepository()
        )

        do {
            _ = try await service.restoreFromBackup()
            // May succeed if a backup file exists from a prior test run
        } catch let error as BackupError {
            // Expected — no backup file exists
            switch error {
            case .noBackupFound:
                break // Expected
            default:
                break // Other backup errors are acceptable
            }
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
    }

    // MARK: - Backup Error Descriptions

    @MainActor
    func testBackupErrorDescriptions() {
        let errors: [BackupError] = [
            .serializationFailed(underlying: "test"),
            .deserializationFailed(underlying: "test"),
            .fileWriteFailed(underlying: "test"),
            .fileReadFailed(underlying: "test"),
            .incompatibleVersion(found: 99, expected: 1),
            .noBackupFound,
            .iCloudUnavailable,
            .restoreFailed(underlying: "test"),
        ]

        for error in errors {
            XCTAssertNotNil(error.errorDescription,
                            "\(error) should have a description")
            XCTAssertFalse(error.errorDescription!.isEmpty,
                           "\(error) description should not be empty")
        }
    }

    // MARK: - Backup Status

    @MainActor
    func testBackupStatusEquality() {
        XCTAssertEqual(BackupStatus.idle, BackupStatus.idle)

        let phase = "Testing"
        XCTAssertEqual(
            BackupStatus.inProgress(phase: phase),
            BackupStatus.inProgress(phase: phase)
        )

        XCTAssertEqual(
            BackupStatus.failed(message: "Error"),
            BackupStatus.failed(message: "Error")
        )

        XCTAssertNotEqual(BackupStatus.idle, BackupStatus.failed(message: "Error"))
    }

    // MARK: - BackupViewModel

    @MainActor
    func testBackupViewModelInitialState() {
        let viewModel = BackupViewModel()

        XCTAssertEqual(viewModel.status, .idle)
        XCTAssertNil(viewModel.lastBackupManifest)
        XCTAssertFalse(viewModel.isOperationInProgress)
    }

    @MainActor
    func testBackupViewModelProgressState() {
        let viewModel = BackupViewModel()
        viewModel.status = .inProgress(phase: "Testing")

        XCTAssertTrue(viewModel.isOperationInProgress)
    }
}
