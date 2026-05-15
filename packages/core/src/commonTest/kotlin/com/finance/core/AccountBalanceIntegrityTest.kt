// SPDX-License-Identifier: BUSL-1.1

package com.finance.core

import com.finance.models.*
import com.finance.models.types.*
import kotlinx.datetime.*
import kotlin.test.*

/**
 * Tests for Account CRUD operations and balance integrity (#1356).
 *
 * Verifies account creation with all types, updates via copy(),
 * soft-delete lifecycle, balance calculation from transactions,
 * multi-account independence, and edge cases (overflow, zero, max).
 */
class AccountBalanceIntegrityTest {

    @BeforeTest
    fun setup() {
        TestFixtures.reset()
    }

    // ═══════════════════════════════════════════════════════════════════
    // Account Creation — all types
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun createCheckingAccountWithValidData() {
        val account = TestFixtures.createAccount(
            name = "Primary Checking",
            type = AccountType.CHECKING,
            currency = Currency.USD,
            currentBalance = Cents(150000L),
        )
        assertEquals("Primary Checking", account.name)
        assertEquals(AccountType.CHECKING, account.type)
        assertEquals(Currency.USD, account.currency)
        assertEquals(Cents(150000L), account.currentBalance)
        assertFalse(account.isArchived)
        assertNull(account.deletedAt)
    }

    @Test
    fun createSavingsAccount() {
        val account = TestFixtures.createAccount(
            name = "Emergency Fund",
            type = AccountType.SAVINGS,
            currentBalance = Cents(5000000L),
        )
        assertEquals(AccountType.SAVINGS, account.type)
        assertTrue(account.currentBalance.isPositive())
    }

    @Test
    fun createCreditCardAccountWithNegativeBalance() {
        val account = TestFixtures.createAccount(
            name = "Visa Platinum",
            type = AccountType.CREDIT_CARD,
            currentBalance = Cents(-350099L),
        )
        assertEquals(AccountType.CREDIT_CARD, account.type)
        assertTrue(account.currentBalance.isNegative())
        assertEquals(-350099L, account.currentBalance.amount)
    }

    @Test
    fun createInvestmentAccount() {
        val account = TestFixtures.createAccount(
            name = "Brokerage",
            type = AccountType.INVESTMENT,
            currentBalance = Cents(10000000L),
        )
        assertEquals(AccountType.INVESTMENT, account.type)
    }

    @Test
    fun createCashAccount() {
        val account = TestFixtures.createAccount(
            name = "Wallet",
            type = AccountType.CASH,
            currentBalance = Cents(5000L),
        )
        assertEquals(AccountType.CASH, account.type)
    }

    @Test
    fun createLoanAccount() {
        val account = TestFixtures.createAccount(
            name = "Mortgage",
            type = AccountType.LOAN,
            currentBalance = Cents(-25000000L),
        )
        assertEquals(AccountType.LOAN, account.type)
        assertTrue(account.currentBalance.isNegative())
    }

