// SPDX-License-Identifier: BUSL-1.1

// SiriShortcutTests.swift
// FinanceTests
//
// Tests for Siri Shortcuts: RecentTransactionsIntent,
// GoalProgressIntent, and SpendingSummaryIntent.
// Uses stub repositories for deterministic testing.
// Refs #294

import XCTest
@testable import FinanceApp

final class SiriShortcutTests: XCTestCase {

    // MARK: - RecentTransactionsIntent

    @MainActor
    func testRecentTransactionsFormatsSummary() {
        let transactions = [SampleData.expenseTransaction, SampleData.incomeTransaction]
        let summary = RecentTransactionsIntent.formatTransactionSummary(transactions)

        XCTAssertTrue(
            summary.contains("2 most recent"),
            "Should mention the count of transactions"
        )
        XCTAssertTrue(
            summary.contains("Whole Foods"),
            "Should include the payee name"
        )
        XCTAssertTrue(
            summary.contains("Groceries"),
            "Should include the category"
        )
    }

    @MainActor
    func testRecentTransactionsSingleTransaction() {
        let transactions = [SampleData.expenseTransaction]
        let summary = RecentTransactionsIntent.formatTransactionSummary(transactions)

        XCTAssertTrue(
            summary.contains("most recent transaction"),
            "Should use singular form for single transaction"
        )
    }

    @MainActor
    func testRecentTransactionsStubReturnsLimitedResults() async throws {
        let stub = StubTransactionRepository()
        stub.transactionsToReturn = SampleData.allTransactions

        let recent = try await stub.getRecentTransactions(limit: 3)
        XCTAssertEqual(recent.count, 3,
                       "Should return at most the requested limit")
    }

    @MainActor
    func testRecentTransactionsEmptyRepository() async throws {
        let stub = StubTransactionRepository()
        stub.transactionsToReturn = []

        let recent = try await stub.getRecentTransactions(limit: 5)
        XCTAssertTrue(recent.isEmpty,
                      "Should return empty array when no transactions exist")
    }

    // MARK: - GoalProgressIntent

    @MainActor
    func testGoalDetailForActiveGoal() {
        let goal = SampleData.activeGoal
        let detail = GoalProgressIntent.goalDetail(goal)

        XCTAssertTrue(
            detail.contains("75%"),
            "Should include the progress percentage"
        )
        XCTAssertTrue(
            detail.contains("Emergency Fund"),
            "Should include the goal name"
        )
        XCTAssertFalse(
            detail.contains("Congratulations"),
            "Should not show completion message for active goal"
        )
    }

    @MainActor
    func testGoalDetailForCompletedGoal() {
        let goal = SampleData.completedGoal
        let detail = GoalProgressIntent.goalDetail(goal)

        XCTAssertTrue(
            detail.contains("complete"),
            "Should indicate the goal is complete"
        )
        XCTAssertTrue(
            detail.contains("New Laptop"),
            "Should include the goal name"
        )
    }

    @MainActor
    func testGoalOverviewWithMixedGoals() {
        let goals = SampleData.allGoals
        let overview = GoalProgressIntent.goalOverview(goals)

        XCTAssertTrue(
            overview.contains("completed"),
            "Should mention completed goals"
        )
        XCTAssertTrue(
            overview.contains("active"),
            "Should mention active goals"
        )
    }

    @MainActor
    func testGoalOverviewEmptyGoals() {
        let overview = GoalProgressIntent.goalOverview([])
        XCTAssertEqual(
            overview,
            String(localized: "No active goals."),
            "Should return no-goals message"
        )
    }

    @MainActor
    func testGoalLookupCaseInsensitive() async throws {
        let stub = StubGoalRepository()
        stub.goalsToReturn = SampleData.allGoals

        let goals = try await stub.getGoals()
        let match = goals.first {
            $0.name.localizedCaseInsensitiveCompare("emergency fund") == .orderedSame
        }

        XCTAssertNotNil(match,
                        "Should find goal with case-insensitive match")
        XCTAssertEqual(match?.id, "g1")
    }

    @MainActor
    func testGoalLookupNotFound() async throws {
        let stub = StubGoalRepository()
        stub.goalsToReturn = SampleData.allGoals

        let goals = try await stub.getGoals()
        let match = goals.first {
            $0.name.localizedCaseInsensitiveCompare("nonexistent") == .orderedSame
        }

        XCTAssertNil(match, "Should not find a nonexistent goal")
    }

    // MARK: - SpendingSummaryIntent

