// SPDX-License-Identifier: BUSL-1.1

package com.finance.models

import com.finance.models.types.*
import kotlinx.datetime.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.test.*

/**
 * Serialization roundtrip tests for all financial models (#1356-#1361).
 *
 * Verifies that every model serializes to JSON and deserializes back
 * to an equal object, covering accounts, transactions, budgets, goals,
 * and categories with all field permutations.
 */
class ModelSerializationRoundtripTest {

    private val json = Json {
        prettyPrint = false
        encodeDefaults = true
    }

    private val now = Instant.parse("2024-06-15T12:00:00Z")
    private val today = LocalDate(2024, 6, 15)

    // ═══════════════════════════════════════════════════════════════════
    // Value Types
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun centsSerializationRoundtrip() {
        val original = Cents(42099L)
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Cents>(encoded)
        assertEquals(original, decoded)
    }

    @Test
    fun centsZeroRoundtrip() {
        val original = Cents.ZERO
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Cents>(encoded)
        assertEquals(original, decoded)
    }

    @Test
    fun centsNegativeRoundtrip() {
        val original = Cents(-999999L)
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Cents>(encoded)
        assertEquals(original, decoded)
    }

    @Test
    fun currencyRoundtrip() {
        val original = Currency.USD
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Currency>(encoded)
        assertEquals(original, decoded)
    }

