// SPDX-License-Identifier: BUSL-1.1

package com.finance.core

import com.finance.models.*
import com.finance.models.types.*
import kotlinx.datetime.*
import kotlin.test.*

/**
 * Tests for Transaction entry and editing flows (#1357).
 *
 * Verifies creation of all transaction types, editing via copy(),
 * cents-based precision, date handling, category assignment,
 * validation constraints, and optional field handling.
 */
class TransactionEntryEditingTest {

    @BeforeTest
    fun setup() {
        TestFixtures.reset()
    }

    // ═══════════════════════════════════════════════════════════════════
    // Create Transactions — all types
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun createExpenseTransaction() {
        val txn = TestFixtures.createExpense(
            amount = Cents(4999L), // $49.99
        )
        assertEquals(TransactionType.EXPENSE, txn.type)
        assertEquals(Cents(4999L), txn.amount)
        assertEquals(TransactionStatus.CLEARED, txn.status)
    }

    @Test
    fun createIncomeTransaction() {
        val txn = TestFixtures.createIncome(
            amount = Cents(500000L), // $5,000.00
        )
        assertEquals(TransactionType.INCOME, txn.type)
        assertEquals(Cents(500000L), txn.amount)
    }

    @Test
    fun createTransferTransaction() {
        val txn = TestFixtures.createTransaction(
            type = TransactionType.TRANSFER,
            amount = Cents(10000L),
            transferAccountId = SyncId("account-2"),
        )
        assertEquals(TransactionType.TRANSFER, txn.type)
        assertEquals(SyncId("account-2"), txn.transferAccountId)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Edit Transaction via copy()
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun editTransactionAmount() {
        val original = TestFixtures.createExpense(amount = Cents(2500L))
        val edited = original.copy(
            amount = Cents(3500L),
            updatedAt = Instant.parse("2024-07-01T00:00:00Z"),
        )
        assertEquals(Cents(3500L), edited.amount)
        assertEquals(Cents(2500L), original.amount) // immutable
    }

    @Test
    fun editTransactionDate() {
        val original = TestFixtures.createExpense()
        val newDate = LocalDate(2024, 8, 20)
        val edited = original.copy(date = newDate)
        assertEquals(newDate, edited.date)
    }

    @Test
    fun editTransactionCategory() {
        val original = TestFixtures.createExpense(
            categoryId = SyncId("groceries"),
        )
        val edited = original.copy(categoryId = SyncId("dining"))
        assertEquals(SyncId("dining"), edited.categoryId)
        assertEquals(SyncId("groceries"), original.categoryId)
    }

    @Test
    fun editTransactionNotes() {
        val original = TestFixtures.createTransaction(note = null)
        val edited = original.copy(note = "Monthly subscription")
        assertEquals("Monthly subscription", edited.note)
        assertNull(original.note)
    }

    @Test
    fun editTransactionPayee() {
        val original = TestFixtures.createTransaction(payee = "Store A")
        val edited = original.copy(payee = "Store B")
        assertEquals("Store B", edited.payee)
    }

    @Test
    fun editTransactionStatus() {
        val original = TestFixtures.createExpense(status = TransactionStatus.PENDING)
        val cleared = original.copy(status = TransactionStatus.CLEARED)
        val reconciled = cleared.copy(status = TransactionStatus.RECONCILED)

        assertEquals(TransactionStatus.PENDING, original.status)
        assertEquals(TransactionStatus.CLEARED, cleared.status)
        assertEquals(TransactionStatus.RECONCILED, reconciled.status)
    }

    @Test
    fun removeCategory() {
        val original = TestFixtures.createExpense(categoryId = SyncId("food"))
        val edited = original.copy(categoryId = null)
        assertNull(edited.categoryId)
    }

    @Test
    fun reassignCategory() {
        val original = TestFixtures.createExpense(categoryId = SyncId("food"))
        val edited = original.copy(categoryId = SyncId("entertainment"))
        assertEquals(SyncId("entertainment"), edited.categoryId)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Cents Precision
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun singleCentTransaction() {
        val txn = TestFixtures.createExpense(amount = Cents(1L))
        assertEquals(1L, txn.amount.amount)
    }

    @Test
    fun largeAmountTransaction() {
        // $1,000,000.00 = 100_000_000 cents
        val txn = TestFixtures.createExpense(amount = Cents(100_000_000L))
        assertEquals(100_000_000L, txn.amount.amount)
    }

    @Test
    fun centsArithmeticPreservesExactValues() {
        val a = Cents(33L)
        val b = Cents(33L)
        val c = Cents(34L)
        val sum = a + b + c
        assertEquals(Cents(100L), sum) // exact, no rounding
    }

    @Test
    fun negativeAmountIsAllowed() {
        // Transaction model allows negative amounts for refunds/corrections
        val txn = TestFixtures.createTransaction(amount = Cents(-500L))
        assertEquals(Cents(-500L), txn.amount)
    }

    @Test
    fun rejectZeroAmount() {
        assertFailsWith<IllegalArgumentException> {
            TestFixtures.createTransaction(amount = Cents.ZERO)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Date Handling
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun transactionDateIsLocalDate() {
        val txn = TestFixtures.createExpense(
            date = LocalDate(2024, 12, 31),
        )
        assertEquals(LocalDate(2024, 12, 31), txn.date)
    }

    @Test
    fun leapYearDate() {
        val txn = TestFixtures.createExpense(
            date = LocalDate(2024, 2, 29),
        )
        assertEquals(29, txn.date.dayOfMonth)
    }

    @Test
    fun endOfYearDate() {
        val txn = TestFixtures.createExpense(
            date = LocalDate(2024, 12, 31),
        )
        assertEquals(12, txn.date.monthNumber)
        assertEquals(31, txn.date.dayOfMonth)
    }

    @Test
    fun beginningOfYearDate() {
        val txn = TestFixtures.createExpense(
            date = LocalDate(2024, 1, 1),
        )
        assertEquals(1, txn.date.monthNumber)
        assertEquals(1, txn.date.dayOfMonth)
    }

    @Test
    fun dateAcrossTimezones() {
        // Instants preserve the exact moment; LocalDate is timezone-aware
        val utcInstant = Instant.parse("2024-06-15T23:30:00Z")
        val utcDate = utcInstant.toLocalDateTime(TimeZone.UTC).date
        assertEquals(LocalDate(2024, 6, 15), utcDate)

        // Same instant in UTC+5 would be the next day
        val eastTz = TimeZone.of("Asia/Karachi") // UTC+5
        val eastDate = utcInstant.toLocalDateTime(eastTz).date
        assertEquals(LocalDate(2024, 6, 16), eastDate)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Optional Fields
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun transactionWithoutNotes() {
        val txn = TestFixtures.createTransaction(note = null)
        assertNull(txn.note)
    }

    @Test
    fun transactionWithNotes() {
        val txn = TestFixtures.createTransaction(note = "Weekly groceries")
        assertEquals("Weekly groceries", txn.note)
    }

    @Test
    fun transactionWithEmptyTags() {
        val txn = TestFixtures.createTransaction()
        assertTrue(txn.tags.isEmpty())
    }

    @Test
    fun transactionWithTags() {
        val txn = Transaction(
            id = SyncId("txn-tags"),
            householdId = SyncId("household-1"),
            ownerId = SyncId("owner-1"),
            accountId = SyncId("account-1"),
            type = TransactionType.EXPENSE,
            amount = Cents(100L),
            currency = Currency.USD,
            date = TestFixtures.fixedDate,
            tags = listOf("food", "essentials", "weekly"),
            createdAt = TestFixtures.fixedInstant,
            updatedAt = TestFixtures.fixedInstant,
        )
        assertEquals(3, txn.tags.size)
        assertTrue(txn.tags.contains("food"))
    }

    @Test
    fun transactionWithoutPayee() {
        val txn = TestFixtures.createTransaction(payee = null)
        assertNull(txn.payee)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Validation
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun transferRequiresDestinationAccount() {
        assertFailsWith<IllegalArgumentException> {
            TestFixtures.createTransaction(
                type = TransactionType.TRANSFER,
                transferAccountId = null,
            )
        }
    }

    @Test
    fun transferAcceptsDestinationAccount() {
        val txn = TestFixtures.createTransaction(
            type = TransactionType.TRANSFER,
            transferAccountId = SyncId("account-2"),
        )
        assertEquals(SyncId("account-2"), txn.transferAccountId)
    }

    @Test
    fun expenseDoesNotRequireTransferAccountId() {
        val txn = TestFixtures.createExpense()
        assertNull(txn.transferAccountId)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Soft Delete
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun softDeleteTransaction() {
        val txn = TestFixtures.createExpense()
        val deleted = txn.copy(
            deletedAt = Instant.parse("2024-08-01T00:00:00Z"),
        )
        assertNull(txn.deletedAt)
        assertNotNull(deleted.deletedAt)
    }

    @Test
    fun voidTransaction() {
        val txn = TestFixtures.createExpense()
        val voided = txn.copy(status = TransactionStatus.VOID)
        assertEquals(TransactionStatus.VOID, voided.status)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Copy Preserves Unchanged Fields
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun copyPreservesUnchangedFields() {
        val txn = TestFixtures.createTransaction(
            payee = "Coffee Shop",
            note = "Morning latte",
        )
        val edited = txn.copy(amount = Cents(550L))

        assertEquals("Coffee Shop", edited.payee)
        assertEquals("Morning latte", edited.note)
        assertEquals(Cents(550L), edited.amount)
    }

    @Test
    fun multipleEditsOnSameTransaction() {
        val txn = TestFixtures.createExpense(amount = Cents(1000L))
        val edit1 = txn.copy(amount = Cents(2000L))
        val edit2 = edit1.copy(note = "Updated")
        val edit3 = edit2.copy(categoryId = SyncId("new-cat"))

        assertEquals(Cents(2000L), edit3.amount)
        assertEquals("Updated", edit3.note)
        assertEquals(SyncId("new-cat"), edit3.categoryId)
        // Original unchanged
        assertEquals(Cents(1000L), txn.amount)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Recurring Link
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun transactionWithRecurringRuleId() {
        val txn = Transaction(
            id = SyncId("txn-rec"),
            householdId = SyncId("household-1"),
            ownerId = SyncId("owner-1"),
            accountId = SyncId("account-1"),
            type = TransactionType.EXPENSE,
            amount = Cents(9999L),
            currency = Currency.USD,
            date = TestFixtures.fixedDate,
            isRecurring = true,
            recurringRuleId = SyncId("rule-netflix"),
            createdAt = TestFixtures.fixedInstant,
            updatedAt = TestFixtures.fixedInstant,
        )
        assertTrue(txn.isRecurring)
        assertEquals(SyncId("rule-netflix"), txn.recurringRuleId)
    }

    @Test
    fun nonRecurringTransactionHasNullRuleId() {
        val txn = TestFixtures.createExpense()
        assertFalse(txn.isRecurring)
        assertNull(txn.recurringRuleId)
    }
}
