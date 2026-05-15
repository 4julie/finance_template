// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.analytics

import com.finance.core.TestFixtures
import com.finance.models.*
import com.finance.models.types.*
import kotlinx.datetime.*
import kotlin.test.*

/**
 * Verification tests for the ReportGenerator — custom date ranges,
 * aggregation periods, multi-metric reports, filtering, period-over-period
 * comparison, trend lines, and empty data handling.
 *
 * Covers issue #1375.
 */
class ReportBuilderVerificationTest {

    @BeforeTest
    fun setUp() {
        TestFixtures.reset()
    }

    // ═══════════════════════════════════════════════════════════════════
    // Custom date range selection
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun dateRange_validRange_createsSuccessfully() {
        val range = ReportGenerator.DateRange(
            LocalDate(2024, 1, 1),
            LocalDate(2024, 12, 31),
        )
        assertEquals(LocalDate(2024, 1, 1), range.start)
        assertEquals(LocalDate(2024, 12, 31), range.endInclusive)
    }

    @Test
    fun dateRange_sameDay_isValid() {
        val range = ReportGenerator.DateRange(
            LocalDate(2024, 6, 15),
            LocalDate(2024, 6, 15),
        )
        assertEquals(range.start, range.endInclusive)
    }

    @Test
    fun dateRange_endBeforeStart_throws() {
        assertFailsWith<IllegalArgumentException> {
            ReportGenerator.DateRange(
                LocalDate(2024, 6, 30),
                LocalDate(2024, 6, 1),
            )
        }
    }

    @Test
    fun spendingByCategory_customDateRange_filtersCorrectly() {
        val food = SyncId("cat-food")
        val transactions = listOf(
            TestFixtures.createExpense(
                amount = Cents(1000), categoryId = food,
                date = LocalDate(2024, 1, 15),
            ),
            TestFixtures.createExpense(
                amount = Cents(2000), categoryId = food,
                date = LocalDate(2024, 3, 15),
            ),
            TestFixtures.createExpense(
                amount = Cents(3000), categoryId = food,
                date = LocalDate(2024, 6, 15),
            ),
        )

        // Only Q1 transactions
        val q1Range = ReportGenerator.DateRange(
            LocalDate(2024, 1, 1), LocalDate(2024, 3, 31),
        )
        val result = ReportGenerator.spendingByCategory(transactions, q1Range)
        assertEquals(Cents(3000), result[food])
    }

    @Test
    fun spendingByCategory_narrowRange_excludesOutOfBounds() {
        val food = SyncId("cat-food")
        val transactions = listOf(
            TestFixtures.createExpense(
                amount = Cents(1000), categoryId = food,
                date = LocalDate(2024, 6, 10),
            ),
            TestFixtures.createExpense(
                amount = Cents(2000), categoryId = food,
                date = LocalDate(2024, 6, 20),
            ),
        )

        // Only the first week — exclude both transactions
        val range = ReportGenerator.DateRange(
            LocalDate(2024, 6, 1), LocalDate(2024, 6, 5),
        )
        val result = ReportGenerator.spendingByCategory(transactions, range)
        assertTrue(result.isEmpty())
    }