    @Test
    fun syncIdRoundtrip() {
        val original = SyncId("test-id-12345")
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<SyncId>(encoded)
        assertEquals(original, decoded)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Account
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun accountSerializationRoundtrip() {
        val original = Account(
            id = SyncId("account-1"),
            householdId = SyncId("household-1"),
            ownerId = SyncId("owner-1"),
            name = "Test Checking",
            type = AccountType.CHECKING,
            currency = Currency.USD,
            currentBalance = Cents(150000L),
            isArchived = false,
            sortOrder = 2,
            icon = "bank",
            color = "#336699",
            createdAt = now,
            updatedAt = now,
        )
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Account>(encoded)
        assertEquals(original, decoded)
    }

    @Test
    fun accountWithDeletedAtRoundtrip() {
        val original = Account(
            id = SyncId("account-del"),
            householdId = SyncId("household-1"),
            ownerId = SyncId("owner-1"),
            name = "Deleted Account",
            type = AccountType.SAVINGS,
            currency = Currency.EUR,
            currentBalance = Cents.ZERO,
            createdAt = now,
            updatedAt = now,
            deletedAt = Instant.parse("2024-08-01T00:00:00Z"),
        )
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Account>(encoded)
        assertEquals(original, decoded)
    }

    @Test
    fun allAccountTypesSerialize() {
        AccountType.entries.forEach { type ->
            val encoded = json.encodeToString(type)
            val decoded = json.decodeFromString<AccountType>(encoded)
            assertEquals(type, decoded)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Transaction
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun transactionExpenseRoundtrip() {
        val original = Transaction(
            id = SyncId("txn-1"),
            householdId = SyncId("household-1"),
            ownerId = SyncId("owner-1"),
            accountId = SyncId("account-1"),
            categoryId = SyncId("groceries"),
            type = TransactionType.EXPENSE,
            status = TransactionStatus.CLEARED,
            amount = Cents(4599L),
            currency = Currency.USD,
            payee = "Whole Foods",
            note = "Weekly groceries",
            date = today,
            tags = listOf("food", "weekly"),
            createdAt = now,
            updatedAt = now,
        )
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Transaction>(encoded)
        assertEquals(original, decoded)
    }

    @Test
    fun transactionTransferRoundtrip() {
        val original = Transaction(
            id = SyncId("txn-transfer"),
            householdId = SyncId("household-1"),
            ownerId = SyncId("owner-1"),
            accountId = SyncId("checking"),
            type = TransactionType.TRANSFER,
            amount = Cents(50000L),
            currency = Currency.USD,
            date = today,
            transferAccountId = SyncId("savings"),
            transferTransactionId = SyncId("txn-transfer-pair"),
            createdAt = now,
            updatedAt = now,
        )
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Transaction>(encoded)
        assertEquals(original, decoded)
    }

    @Test
    fun transactionRecurringRoundtrip() {
        val original = Transaction(
            id = SyncId("txn-rec"),
            householdId = SyncId("household-1"),
            ownerId = SyncId("owner-1"),
            accountId = SyncId("account-1"),
            type = TransactionType.EXPENSE,
            amount = Cents(1599L),
            currency = Currency.USD,
            date = today,
            isRecurring = true,
            recurringRuleId = SyncId("rule-netflix"),
            createdAt = now,
            updatedAt = now,
        )
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Transaction>(encoded)
        assertEquals(original, decoded)
        assertTrue(decoded.isRecurring)
        assertEquals(SyncId("rule-netflix"), decoded.recurringRuleId)
    }

    @Test
    fun allTransactionTypesSerialize() {
        TransactionType.entries.forEach { type ->
            val encoded = json.encodeToString(type)
            val decoded = json.decodeFromString<TransactionType>(encoded)
            assertEquals(type, decoded)
        }
    }

    @Test
    fun allTransactionStatusesSerialize() {
        TransactionStatus.entries.forEach { status ->
            val encoded = json.encodeToString(status)
            val decoded = json.decodeFromString<TransactionStatus>(encoded)
            assertEquals(status, decoded)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Budget
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun budgetRoundtrip() {
        val original = Budget(
            id = SyncId("budget-1"),
            householdId = SyncId("household-1"),
            ownerId = SyncId("owner-1"),
            categoryId = SyncId("dining"),
            name = "Dining Out",
            amount = Cents(40000L),
            currency = Currency.USD,
            period = BudgetPeriod.MONTHLY,
            startDate = LocalDate(2024, 6, 1),
            endDate = LocalDate(2024, 12, 31),
            isRollover = true,
            createdAt = now,
            updatedAt = now,
        )
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Budget>(encoded)
        assertEquals(original, decoded)
        assertTrue(decoded.isRollover)
    }

    @Test
    fun allBudgetPeriodsSerialize() {
        BudgetPeriod.entries.forEach { period ->
            val encoded = json.encodeToString(period)
            val decoded = json.decodeFromString<BudgetPeriod>(encoded)
            assertEquals(period, decoded)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Goal
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun goalRoundtrip() {
        val original = Goal(
            id = SyncId("goal-1"),
            householdId = SyncId("household-1"),
            ownerId = SyncId("owner-1"),
            name = "Emergency Fund",
            targetAmount = Cents(1000000L),
            currentAmount = Cents(500000L),
            currency = Currency.USD,
            targetDate = LocalDate(2025, 12, 31),
            status = GoalStatus.ACTIVE,
            icon = "shield",
            color = "#00AA00",
            accountId = SyncId("savings-account"),
            createdAt = now,
            updatedAt = now,
        )
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Goal>(encoded)
        assertEquals(original, decoded)
        assertEquals(SyncId("savings-account"), decoded.accountId)
    }

    @Test
    fun goalCompletedStatusRoundtrip() {
        val original = Goal(
            id = SyncId("goal-done"),
            householdId = SyncId("household-1"),
            ownerId = SyncId("owner-1"),
            name = "Completed Goal",
            targetAmount = Cents(100000L),
            currentAmount = Cents(100000L),
            currency = Currency.USD,
            status = GoalStatus.COMPLETED,
            createdAt = now,
            updatedAt = now,
        )
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Goal>(encoded)
        assertEquals(GoalStatus.COMPLETED, decoded.status)
        assertTrue(decoded.isComplete)
    }

    @Test
    fun allGoalStatusesSerialize() {
        GoalStatus.entries.forEach { status ->
            val encoded = json.encodeToString(status)
            val decoded = json.decodeFromString<GoalStatus>(encoded)
            assertEquals(status, decoded)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Category
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun categoryRoundtrip() {
        val original = Category(
            id = SyncId("cat-1"),
            householdId = SyncId("household-1"),
            ownerId = SyncId("owner-1"),
            name = "Groceries",
            icon = "cart",
            color = "#FF5733",
            parentId = SyncId("essentials"),
            isIncome = false,
            isSystem = true,
            sortOrder = 5,
            createdAt = now,
            updatedAt = now,
        )
        val encoded = json.encodeToString(original)
        val decoded = json.decodeFromString<Category>(encoded)
        assertEquals(original, decoded)
    }
}
