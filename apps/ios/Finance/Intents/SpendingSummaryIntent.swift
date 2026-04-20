// SPDX-License-Identifier: BUSL-1.1

// SpendingSummaryIntent.swift
// Finance
//
// App Intent for viewing a spending summary via Siri Shortcuts.
// Returns total spending for the current period with category breakdown.
// Refs #294

import AppIntents
import Foundation
import os

// MARK: - Time Period Enum

/// Time periods for the spending summary.
enum SpendingPeriodAppEnum: String, AppEnum {
    case today
    case thisWeek
    case thisMonth

    static let typeDisplayRepresentation = TypeDisplayRepresentation(
        name: LocalizedStringResource("Period")
    )

    static let caseDisplayRepresentations: [SpendingPeriodAppEnum: DisplayRepresentation] = [
        .today: DisplayRepresentation(
            title: LocalizedStringResource("Today"),
            image: .init(systemName: "calendar.day.timeline.left")
        ),
        .thisWeek: DisplayRepresentation(
            title: LocalizedStringResource("This Week"),
            image: .init(systemName: "calendar")
        ),
        .thisMonth: DisplayRepresentation(
            title: LocalizedStringResource("This Month"),
            image: .init(systemName: "calendar.badge.clock")
        ),
    ]

    var displayName: String {
        switch self {
        case .today: String(localized: "today")
        case .thisWeek: String(localized: "this week")
        case .thisMonth: String(localized: "this month")
        }
    }
}

// MARK: - Spending Summary Intent

/// Shows a spending summary via Siri.
///
/// Available as a Siri Shortcut with the phrase *"Spending summary in Finance"*.
/// Returns total spending for the selected period with a breakdown by the
/// top spending categories.
struct SpendingSummaryIntent: AppIntent {

    static let title: LocalizedStringResource = "Spending Summary"

    static let description: IntentDescription = IntentDescription(
        "See how much you've spent in a given period.",
        categoryName: "Transactions"
    )

    // MARK: - Parameters

    @Parameter(
        title: "Period",
        description: "Time period to summarise.",
        default: .thisMonth
    )
    var period: SpendingPeriodAppEnum

    // MARK: - Logging

    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "com.finance",
        category: "SpendingSummaryIntent"
    )

    // MARK: - Perform

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let repository = RepositoryProvider.shared.transactions

        let allTransactions: [TransactionItem]
        do {
            allTransactions = try await repository.getTransactions()
        } catch {
            Self.logger.error(
                "Failed to fetch transactions: \(error.localizedDescription, privacy: .public)"
            )
            throw IntentError.saveFailed
        }

        let filtered = Self.filterTransactions(
            allTransactions,
            for: period
        )

        let expenses = filtered.filter { $0.type == .expense }

        guard !expenses.isEmpty else {
            return .result(
                dialog: IntentDialog(stringLiteral: String(
                    localized: "You haven't spent anything \(period.displayName)."
                ))
            )
        }

        let summary = Self.buildSummary(
            expenses: expenses,
            period: period
        )

        Self.logger.info(
            "Spending summary: \(expenses.count) expenses for \(period.rawValue)"
        )

        return .result(
            dialog: IntentDialog(stringLiteral: summary)
        )
    }

    // MARK: - Filtering

    /// Filters transactions to the specified time period.
    static func filterTransactions(
        _ transactions: [TransactionItem],
        for period: SpendingPeriodAppEnum
    ) -> [TransactionItem] {
        let calendar = Calendar.current
        let now = Date.now

        switch period {
        case .today:
            return transactions.filter { calendar.isDateInToday($0.date) }

        case .thisWeek:
            guard let weekStart = calendar.dateInterval(of: .weekOfYear, for: now)?.start else {
                return []
            }
            return transactions.filter { $0.date >= weekStart && $0.date <= now }

        case .thisMonth:
            guard let monthStart = calendar.dateInterval(of: .month, for: now)?.start else {
                return []
            }
            return transactions.filter { $0.date >= monthStart && $0.date <= now }
        }
    }

    /// Builds a spoken spending summary with top categories.
    static func buildSummary(
        expenses: [TransactionItem],
        period: SpendingPeriodAppEnum
    ) -> String {
        let totalMinorUnits = expenses.reduce(Int64(0)) {
            $0 + abs($1.amountMinorUnits)
        }
        let currencyCode = expenses.first?.currencyCode ?? "USD"
        let totalFormatted = formatCurrency(
            minorUnits: totalMinorUnits,
            currencyCode: currencyCode
        )

        let count = expenses.count
        let transactionWord = count == 1
            ? String(localized: "transaction")
            : String(localized: "transactions")

        var result = String(
            localized: "You've spent \(totalFormatted) \(period.displayName) across \(count) \(transactionWord)."
        )

        // Top categories breakdown
        let categoryTotals = Self.categorize(expenses)
        let topCategories = Array(
            categoryTotals.sorted { $0.value > $1.value }.prefix(3)
        )

        if !topCategories.isEmpty {
            let categoryParts = topCategories.map { category, amount in
                let formatted = formatCurrency(
                    minorUnits: amount,
                    currencyCode: currencyCode
                )
                return String(localized: "\(category): \(formatted)")
            }
            let categoryList = categoryParts.formatted(.list(type: .and))
            result += " " + String(
                localized: "Top categories: \(categoryList)."
            )
        }

        return result
    }

    /// Groups expenses by category and sums amounts.
    static func categorize(
        _ expenses: [TransactionItem]
    ) -> [String: Int64] {
        var totals: [String: Int64] = [:]
        for expense in expenses {
            totals[expense.category, default: 0] += abs(expense.amountMinorUnits)
        }
        return totals
    }

    private static func formatCurrency(
        minorUnits: Int64,
        currencyCode: String
    ) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currencyCode
        let majorUnits = NSDecimalNumber(value: minorUnits)
            .dividing(by: NSDecimalNumber(decimal: 100))
        return formatter.string(from: majorUnits)
            ?? "\(currencyCode) \(minorUnits)"
    }
}
