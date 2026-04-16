// SPDX-License-Identifier: BUSL-1.1

// BackupViewModel.swift
// Finance
//
// ViewModel for the backup and restore settings screen.
// Manages backup creation, restore operations, and status display.
// Uses @Observable (Observation framework) per iOS 17+ convention.
// Refs #302

import Foundation
import os

/// ViewModel managing backup and restore operations for the settings screen.
///
/// Provides reactive status updates for UI binding and delegates all
/// data operations to ``LocalBackupService``.
@Observable @MainActor
final class BackupViewModel {

    // MARK: - State

    /// Current status of backup/restore operations.
    var status: BackupStatus = .idle

    /// The manifest of the last successful backup, if available.
    var lastBackupManifest: BackupManifest?

    /// Date of the last successful backup.
    var lastBackupDate: Date? {
        let timestamp = UserDefaults.standard.double(
            forKey: BackupUserDefaultsKey.lastBackupDate
        )
        return timestamp > 0 ? Date(timeIntervalSince1970: timestamp) : nil
    }

    /// Whether automatic backups are enabled.
    var isAutoBackupEnabled: Bool {
        get {
            UserDefaults.standard.bool(
                forKey: BackupUserDefaultsKey.autoBackupEnabled
            )
        }
        set {
            UserDefaults.standard.set(
                newValue,
                forKey: BackupUserDefaultsKey.autoBackupEnabled
            )
        }
    }

    /// Whether a backup or restore operation is currently in progress.
    var isOperationInProgress: Bool {
        if case .inProgress = status { return true }
        return false
    }

    /// Whether iCloud is available for cloud backup.
    var isICloudAvailable: Bool {
        FileManager.default.ubiquityIdentityToken != nil
    }

    // MARK: - Dependencies

    private let backupService: LocalBackupService

    // MARK: - Logging

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.finance",
        category: "BackupViewModel"
    )

    // MARK: - Initialisation

    init(
        backupService: LocalBackupService = LocalBackupService()
    ) {
        self.backupService = backupService
    }

    // MARK: - Actions

    /// Creates a new backup of all financial data.
    func createBackup() async {
        status = .inProgress(
            phase: String(localized: "Preparing backup…")
        )

        do {
            status = .inProgress(
                phase: String(localized: "Exporting data…")
            )

            let manifest = try await backupService.createBackup(
                includeICloud: isICloudAvailable
            )

            lastBackupManifest = manifest
            status = .completed(manifest: manifest)

            Self.logger.info(
                "Backup completed: \(manifest.totalItemCount) items"
            )
        } catch {
            let message = error.localizedDescription
            status = .failed(message: message)

            Self.logger.error(
                "Backup failed: \(message, privacy: .public)"
            )
        }
    }

    /// Restores financial data from the most recent backup.
    func restoreFromBackup() async {
        status = .inProgress(
            phase: String(localized: "Reading backup…")
        )

        do {
            status = .inProgress(
                phase: String(localized: "Restoring data…")
            )

            let manifest = try await backupService.restoreFromBackup()

            lastBackupManifest = manifest
            status = .completed(manifest: manifest)

            Self.logger.info(
                "Restore completed: \(manifest.totalItemCount) items"
            )
        } catch {
            let message = error.localizedDescription
            status = .failed(message: message)

            Self.logger.error(
                "Restore failed: \(message, privacy: .public)"
            )
        }
    }

    /// Loads the manifest from the most recent backup for display.
    func loadLastBackupInfo() async {
        lastBackupManifest = await backupService.getLastBackupManifest()
    }
}