    @MainActor
    func testSpendingSummaryCategorization() {
        let expenses = [
            TransactionItem(
                id: "t1", payee: "Whole Foods", category: "Groceries",
                amountMinorUnits: -85_40, currencyCode: "USD",
                date: .now, type: .expense
            ),
            TransactionItem(
                id: "t2", payee: "Trader Joe's", category: "Groceries",
                amountMinorUnits: -45_20, currencyCode: "USD",
                date: .now, type: .expense
            ),
            TransactionItem(
                id: "t3", payee: "Netflix", category: "Entertainment",
                amountMinorUnits: -15_99, currencyCode: "USD",
                date: .now, type: .expense
            ),
        ]

        let categories = SpendingSummaryIntent.categorize(expenses)

        XCTAssertEqual(categories["Groceries"], 85_40 + 45_20,
                       "Should sum amounts in same category")
        XCTAssertEqual(categories["Entertainment"], 15_99)
        XCTAssertEqual(categories.count, 2,
                       "Should have two distinct categories")
    }

    @MainActor
    func testSpendingSummaryBuildsOutput() {
        let expenses = [
            TransactionItem(
                id: "t1", payee: "Coffee", category: "Food",
                amountMinorUnits: -5_00, currencyCode: "USD",
                date: .now, type: .expense
            ),
        ]

        let summary = SpendingSummaryIntent.buildSummary(
            expenses: expenses,
            period: .today
        )

        XCTAssertTrue(
            summary.contains("today"),
            "Should mention the time period"
        )
        XCTAssertTrue(
            summary.contains("1 transaction"),
            "Should use singular form for one transaction"
        )
    }

    @MainActor
    func testSpendingSummaryMultipleTransactions() {
        let expenses = [
            TransactionItem(
                id: "t1", payee: "Coffee", category: "Food",
                amountMinorUnits: -5_00, currencyCode: "USD",
                date: .now, type: .expense
            ),
            TransactionItem(
                id: "t2", payee: "Lunch", category: "Food",
                amountMinorUnits: -12_00, currencyCode: "USD",
                date: .now, type: .expense
            ),
        ]

        let summary = SpendingSummaryIntent.buildSummary(
            expenses: expenses,
            period: .thisWeek
        )

        XCTAssertTrue(
            summary.contains("2 transactions"),
            "Should use plural form for multiple transactions"
        )
        XCTAssertTrue(
            summary.contains("this week"),
            "Should mention the time period"
        )
    }

    @MainActor
    func testFilterTransactionsToday() {
        let today = Date.now
        let yesterday = Calendar.current.date(
            byAdding: .day, value: -1, to: today
        )!

        let transactions = [
            TransactionItem(
                id: "t1", payee: "Today", category: "Food",
                amountMinorUnits: -5_00, currencyCode: "USD",
                date: today, type: .expense
            ),
            TransactionItem(
                id: "t2", payee: "Yesterday", category: "Food",
                amountMinorUnits: -10_00, currencyCode: "USD",
                date: yesterday, type: .expense
            ),
        ]

        let filtered = SpendingSummaryIntent.filterTransactions(
            transactions, for: .today
        )

        XCTAssertEqual(filtered.count, 1)
        XCTAssertEqual(filtered.first?.id, "t1")
    }

    @MainActor
    func testFilterTransactionsThisMonth() {
        let today = Date.now
        let lastMonth = Calendar.current.date(
            byAdding: .month, value: -1, to: today
        )!

        let transactions = [
            TransactionItem(
                id: "t1", payee: "This Month", category: "Food",
                amountMinorUnits: -5_00, currencyCode: "USD",
                date: today, type: .expense
            ),
            TransactionItem(
                id: "t2", payee: "Last Month", category: "Food",
                amountMinorUnits: -10_00, currencyCode: "USD",
                date: lastMonth, type: .expense
            ),
        ]

        let filtered = SpendingSummaryIntent.filterTransactions(
            transactions, for: .thisMonth
        )

        XCTAssertEqual(filtered.count, 1)
        XCTAssertEqual(filtered.first?.id, "t1")
    }

    @MainActor
    func testEmptyCategorization() {
        let categories = SpendingSummaryIntent.categorize([])
        XCTAssertTrue(categories.isEmpty,
                      "Empty expenses should produce empty categories")
    }

    // MARK: - SpendingPeriodAppEnum

    @MainActor
    func testSpendingPeriodDisplayNames() {
        XCTAssertEqual(
            SpendingPeriodAppEnum.today.displayName,
            String(localized: "today")
        )
        XCTAssertEqual(
            SpendingPeriodAppEnum.thisWeek.displayName,
            String(localized: "this week")
        )
        XCTAssertEqual(
            SpendingPeriodAppEnum.thisMonth.displayName,
            String(localized: "this month")
        )
    }
}
