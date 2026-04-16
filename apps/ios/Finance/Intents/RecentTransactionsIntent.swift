// SPDX-License-Identifier: BUSL-1.1

// RecentTransactionsIntent.swift
// Finance
//
// App Intent for viewing recent transactions via Siri Shortcuts.
// Returns a spoken summary of the most recent transactions including
// payee, amount, and category information.
// Refs #294

import AppIntents
import Foundation
import os

/// Shows recent transactions via Siri.
///
/// Available as a Siri Shortcut with the phrase *"Recent transactions in Finance"*.
/// Returns the most recent transactions (up to 5) as a spoken summary.
struct RecentTransactionsIntent: AppIntent {

    static let title: LocalizedStringResource = "Recent Transactions"

    static let description: IntentDescription = IntentDescription(
        "View your most recent transactions.",
        categoryName: "Transactions"
    )

    // MARK: - Parameters

    @Parameter(
        title: "Count",
        description: "Number of recent transactions to show (1–5).",
        default: 3,
        inclusiveRange: (1, 5)
    )
    var count: Int

    // MARK: - Logging

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.finance",
        category: "RecentTransactionsIntent"
    )

    // MARK: - Perform

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let repository = RepositoryProvider.shared.transactions

        let transactions: [TransactionItem]
        do {
            transactions = try await repository.getRecentTransactions(limit: count)
        } catch {
            Self.logger.error(
                "Failed to fetch transactions: \(error.localizedDescription, privacy: .public)"
            )
            throw IntentError.saveFailed
        }

        guard !transactions.isEmpty else {
            return .result(
                dialog: IntentDialog(stringLiteral: String(
                    localized: "You don't have any transactions yet."
                ))
            )
        }

        let summary = Self.formatTransactionSummary(transactions)

        Self.logger.info(
            "Returned \(transactions.count) recent transaction(s)"
        )

        return .result(
            dialog: IntentDialog(stringLiteral: summary)
        )
    }

    // MARK: - Formatting

    /// Builds a spoken summary of recent transactions.
    static func formatTransactionSummary(
        _ transactions: [TransactionItem]
    ) -> String {
        let count = transactions.count
        let header = count == 1
            ? String(localized: "Here's your most recent transaction:")
            : String(localized: "Here are your \(count) most recent transactions:")

        let items = transactions.enumerated().map { index, tx in
            let amount = formatCurrency(
                minorUnits: tx.amountMinorUnits,
                currencyCode: tx.currencyCode
            )
            let relative = tx.date.formatted(.relative(presentation: .named))
            return String(
                localized: "\(index + 1). \(tx.payee) — \(amount) in \(tx.category), \(relative)"
            )
        }

        return ([header] + items).joined(separator: " ")
    }

    private static func formatCurrency(
        minorUnits: Int64,
        currencyCode: String
    ) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currencyCode
        let majorUnits = NSDecimalNumber(value: abs(minorUnits))
            .dividing(by: NSDecimalNumber(decimal: 100))
        let formatted = formatter.string(from: majorUnits)
            ?? "\(currencyCode) \(abs(minorUnits))"
        return minorUnits < 0 ? "-\(formatted)" : formatted
    }
}
