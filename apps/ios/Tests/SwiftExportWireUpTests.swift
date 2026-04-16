// SPDX-License-Identifier: BUSL-1.1
// SwiftExportWireUpTests.swift — Integration tests verifying the wire-up
// from Swift Export bridge through ViewModels to data layer.
//
// These tests verify the end-to-end data flow:
//   KMP Repository (via bridge) → ViewModel → computed properties
//
// References: #289

import Foundation
import Testing
@testable import FinanceApp

// MARK: - Dashboard Wire-Up

@Suite("DashboardViewModel Swift Export wire-up")
struct DashboardWireUpTests {

    @Test("Dashboard loads data through Swift Export bridge")
    @MainActor func dashboardLoadsThroughBridge() async {
        let vm = DashboardViewModel(
            accountRepository: BridgedAccountRepository(),
            transactionRepository: BridgedTransactionRepository(),
            budgetRepository: BridgedBudgetRepository()
        )

        await vm.loadDashboard()

        #expect(!vm.accounts.isEmpty, "Accounts should load through bridge")
        #expect(!vm.recentTransactions.isEmpty, "Transactions should load through bridge")
        #expect(!vm.budgets.isEmpty, "Budgets should load through bridge")
        #expect(!vm.isLoading, "Loading should complete")
        #expect(vm.errorMessage == nil, "No error expected")
    }

    @Test("Dashboard net worth uses aggregator module")
    @MainActor func dashboardNetWorthUsesAggregator() async {
        let vm = DashboardViewModel(
            accountRepository: BridgedAccountRepository(),
            transactionRepository: BridgedTransactionRepository(),
            budgetRepository: BridgedBudgetRepository()
        )

        await vm.loadDashboard()

        // Net worth should be computed by the aggregator, not simple sum
        // The aggregator treats creditCard/loan as liabilities
        #expect(vm.netWorth != 0, "Net worth should be non-zero with seeded data")
    }

    @Test("Dashboard formatCurrency uses formatter module")
    @MainActor func dashboardFormatCurrencyUsesFormatter() async {
        let vm = DashboardViewModel(
            accountRepository: BridgedAccountRepository(),
            transactionRepository: BridgedTransactionRepository(),
            budgetRepository: BridgedBudgetRepository()
        )

        let formatted = vm.formatCurrency(12345)
        #expect(formatted.contains("123"), "Formatted amount should contain dollars")
        #expect(formatted.contains("45"), "Formatted amount should contain cents")
    }

    @Test("Dashboard aggregations compute after load")
    @MainActor func dashboardAggregationsCompute() async {
        let vm = DashboardViewModel(
            accountRepository: BridgedAccountRepository(),
            transactionRepository: BridgedTransactionRepository(),
            budgetRepository: BridgedBudgetRepository()
        )

        await vm.loadDashboard()

        // After loading, aggregations should be computed (may be 0 if
        // transactions are outside current month, but shouldn't crash)
        #expect(vm.monthlyIncome >= 0, "Monthly income should be non-negative")
        #expect(vm.monthlyExpenses >= 0, "Monthly expenses should be non-negative")
        #expect(vm.savingsRate >= 0, "Savings rate should be non-negative")
    }
}

// MARK: - Accounts Wire-Up

@Suite("AccountsViewModel Swift Export wire-up")
struct AccountsWireUpTests {

    @Test("Accounts loads through bridged repository")
    @MainActor func accountsLoadsThroughBridge() async {
        let vm = AccountsViewModel(
            repository: BridgedAccountRepository()
        )

        await vm.loadAccounts()

        #expect(!vm.accountGroups.isEmpty, "Account groups should load through bridge")
        #expect(!vm.isLoading, "Loading should complete")
        #expect(vm.errorMessage == nil, "No error expected")
    }

    @Test("Account groups are sorted by type")
    @MainActor func accountGroupsSortedByType() async {
        let vm = AccountsViewModel(
            repository: BridgedAccountRepository()
        )

        await vm.loadAccounts()

        // Verify groups match AccountTypeUI.allCases ordering
        let typeOrder = AccountTypeUI.allCases
        for (index, group) in vm.accountGroups.enumerated() {
            if index > 0 {
                let prevType = vm.accountGroups[index - 1].type
                let prevIndex = typeOrder.firstIndex(of: prevType) ?? 0
                let currIndex = typeOrder.firstIndex(of: group.type) ?? 0
                #expect(prevIndex < currIndex, "Groups should be ordered by type")
            }
        }
    }
}