    @Test
    fun createOtherAccountType() {
        val account = TestFixtures.createAccount(
            name = "Gift Cards",
            type = AccountType.OTHER,
            currentBalance = Cents(7500L),
        )
        assertEquals(AccountType.OTHER, account.type)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Account Update via copy()
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun updateAccountName() {
        val account = TestFixtures.createAccount(name = "Old Name")
        val updated = account.copy(
            name = "New Name",
            updatedAt = Instant.parse("2024-07-01T00:00:00Z"),
        )
        assertEquals("New Name", updated.name)
        assertEquals("Old Name", account.name)
    }

    @Test
    fun updateAccountType() {
        val account = TestFixtures.createAccount(type = AccountType.CHECKING)
        val updated = account.copy(type = AccountType.SAVINGS)
        assertEquals(AccountType.SAVINGS, updated.type)
        assertEquals(AccountType.CHECKING, account.type)
    }

    @Test
    fun updateAccountCurrency() {
        val account = TestFixtures.createAccount(currency = Currency.USD)
        val updated = account.copy(currency = Currency.EUR)
        assertEquals(Currency.EUR, updated.currency)
    }

    @Test
    fun updateAccountNameRejectsBlank() {
        val account = TestFixtures.createAccount(name = "Valid")
        assertFailsWith<IllegalArgumentException> {
            account.copy(name = "")
        }
    }

    @Test
    fun updateAccountNameRejectsWhitespaceOnly() {
        val account = TestFixtures.createAccount(name = "Valid")
        assertFailsWith<IllegalArgumentException> {
            account.copy(name = "   \t  ")
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Soft Delete
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun softDeleteSetsDeletedAtTimestamp() {
        val account = TestFixtures.createAccount()
        val deletedAt = Instant.parse("2024-08-01T10:30:00Z")
        val deleted = account.copy(deletedAt = deletedAt)

        assertNull(account.deletedAt)
        assertEquals(deletedAt, deleted.deletedAt)
    }

    @Test
    fun softDeletePreservesBalance() {
        val balance = Cents(42000L)
        val account = TestFixtures.createAccount(currentBalance = balance)
        val deleted = account.copy(deletedAt = Instant.parse("2024-08-01T00:00:00Z"))
        assertEquals(balance, deleted.currentBalance)
    }

    @Test
    fun restoreSoftDeletedAccount() {
        val account = TestFixtures.createAccount(
            deletedAt = Instant.parse("2024-08-01T00:00:00Z"),
        )
        val restored = account.copy(deletedAt = null)
        assertNull(restored.deletedAt)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Balance Calculation from Transactions
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun balanceFromExpenseTransactions() {
        val accountId = SyncId("account-checking")
        val initialBalance = Cents(100000L) // $1,000.00

        val expenses = listOf(
            TestFixtures.createExpense(amount = Cents(2500L), accountId = accountId),
            TestFixtures.createExpense(amount = Cents(5000L), accountId = accountId),
            TestFixtures.createExpense(amount = Cents(1500L), accountId = accountId),
        )

        val totalExpenses = Cents(expenses.sumOf { it.amount.abs().amount })
        val computedBalance = initialBalance - totalExpenses

        // $1000 - $25 - $50 - $15 = $910
        assertEquals(Cents(91000L), computedBalance)
    }

    @Test
    fun balanceFromIncomeTransactions() {
        val accountId = SyncId("account-checking")
        val initialBalance = Cents(50000L) // $500.00

        val incomes = listOf(
            TestFixtures.createIncome(amount = Cents(300000L), accountId = accountId),
            TestFixtures.createIncome(amount = Cents(15000L), accountId = accountId),
        )

        val totalIncome = Cents(incomes.sumOf { it.amount.amount })
        val computedBalance = initialBalance + totalIncome

        // $500 + $3000 + $150 = $3,650
        assertEquals(Cents(365000L), computedBalance)
    }

    @Test
    fun balanceFromMixedTransactions() {
        val initialBalance = Cents(100000L) // $1,000.00
        val income = Cents(50000L)
        val expense1 = Cents(20000L)
        val expense2 = Cents(10000L)

        // $1000 + $500 - $200 - $100 = $1,200
        val computed = initialBalance + income - expense1 - expense2
        assertEquals(Cents(120000L), computed)
    }

    @Test
    fun balanceWithDeletedTransactionsExcluded() {
        val accountId = SyncId("account-1")

        val activeExpense = TestFixtures.createExpense(
            amount = Cents(5000L),
            accountId = accountId,
        )
        val deletedExpense = TestFixtures.createExpense(
            amount = Cents(10000L),
            accountId = accountId,
            deletedAt = Instant.parse("2024-07-01T00:00:00Z"),
        )

        val transactions = listOf(activeExpense, deletedExpense)
        val activeTransactions = transactions.filter { it.deletedAt == null }

        assertEquals(1, activeTransactions.size)
        assertEquals(Cents(5000L), activeTransactions.first().amount)
    }

    @Test
    fun balanceAfterAddingTransaction() {
        val account = TestFixtures.createAccount(currentBalance = Cents(100000L))
        val expense = Cents(25000L)
        val updated = account.copy(currentBalance = account.currentBalance - expense)
        assertEquals(Cents(75000L), updated.currentBalance)
    }

    @Test
    fun balanceAfterRemovingTransaction() {
        val account = TestFixtures.createAccount(currentBalance = Cents(75000L))
        val removedExpense = Cents(25000L)
        val restored = account.copy(currentBalance = account.currentBalance + removedExpense)
        assertEquals(Cents(100000L), restored.currentBalance)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Multiple Accounts — Independent Balances
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun multipleAccountsHaveIndependentBalances() {
        val checking = TestFixtures.createAccount(
            id = SyncId("checking"),
            name = "Checking",
            currentBalance = Cents(100000L),
        )
        val savings = TestFixtures.createAccount(
            id = SyncId("savings"),
            name = "Savings",
            currentBalance = Cents(500000L),
        )

        val updatedChecking = checking.copy(
            currentBalance = checking.currentBalance - Cents(30000L),
        )

        assertEquals(Cents(70000L), updatedChecking.currentBalance)
        assertEquals(Cents(500000L), savings.currentBalance)
    }

    @Test
    fun netWorthAcrossMultipleAccounts() {
        val accounts = listOf(
            TestFixtures.createAccount(currentBalance = Cents(100000L)),
            TestFixtures.createAccount(currentBalance = Cents(500000L)),
            TestFixtures.createAccount(currentBalance = Cents(-250000L)),
        )

        val netWorth = Cents(accounts.sumOf { it.currentBalance.amount })
        assertEquals(Cents(350000L), netWorth) // $3,500
    }

    // ═══════════════════════════════════════════════════════════════════
    // Edge Cases
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun zeroBalanceAccount() {
        val account = TestFixtures.createAccount(currentBalance = Cents.ZERO)
        assertTrue(account.currentBalance.isZero())
    }

    @Test
    fun maxBalanceDoesNotOverflow() {
        val account = TestFixtures.createAccount(
            currentBalance = Cents(Long.MAX_VALUE - 1),
        )
        val updated = account.copy(
            currentBalance = account.currentBalance + Cents(1L),
        )
        assertEquals(Cents(Long.MAX_VALUE), updated.currentBalance)
    }

    @Test
    fun overflowOnAdditionThrowsArithmeticException() {
        val nearMax = Cents(Long.MAX_VALUE)
        assertFailsWith<ArithmeticException> {
            nearMax + Cents(1L)
        }
    }

    @Test
    fun multiCurrencyAccountsTrackCurrencyIndependently() {
        val usdAccount = TestFixtures.createAccount(
            name = "USD Account",
            currency = Currency.USD,
            currentBalance = Cents(100000L),
        )
        val eurAccount = TestFixtures.createAccount(
            name = "EUR Account",
            currency = Currency.EUR,
            currentBalance = Cents(85000L),
        )

        assertEquals(Currency.USD, usdAccount.currency)
        assertEquals(Currency.EUR, eurAccount.currency)
    }

    @Test
    fun archiveAccountPreservesAllData() {
        val account = TestFixtures.createAccount(
            name = "To Archive",
            currentBalance = Cents(42000L),
        )
        val archived = account.copy(isArchived = true)

        assertTrue(archived.isArchived)
        assertEquals("To Archive", archived.name)
        assertEquals(Cents(42000L), archived.currentBalance)
    }

    @Test
    fun singleCentPrecision() {
        val account = TestFixtures.createAccount(currentBalance = Cents(1L))
        val updated = account.copy(currentBalance = account.currentBalance - Cents(1L))
        assertTrue(updated.currentBalance.isZero())
    }

    @Test
    fun filterOnlyActiveAccounts() {
        val active = TestFixtures.createAccount(name = "Active")
        val deleted = TestFixtures.createAccount(
            name = "Deleted",
            deletedAt = Instant.parse("2024-01-01T00:00:00Z"),
        )
        val archived = TestFixtures.createAccount(name = "Archived").copy(isArchived = true)

        val accounts = listOf(active, deleted, archived)
        val visibleAccounts = accounts.filter { it.deletedAt == null && !it.isArchived }

        assertEquals(1, visibleAccounts.size)
        assertEquals("Active", visibleAccounts.first().name)
    }
}
