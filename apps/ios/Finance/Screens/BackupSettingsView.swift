// SPDX-License-Identifier: BUSL-1.1

// BackupSettingsView.swift
// Finance
//
// SwiftUI settings screen for backup and restore operations.
// Shows backup status, last backup info, and provides backup/restore actions.
// Refs #302

import SwiftUI

/// Settings screen for managing data backup and restore.
///
/// Follows Apple HIG by using `Form` with sections for different
/// backup-related actions and status information.
struct BackupSettingsView: View {

    // MARK: - State

    @State private var viewModel = BackupViewModel()
    @State private var showRestoreConfirmation = false

    // MARK: - Body

    var body: some View {
        Form {
            statusSection
            lastBackupSection
            actionsSection
            iCloudSection
        }
        .navigationTitle(String(localized: "Backup & Restore"))
        .task {
            await viewModel.loadLastBackupInfo()
        }
        .confirmationDialog(
            String(localized: "Restore from Backup"),
            isPresented: $showRestoreConfirmation,
            titleVisibility: .visible
        ) {
            Button(
                String(localized: "Restore"),
                role: .destructive
            ) {
                Task { await viewModel.restoreFromBackup() }
            }
            Button(
                String(localized: "Cancel"),
                role: .cancel
            ) {}
        } message: {
            Text(String(localized: "This will replace all current data with the backup. This action cannot be undone."))
        }
    }

    // MARK: - Status Section

    @ViewBuilder
    private var statusSection: some View {
        switch viewModel.status {
        case .idle:
            EmptyView()

        case .inProgress(let phase):
            Section {
                HStack(spacing: 12) {
                    ProgressView()
                        .accessibilityLabel(String(localized: "Operation in progress"))

                    Text(phase)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
            }

        case .completed(let manifest):
            Section {
                Label {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(String(localized: "Backup Complete"))
                            .font(.body)
                            .fontWeight(.medium)

                        Text(String(localized: "\(manifest.totalItemCount) items backed up"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                } icon: {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                        .accessibilityHidden(true)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel(String(localized: "Backup complete, \(manifest.totalItemCount) items"))
            }

        case .failed(let message):
            Section {
                Label {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(String(localized: "Operation Failed"))
                            .font(.body)
                            .fontWeight(.medium)

                        Text(message)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                } icon: {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                        .accessibilityHidden(true)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel(String(localized: "Operation failed: \(message)"))
            }
        }
    }

    // MARK: - Last Backup Section

    private var lastBackupSection: some View {
        Section {
            if let manifest = viewModel.lastBackupManifest {
                LabeledContent(
                    String(localized: "Last Backup"),
                    value: manifest.createdAt.formatted(
                        date: .abbreviated, time: .shortened
                    )
                )
                .accessibilityLabel(String(localized: "Last backup: \(manifest.createdAt.formatted(date: .abbreviated, time: .shortened))"))

                LabeledContent(
                    String(localized: "Items"),
                    value: "\(manifest.totalItemCount)"
                )
                .accessibilityLabel(String(localized: "\(manifest.totalItemCount) items in last backup"))

                LabeledContent(
                    String(localized: "Device"),
                    value: manifest.deviceName
                )
                .accessibilityLabel(String(localized: "Backed up from \(manifest.deviceName)"))

                LabeledContent(
                    String(localized: "Size"),
                    value: formattedSize(manifest.payloadSizeBytes)
                )
                .accessibilityLabel(String(localized: "Backup size: \(formattedSize(manifest.payloadSizeBytes))"))
            } else {
                Text(String(localized: "No backup found"))
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .accessibilityLabel(String(localized: "No backup has been created yet"))
            }
        } header: {
            Text(String(localized: "Backup Info"))
        }
    }

    // MARK: - Actions Section

    private var actionsSection: some View {
        Section {
            Button {
                Task { await viewModel.createBackup() }
            } label: {
                Label(
                    String(localized: "Create Backup"),
                    systemImage: "arrow.up.doc"
                )
            }
            .disabled(viewModel.isOperationInProgress)
            .accessibilityLabel(String(localized: "Create backup"))
            .accessibilityHint(String(localized: "Exports all financial data to a backup file"))

            Button {
                showRestoreConfirmation = true
            } label: {
                Label(
                    String(localized: "Restore from Backup"),
                    systemImage: "arrow.down.doc"
                )
            }
            .disabled(
                viewModel.isOperationInProgress
                    || viewModel.lastBackupManifest == nil
            )
            .accessibilityLabel(String(localized: "Restore from backup"))
            .accessibilityHint(String(localized: "Replaces current data with backup data"))
        } header: {
            Text(String(localized: "Actions"))
        }
    }

    // MARK: - iCloud Section

    private var iCloudSection: some View {
        Section {
            HStack {
                Label {
                    Text(String(localized: "iCloud Backup"))
                        .font(.body)
                } icon: {
                    Image(systemName: viewModel.isICloudAvailable
                          ? "icloud.fill" : "icloud.slash")
                    .foregroundStyle(
                        viewModel.isICloudAvailable ? .blue : .secondary
                    )
                    .accessibilityHidden(true)
                }

                Spacer()

                Text(viewModel.isICloudAvailable
                     ? String(localized: "Available")
                     : String(localized: "Unavailable"))
                .font(.body)
                .foregroundStyle(.secondary)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel(
                viewModel.isICloudAvailable
                    ? String(localized: "iCloud backup is available")
                    : String(localized: "iCloud backup is unavailable")
            )

            Toggle(
                String(localized: "Auto-Backup on Close"),
                isOn: Binding(
                    get: { viewModel.isAutoBackupEnabled },
                    set: { viewModel.isAutoBackupEnabled = $0 }
                )
            )
            .accessibilityLabel(String(localized: "Auto-backup on close"))
            .accessibilityHint(String(localized: "Automatically creates a backup when the app closes"))
        } header: {
            Text(String(localized: "iCloud"))
        } footer: {
            Text(String(localized: "Backups include accounts, transactions, budgets, goals, and categories. Authentication tokens and encryption keys are never included."))
                .font(.caption)
        }
    }

    // MARK: - Helpers

    private func formattedSize(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }
}