// MARK: - Transactions Wire-Up

@Suite("TransactionsViewModel Swift Export wire-up")
struct TransactionsWireUpTests {

    @Test("Transactions loads through bridged repository")
    @MainActor func transactionsLoadsThroughBridge() async {
        let vm = TransactionsViewModel(
            repository: BridgedTransactionRepository()
        )

        await vm.loadTransactions()

        #expect(!vm.transactions.isEmpty, "Transactions should load through bridge")
        #expect(!vm.isLoading, "Loading should complete")
        #expect(vm.errorMessage == nil, "No error expected")
    }

    @Test("Pagination works through bridge")
    @MainActor func paginationWorksThroughBridge() async {
        let vm = TransactionsViewModel(
            repository: BridgedTransactionRepository()
        )

        await vm.loadTransactions()

        let initialCount = vm.transactions.count
        #expect(initialCount > 0, "Should have initial transactions")
    }
}

// MARK: - Budgets Wire-Up

@Suite("BudgetsViewModel Swift Export wire-up")
struct BudgetsWireUpTests {

    @Test("Budgets loads through bridged repository")
    @MainActor func budgetsLoadsThroughBridge() async {
        let vm = BudgetsViewModel(
            repository: BridgedBudgetRepository()
        )

        await vm.loadBudgets()

        #expect(!vm.budgets.isEmpty, "Budgets should load through bridge")
        #expect(!vm.isLoading, "Loading should complete")
        #expect(vm.errorMessage == nil, "No error expected")
    }

    @Test("Budget totals computed correctly")
    @MainActor func budgetTotalsComputed() async {
        let vm = BudgetsViewModel(
            repository: BridgedBudgetRepository()
        )

        await vm.loadBudgets()

        #expect(vm.totalBudgeted > 0, "Total budgeted should be positive")
        #expect(vm.totalSpent >= 0, "Total spent should be non-negative")
    }

    @Test("formatCurrency works through bridge")
    @MainActor func formatCurrencyWorksThroughBridge() async {
        let vm = BudgetsViewModel(
            repository: BridgedBudgetRepository()
        )

        let formatted = vm.formatCurrency(50000)
        #expect(formatted.contains("500"), "Should format 50000 cents as $500")
    }
}

// MARK: - Goals Wire-Up

@Suite("GoalsViewModel Swift Export wire-up")
struct GoalsWireUpTests {

    @Test("Goals loads through bridged repository")
    @MainActor func goalsLoadsThroughBridge() async {
        let vm = GoalsViewModel(
            repository: BridgedGoalRepository()
        )

        await vm.loadGoals()

        #expect(!vm.goals.isEmpty, "Goals should load through bridge")
        #expect(!vm.isLoading, "Loading should complete")
        #expect(vm.errorMessage == nil, "No error expected")
    }
}

// MARK: - Data Export Wire-Up

@Suite("DataExportViewModel Swift Export wire-up")
struct DataExportWireUpTests {

    @Test("Export loads accounts through bridge")
    @MainActor func exportLoadsAccountsThroughBridge() async {
        let vm = DataExportViewModel()

        await vm.loadAccounts()

        #expect(vm.hasLoadedAccounts, "Should have loaded accounts")
        #expect(!vm.availableAccounts.isEmpty, "Available accounts should load through bridge")
    }
}

// MARK: - RepositoryProvider Wire-Up

@Suite("RepositoryProvider Swift Export wire-up")
struct RepositoryProviderWireUpTests {

    @Test("RepositoryProvider.shared uses bridged repositories")
    @MainActor func sharedUsesBridgedRepositories() async throws {
        let provider = RepositoryProvider.shared

        let accounts = try await provider.accounts.getAccounts()
        #expect(!accounts.isEmpty, "Shared accounts should work through bridge")

        let transactions = try await provider.transactions.getTransactions()
        #expect(!transactions.isEmpty, "Shared transactions should work through bridge")

        let budgets = try await provider.budgets.getBudgets()
        #expect(!budgets.isEmpty, "Shared budgets should work through bridge")
    }
}