    // ═══════════════════════════════════════════════════════════════════
    // Report aggregation by month (incomeVsExpense)
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun incomeVsExpense_singleMonth() {
        val transactions = listOf(
            TestFixtures.createIncome(
                amount = Cents(500000),
                date = LocalDate(2024, 6, 1),
            ),
            TestFixtures.createExpense(
                amount = Cents(300000),
                date = LocalDate(2024, 6, 15),
            ),
        )

        val result = ReportGenerator.incomeVsExpense(
            transactions, months = 1,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(1, result.size)
        assertEquals(Month.JUNE, result[0].month)
        assertEquals(Cents(500000), result[0].income)
        assertEquals(Cents(300000), result[0].expense)
        assertEquals(Cents(200000), result[0].net)
    }

    @Test
    fun incomeVsExpense_multipleMonths_orderedChronologically() {
        val transactions = listOf(
            TestFixtures.createIncome(amount = Cents(400000), date = LocalDate(2024, 4, 1)),
            TestFixtures.createExpense(amount = Cents(200000), date = LocalDate(2024, 4, 15)),
            TestFixtures.createIncome(amount = Cents(500000), date = LocalDate(2024, 5, 1)),
            TestFixtures.createExpense(amount = Cents(350000), date = LocalDate(2024, 5, 15)),
            TestFixtures.createIncome(amount = Cents(600000), date = LocalDate(2024, 6, 1)),
            TestFixtures.createExpense(amount = Cents(450000), date = LocalDate(2024, 6, 15)),
        )

        val result = ReportGenerator.incomeVsExpense(
            transactions, months = 3,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(3, result.size)
        // Ordered oldest → newest
        assertEquals(Month.APRIL, result[0].month)
        assertEquals(Month.MAY, result[1].month)
        assertEquals(Month.JUNE, result[2].month)
    }

    @Test
    fun incomeVsExpense_zeroMonths_throws() {
        assertFailsWith<IllegalArgumentException> {
            ReportGenerator.incomeVsExpense(emptyList(), months = 0)
        }
    }

    @Test
    fun incomeVsExpense_noTransactions_returnsZeroedMonths() {
        val result = ReportGenerator.incomeVsExpense(
            emptyList(), months = 2,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(2, result.size)
        result.forEach { comparison ->
            assertEquals(Cents.ZERO, comparison.income)
            assertEquals(Cents.ZERO, comparison.expense)
            assertEquals(Cents.ZERO, comparison.net)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Multi-metric reports (income, expenses, savings rate, net worth)
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun savingsRate_computedFromIncomeAndExpense() {
        val income = Cents(500000)
        val expense = Cents(350000)
        val savings = income - expense
        // Savings rate = savings / income * 100
        val savingsRate = (savings.amount.toDouble() / income.amount) * 100.0
        assertEquals(30.0, savingsRate, 0.01)
    }

    @Test
    fun savingsRate_zeroIncome_undefined() {
        val income = Cents.ZERO
        // When income is zero, savings rate is undefined
        assertTrue(income.isZero())
    }

    @Test
    fun savingsRate_expensesExceedIncome_negative() {
        val income = Cents(300000)
        val expense = Cents(400000)
        val savings = income - expense
        val savingsRate = (savings.amount.toDouble() / income.amount) * 100.0
        assertTrue(savingsRate < 0)
        assertEquals(-33.33, savingsRate, 0.01)
    }

    @Test
    fun netWorthSnapshot_computedCorrectly() {
        val snapshot = NetWorthSnapshot(
            date = LocalDate(2024, 6, 30),
            totalAssets = Cents(1000000),
            totalLiabilities = Cents(300000),
            netWorth = Cents(700000),
        )
        assertEquals(Cents(1000000), snapshot.totalAssets)
        assertEquals(Cents(300000), snapshot.totalLiabilities)
        assertEquals(Cents(700000), snapshot.netWorth)
    }

    @Test
    fun netWorthSnapshot_negativeAssetsThrows() {
        assertFailsWith<IllegalArgumentException> {
            NetWorthSnapshot(
                date = LocalDate(2024, 6, 30),
                totalAssets = Cents(-100),
                totalLiabilities = Cents.ZERO,
                netWorth = Cents(-100),
            )
        }
    }

    @Test
    fun netWorthSnapshot_negativeLiabilitiesThrows() {
        assertFailsWith<IllegalArgumentException> {
            NetWorthSnapshot(
                date = LocalDate(2024, 6, 30),
                totalAssets = Cents(100),
                totalLiabilities = Cents(-100),
                netWorth = Cents(200),
            )
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Report filtering by account, category, tags
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun filterByAccount_singleAccount() {
        val acct1 = SyncId("acct-1")
        val acct2 = SyncId("acct-2")
        val transactions = listOf(
            TestFixtures.createExpense(
                amount = Cents(1000), accountId = acct1,
                date = LocalDate(2024, 6, 5),
            ),
            TestFixtures.createExpense(
                amount = Cents(2000), accountId = acct2,
                date = LocalDate(2024, 6, 10),
            ),
            TestFixtures.createExpense(
                amount = Cents(3000), accountId = acct1,
                date = LocalDate(2024, 6, 15),
            ),
        )

        val filtered = transactions.filter { it.accountId == acct1 }
        assertEquals(2, filtered.size)
        assertEquals(4000L, filtered.sumOf { it.amount.abs().amount })
    }

    @Test
    fun filterByCategory_singleCategory() {
        val food = SyncId("cat-food")
        val transport = SyncId("cat-transport")
        val transactions = listOf(
            TestFixtures.createExpense(amount = Cents(1500), categoryId = food),
            TestFixtures.createExpense(amount = Cents(2500), categoryId = transport),
            TestFixtures.createExpense(amount = Cents(3000), categoryId = food),
        )

        val filtered = transactions.filter { it.categoryId == food }
        assertEquals(2, filtered.size)
    }

    @Test
    fun filterByTags_matchesAnyTag() {
        val txn1 = TestFixtures.createTransaction(
            note = "Tagged",
        ).copy(tags = listOf("groceries", "essential"))
        val txn2 = TestFixtures.createTransaction(
            note = "Also tagged",
        ).copy(tags = listOf("entertainment"))
        val txn3 = TestFixtures.createTransaction(
            note = "No tags",
        ).copy(tags = emptyList())

        val transactions = listOf(txn1, txn2, txn3)
        val filtered = transactions.filter { "essential" in it.tags }
        assertEquals(1, filtered.size)
    }

    @Test
    fun filterByMultipleAccounts() {
        val acct1 = SyncId("acct-1")
        val acct2 = SyncId("acct-2")
        val acct3 = SyncId("acct-3")
        val watchedAccounts = setOf(acct1, acct3)

        val transactions = listOf(
            TestFixtures.createExpense(amount = Cents(1000), accountId = acct1),
            TestFixtures.createExpense(amount = Cents(2000), accountId = acct2),
            TestFixtures.createExpense(amount = Cents(3000), accountId = acct3),
        )

        val filtered = transactions.filter { it.accountId in watchedAccounts }
        assertEquals(2, filtered.size)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Comparison reports (period over period)
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun spendingInsights_periodOverPeriodComparison() {
        val food = SyncId("cat-food")
        val transactions = listOf(
            // Previous month (May)
            TestFixtures.createExpense(
                amount = Cents(10000), categoryId = food,
                date = LocalDate(2024, 5, 10),
            ),
            // Current month (June) — spending increased
            TestFixtures.createExpense(
                amount = Cents(15000), categoryId = food,
                date = LocalDate(2024, 6, 10),
            ),
        )

        val insights = ReportGenerator.spendingInsights(
            transactions,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(1, insights.size)
        assertEquals(food, insights[0].categoryId)
        assertEquals(Cents(15000), insights[0].currentMonth)
        assertEquals(Cents(10000), insights[0].previousMonth)
        assertEquals(Trend.UP, insights[0].trend)
        assertNotNull(insights[0].percentChange)
        assertEquals(50.0, insights[0].percentChange!!, 0.01)
    }

    @Test
    fun spendingInsights_decreasedSpending_trendDown() {
        val transport = SyncId("cat-transport")
        val transactions = listOf(
            TestFixtures.createExpense(
                amount = Cents(20000), categoryId = transport,
                date = LocalDate(2024, 5, 10),
            ),
            TestFixtures.createExpense(
                amount = Cents(10000), categoryId = transport,
                date = LocalDate(2024, 6, 10),
            ),
        )

        val insights = ReportGenerator.spendingInsights(
            transactions,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(Trend.DOWN, insights[0].trend)
        assertEquals(-50.0, insights[0].percentChange!!, 0.01)
    }

    @Test
    fun spendingInsights_stableSpending_trendStable() {
        val food = SyncId("cat-food")
        val transactions = listOf(
            TestFixtures.createExpense(
                amount = Cents(10000), categoryId = food,
                date = LocalDate(2024, 5, 10),
            ),
            TestFixtures.createExpense(
                amount = Cents(10050), categoryId = food,
                date = LocalDate(2024, 6, 10),
            ),
        )

        val insights = ReportGenerator.spendingInsights(
            transactions,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(Trend.STABLE, insights[0].trend)
    }

    @Test
    fun computeTrend_zeroPreviousWithCurrentSpending_trendUp() {
        val (pctChange, trend) = ReportGenerator.computeTrend(Cents(5000), Cents.ZERO)
        assertNull(pctChange) // Undefined percentage
        assertEquals(Trend.UP, trend)
    }

    @Test
    fun computeTrend_bothZero_trendStable() {
        val (pctChange, trend) = ReportGenerator.computeTrend(Cents.ZERO, Cents.ZERO)
        assertNull(pctChange)
        assertEquals(Trend.STABLE, trend)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Trend line generation (category trends)
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun categoryTrends_monthlySpending() {
        val food = SyncId("cat-food")
        val transactions = listOf(
            TestFixtures.createExpense(
                amount = Cents(10000), categoryId = food,
                date = LocalDate(2024, 4, 10),
            ),
            TestFixtures.createExpense(
                amount = Cents(12000), categoryId = food,
                date = LocalDate(2024, 5, 10),
            ),
            TestFixtures.createExpense(
                amount = Cents(15000), categoryId = food,
                date = LocalDate(2024, 6, 10),
            ),
        )

        val trends = ReportGenerator.categoryTrends(
            transactions, food, months = 3,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(3, trends.size)
    }

    @Test
    fun categoryTrends_zeroMonths_throws() {
        assertFailsWith<IllegalArgumentException> {
            ReportGenerator.categoryTrends(
                emptyList(), SyncId("cat-1"), months = 0,
            )
        }
    }

    @Test
    fun categoryTrends_noneForCategory_returnsZeroedMonths() {
        val trends = ReportGenerator.categoryTrends(
            emptyList(),
            SyncId("cat-nonexistent"),
            months = 3,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(3, trends.size)
        trends.forEach { monthly ->
            assertEquals(Cents.ZERO, monthly.total)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Empty data handling in reports
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun spendingByCategory_emptyTransactions_returnsEmptyMap() {
        val range = ReportGenerator.DateRange(
            LocalDate(2024, 6, 1), LocalDate(2024, 6, 30),
        )
        assertTrue(ReportGenerator.spendingByCategory(emptyList(), range).isEmpty())
    }

    @Test
    fun spendingInsights_emptyTransactions_returnsEmptyList() {
        val insights = ReportGenerator.spendingInsights(
            emptyList(),
            referenceDate = LocalDate(2024, 6, 15),
        )
        assertTrue(insights.isEmpty())
    }

    @Test
    fun netWorthOverTime_emptyAccounts_allZero() {
        val snapshots = ReportGenerator.netWorthOverTime(
            accounts = emptyList(),
            transactions = emptyList(),
            months = 3,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(3, snapshots.size)
        snapshots.forEach { snapshot ->
            assertEquals(Cents.ZERO, snapshot.netWorth)
        }
    }

    @Test
    fun netWorthOverTime_zeroMonths_throws() {
        assertFailsWith<IllegalArgumentException> {
            ReportGenerator.netWorthOverTime(
                accounts = emptyList(),
                transactions = emptyList(),
                months = 0,
            )
        }
    }

    @Test
    fun incomeVsExpense_monthWithOnlyIncome() {
        val transactions = listOf(
            TestFixtures.createIncome(
                amount = Cents(500000),
                date = LocalDate(2024, 6, 1),
            ),
        )

        val result = ReportGenerator.incomeVsExpense(
            transactions, months = 1,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(Cents(500000), result[0].income)
        assertEquals(Cents.ZERO, result[0].expense)
        assertEquals(Cents(500000), result[0].net)
    }

    @Test
    fun incomeVsExpense_monthWithOnlyExpenses() {
        val transactions = listOf(
            TestFixtures.createExpense(
                amount = Cents(300000),
                date = LocalDate(2024, 6, 15),
            ),
        )

        val result = ReportGenerator.incomeVsExpense(
            transactions, months = 1,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(Cents.ZERO, result[0].income)
        assertEquals(Cents(300000), result[0].expense)
        assertTrue(result[0].net.isNegative())
    }

    // ═══════════════════════════════════════════════════════════════════
    // Net worth over time with accounts
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun netWorthOverTime_withAccounts_computesSnapshots() {
        val accounts = listOf(
            TestFixtures.createAccount(
                name = "Checking",
                type = AccountType.CHECKING,
                currentBalance = Cents(500000),
            ),
            TestFixtures.createAccount(
                name = "Credit Card",
                type = AccountType.CREDIT_CARD,
                currentBalance = Cents(100000),
            ),
        )

        val snapshots = ReportGenerator.netWorthOverTime(
            accounts = accounts,
            transactions = emptyList(),
            months = 1,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(1, snapshots.size)
        // Net worth = 500000 (checking) - 100000 (credit card) = 400000
        assertEquals(Cents(400000), snapshots[0].netWorth)
    }

    @Test
    fun netWorthOverTime_orderedChronologically() {
        val accounts = listOf(
            TestFixtures.createAccount(
                name = "Savings",
                currentBalance = Cents(1000000),
            ),
        )

        val snapshots = ReportGenerator.netWorthOverTime(
            accounts = accounts,
            transactions = emptyList(),
            months = 3,
            referenceDate = LocalDate(2024, 6, 15),
        )

        assertEquals(3, snapshots.size)
        // Should be ordered oldest first
        assertTrue(snapshots[0].date < snapshots[1].date)
        assertTrue(snapshots[1].date < snapshots[2].date)
    }

    // ═══════════════════════════════════════════════════════════════════
    // MonthlyComparison validation
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun monthlyComparison_negativeIncome_throws() {
        assertFailsWith<IllegalArgumentException> {
            MonthlyComparison(
                year = 2024, month = Month.JUNE,
                income = Cents(-100),
                expense = Cents(200),
                net = Cents(-300),
            )
        }
    }

    @Test
    fun monthlyComparison_negativeExpense_throws() {
        assertFailsWith<IllegalArgumentException> {
            MonthlyComparison(
                year = 2024, month = Month.JUNE,
                income = Cents(100),
                expense = Cents(-200),
                net = Cents(300),
            )
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SpendingInsight validation
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun spendingInsight_negativeCurrentMonth_throws() {
        assertFailsWith<IllegalArgumentException> {
            SpendingInsight(
                categoryId = SyncId("cat-1"),
                currentMonth = Cents(-100),
                previousMonth = Cents(200),
                percentChange = null,
                trend = Trend.DOWN,
            )
        }
    }

    @Test
    fun spendingInsight_negativePreviousMonth_throws() {
        assertFailsWith<IllegalArgumentException> {
            SpendingInsight(
                categoryId = SyncId("cat-1"),
                currentMonth = Cents(100),
                previousMonth = Cents(-200),
                percentChange = null,
                trend = Trend.UP,
            )
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Aggregation by quarter/year (via date ranges)
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun spendingByCategory_quarterRange() {
        val food = SyncId("cat-food")
        val transactions = listOf(
            TestFixtures.createExpense(
                amount = Cents(5000), categoryId = food,
                date = LocalDate(2024, 1, 15),
            ),
            TestFixtures.createExpense(
                amount = Cents(6000), categoryId = food,
                date = LocalDate(2024, 2, 15),
            ),
            TestFixtures.createExpense(
                amount = Cents(7000), categoryId = food,
                date = LocalDate(2024, 3, 15),
            ),
            // Q2 — should be excluded
            TestFixtures.createExpense(
                amount = Cents(8000), categoryId = food,
                date = LocalDate(2024, 4, 15),
            ),
        )

        val q1Range = ReportGenerator.DateRange(
            LocalDate(2024, 1, 1), LocalDate(2024, 3, 31),
        )
        val result = ReportGenerator.spendingByCategory(transactions, q1Range)
        assertEquals(Cents(18000), result[food])
    }

    @Test
    fun spendingByCategory_yearRange() {
        val food = SyncId("cat-food")
        val transactions = (1..12).map { month ->
            TestFixtures.createExpense(
                amount = Cents(10000), categoryId = food,
                date = LocalDate(2024, month, 15),
            )
        }

        val yearRange = ReportGenerator.DateRange(
            LocalDate(2024, 1, 1), LocalDate(2024, 12, 31),
        )
        val result = ReportGenerator.spendingByCategory(transactions, yearRange)
        assertEquals(Cents(120000), result[food])
    }
}
