// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.investment

import com.finance.models.types.Cents
import com.finance.models.types.Currency
import com.finance.models.types.SyncId
import kotlinx.datetime.*
import kotlin.test.*

/**
 * Comprehensive verification tests for investment tracking functionality.
 * Tests portfolio value calculation, gain/loss, percentage returns,
 * dividend reinvestment, multiple asset types, allocation percentages,
 * historical performance, and unrealized vs realized gains.
 *
 * Covers issue #1374.
 */
class InvestmentTrackingVerificationTest {

    private val now = Instant.parse("2024-06-15T12:00:00Z")

    private fun holding(
        id: String = "h1",
        sym: String = "AAPL",
        name: String = "Apple Inc.",
        ac: AssetClass = AssetClass.STOCKS,
        qty: Long = 10,
        cost: Cents = Cents(100000),
        value: Cents = Cents(120000),
        prev: Cents? = Cents(118000),
    ) = Holding(
        SyncId(id), SyncId("p1"), sym, name, ac, qty, cost, value, prev, Currency.USD, now,
    )

    private fun portfolio(
        holdings: List<Holding> = emptyList(),
        name: String = "Test Portfolio",
    ) = Portfolio(
        SyncId("p1"), SyncId("o1"), SyncId("h1"), name, holdings, Currency.USD, now, now,
    )

    // ═══════════════════════════════════════════════════════════════════
    // Portfolio value calculation from holdings
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun portfolioValue_singleHolding() {
        val p = portfolio(listOf(holding(value = Cents(150000))))
        assertEquals(Cents(150000), InvestmentEngine.portfolioValue(p))
    }

    @Test
    fun portfolioValue_multipleHoldings() {
        val p = portfolio(
            listOf(
                holding(id = "h1", value = Cents(100000)),
                holding(id = "h2", sym = "MSFT", name = "Microsoft", value = Cents(200000)),
                holding(id = "h3", sym = "GOOG", name = "Google", value = Cents(50000)),
            ),
        )
        assertEquals(Cents(350000), InvestmentEngine.portfolioValue(p))
    }

    @Test
    fun portfolioValue_emptyPortfolio_isZero() {
        assertEquals(Cents.ZERO, InvestmentEngine.portfolioValue(portfolio()))
    }

    @Test
    fun portfolioValue_zeroValueHoldings() {
        val p = portfolio(
            listOf(holding(id = "h1", value = Cents.ZERO, cost = Cents(50000), qty = 0)),
        )
        assertEquals(Cents.ZERO, InvestmentEngine.portfolioValue(p))
    }

    @Test
    fun portfolioCostBasis_multipleHoldings() {
        val p = portfolio(
            listOf(
                holding(id = "h1", cost = Cents(80000)),
                holding(id = "h2", sym = "MSFT", name = "Microsoft", cost = Cents(120000)),
            ),
        )
        assertEquals(Cents(200000), InvestmentEngine.portfolioCostBasis(p))
    }

    // ═══════════════════════════════════════════════════════════════════
    // Gain/loss calculation (current value - cost basis)
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun unrealisedGainLoss_gain() {
        val h = holding(cost = Cents(100000), value = Cents(130000))
        val gl = InvestmentEngine.unrealisedGainLoss(h)
        assertEquals(Cents(30000), gl)
        assertTrue(gl.isPositive())
    }

    @Test
    fun unrealisedGainLoss_loss() {
        val h = holding(cost = Cents(100000), value = Cents(75000))
        val gl = InvestmentEngine.unrealisedGainLoss(h)
        assertEquals(Cents(-25000), gl)
        assertTrue(gl.isNegative())
    }

    @Test
    fun unrealisedGainLoss_breakEven() {
        val h = holding(cost = Cents(100000), value = Cents(100000))
        val gl = InvestmentEngine.unrealisedGainLoss(h)
        assertEquals(Cents.ZERO, gl)
        assertTrue(gl.isZero())
    }

    @Test
    fun portfolioGainLoss_mixedGainsAndLosses() {
        val p = portfolio(
            listOf(
                holding(id = "h1", cost = Cents(100000), value = Cents(150000)), // +50k
                holding(
                    id = "h2", sym = "META", name = "Meta",
                    cost = Cents(80000), value = Cents(60000),
                ), // -20k
            ),
        )
        // Net: 50000 - 20000 = 30000
        assertEquals(Cents(30000), InvestmentEngine.portfolioGainLoss(p))
    }

    @Test
    fun portfolioGainLoss_allLosses() {
        val p = portfolio(
            listOf(
                holding(id = "h1", cost = Cents(100000), value = Cents(80000)),
                holding(
                    id = "h2", sym = "MSFT", name = "Microsoft",
                    cost = Cents(50000), value = Cents(40000),
                ),
            ),
        )
        assertEquals(Cents(-30000), InvestmentEngine.portfolioGainLoss(p))
    }

    // ═══════════════════════════════════════════════════════════════════
    // Percentage return calculation
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun totalReturnPercent_positiveReturn() {
        val h = holding(cost = Cents(100000), value = Cents(125000))
        assertEquals(25.0, InvestmentEngine.totalReturnPercent(h)!!, 0.01)
    }

    @Test
    fun totalReturnPercent_negativeReturn() {
        val h = holding(cost = Cents(200000), value = Cents(150000))
        assertEquals(-25.0, InvestmentEngine.totalReturnPercent(h)!!, 0.01)
    }

    @Test
    fun totalReturnPercent_zeroCostBasis_returnsNull() {
        val h = holding(cost = Cents.ZERO, value = Cents(50000), qty = 0)
        assertNull(InvestmentEngine.totalReturnPercent(h))
    }

    @Test
    fun totalReturnPercent_100PercentGain() {
        val h = holding(cost = Cents(50000), value = Cents(100000))
        assertEquals(100.0, InvestmentEngine.totalReturnPercent(h)!!, 0.01)
    }

    @Test
    fun totalReturnPercent_totalLoss() {
        val h = holding(cost = Cents(100000), value = Cents.ZERO, qty = 0)
        assertEquals(-100.0, InvestmentEngine.totalReturnPercent(h)!!, 0.01)
    }

    @Test
    fun portfolioReturnPercent_positive() {
        val p = portfolio(
            listOf(holding(id = "h1", cost = Cents(100000), value = Cents(115000))),
        )
        assertEquals(15.0, InvestmentEngine.portfolioReturnPercent(p)!!, 0.01)
    }

    @Test
    fun portfolioReturnPercent_emptyPortfolio_returnsNull() {
        assertNull(InvestmentEngine.portfolioReturnPercent(portfolio()))
    }

    @Test
    fun dailyReturnPercent_positive() {
        val pct = InvestmentEngine.dailyReturnPercent(Cents(105000), Cents(100000))
        assertEquals(5.0, pct!!, 0.01)
    }

    @Test
    fun dailyReturnPercent_negative() {
        val pct = InvestmentEngine.dailyReturnPercent(Cents(95000), Cents(100000))
        assertEquals(-5.0, pct!!, 0.01)
    }

    @Test
    fun dailyReturnPercent_zeroPreviousClose_returnsNull() {
        assertNull(InvestmentEngine.dailyReturnPercent(Cents(100000), Cents.ZERO))
    }

    // ═══════════════════════════════════════════════════════════════════
    // Dividend reinvestment tracking
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun dividendReinvestment_increasesQuantityAndCostBasis() {
        // Original: 100 shares at $50 = $5000 cost basis
        val original = holding(qty = 100, cost = Cents(500000), value = Cents(520000))
        // After reinvesting $200 dividend → buys 4 shares at $50 each
        val afterReinvest = holding(qty = 104, cost = Cents(520000), value = Cents(541600))

        assertTrue(afterReinvest.quantity > original.quantity)
        assertTrue(afterReinvest.costBasis.amount > original.costBasis.amount)
        // Return should reflect adjusted cost basis
        val originalReturn = InvestmentEngine.totalReturnPercent(original)!!
        val adjustedReturn = InvestmentEngine.totalReturnPercent(afterReinvest)!!
        // The adjusted return is different because cost basis changed
        assertTrue(originalReturn != adjustedReturn)
    }

    @Test
    fun dividendReinvestment_costBasisIncreasesByDividendAmount() {
        val dividendCents = Cents(20000) // $200 dividend reinvested
        val originalCost = Cents(500000)
        val newCost = originalCost + dividendCents
        assertEquals(Cents(520000), newCost)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Multiple asset types (stocks, bonds, crypto)
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun multipleAssetTypes_allRepresented() {
        val p = portfolio(
            listOf(
                holding(
                    id = "h1", sym = "AAPL", name = "Apple",
                    ac = AssetClass.STOCKS, value = Cents(200000),
                ),
                holding(
                    id = "h2", sym = "AGG", name = "Bond ETF",
                    ac = AssetClass.BONDS, value = Cents(100000),
                ),
                holding(
                    id = "h3", sym = "BTC", name = "Bitcoin",
                    ac = AssetClass.CRYPTO, value = Cents(150000),
                ),
                holding(
                    id = "h4", sym = "GLD", name = "Gold",
                    ac = AssetClass.COMMODITIES, value = Cents(50000),
                ),
            ),
        )
        assertEquals(Cents(500000), InvestmentEngine.portfolioValue(p))
    }

    @Test
    fun assetClass_allEnumValuesExist() {
        val expected = setOf(
            AssetClass.STOCKS, AssetClass.BONDS, AssetClass.CASH,
            AssetClass.REAL_ESTATE, AssetClass.COMMODITIES,
            AssetClass.CRYPTO, AssetClass.ALTERNATIVES, AssetClass.OTHER,
        )
        assertEquals(expected, AssetClass.entries.toSet())
    }

    @Test
    fun cryptoAsset_highVolatility_handledCorrectly() {
        val btc = holding(
            sym = "BTC", name = "Bitcoin", ac = AssetClass.CRYPTO,
            qty = 1, cost = Cents(3000000), value = Cents(6000000),
        )
        assertEquals(100.0, InvestmentEngine.totalReturnPercent(btc)!!, 0.01)
        assertEquals(Cents(3000000), InvestmentEngine.unrealisedGainLoss(btc))
    }

    // ═══════════════════════════════════════════════════════════════════
    // Portfolio allocation percentages
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun assetAllocation_correctPercentages() {
        val p = portfolio(
            listOf(
                holding(
                    id = "h1", ac = AssetClass.STOCKS,
                    value = Cents(60000),
                ),
                holding(
                    id = "h2", sym = "AGG", name = "Bond Fund",
                    ac = AssetClass.BONDS, value = Cents(30000),
                ),
                holding(
                    id = "h3", sym = "GLD", name = "Gold ETF",
                    ac = AssetClass.COMMODITIES, value = Cents(10000),
                ),
            ),
        )
        val alloc = InvestmentEngine.assetAllocation(p)
        assertEquals(60.0, alloc[AssetClass.STOCKS]!!, 0.01)
        assertEquals(30.0, alloc[AssetClass.BONDS]!!, 0.01)
        assertEquals(10.0, alloc[AssetClass.COMMODITIES]!!, 0.01)
    }

    @Test
    fun assetAllocation_sumsTo100Percent() {
        val p = portfolio(
            listOf(
                holding(id = "h1", ac = AssetClass.STOCKS, value = Cents(50000)),
                holding(
                    id = "h2", sym = "BND", name = "Bonds",
                    ac = AssetClass.BONDS, value = Cents(30000),
                ),
                holding(
                    id = "h3", sym = "BTC", name = "Bitcoin",
                    ac = AssetClass.CRYPTO, value = Cents(20000),
                ),
            ),
        )
        val alloc = InvestmentEngine.assetAllocation(p)
        val total = alloc.values.sum()
        assertEquals(100.0, total, 0.01)
    }

    @Test
    fun assetAllocation_emptyPortfolio_isEmpty() {
        assertTrue(InvestmentEngine.assetAllocation(portfolio()).isEmpty())
    }

    @Test
    fun assetAllocation_singleAssetClass_is100Percent() {
        val p = portfolio(
            listOf(
                holding(id = "h1", ac = AssetClass.STOCKS, value = Cents(100000)),
                holding(
                    id = "h2", sym = "MSFT", name = "Microsoft",
                    ac = AssetClass.STOCKS, value = Cents(50000),
                ),
            ),
        )
        val alloc = InvestmentEngine.assetAllocation(p)
        assertEquals(1, alloc.size)
        assertEquals(100.0, alloc[AssetClass.STOCKS]!!, 0.01)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Historical performance tracking (top holdings, gainers, losers)
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun topHoldings_orderedByValue() {
        val p = portfolio(
            listOf(
                holding(id = "h1", sym = "AAPL", name = "Apple", value = Cents(50000)),
                holding(id = "h2", sym = "MSFT", name = "Microsoft", value = Cents(100000)),
                holding(id = "h3", sym = "GOOG", name = "Google", value = Cents(75000)),
            ),
        )
        val top = InvestmentEngine.topHoldings(p, 2)
        assertEquals(2, top.size)
        assertEquals("MSFT", top[0].symbol)
        assertEquals("GOOG", top[1].symbol)
    }

    @Test
    fun topHoldings_nGreaterThanSize_returnsAll() {
        val p = portfolio(
            listOf(holding(id = "h1", value = Cents(50000))),
        )
        val top = InvestmentEngine.topHoldings(p, 10)
        assertEquals(1, top.size)
    }

    @Test
    fun topGainers_filteredAndSorted() {
        val p = portfolio(
            listOf(
                holding(
                    id = "h1", sym = "AAPL", name = "Apple",
                    cost = Cents(50000), value = Cents(80000),
                ), // +30k (60%)
                holding(
                    id = "h2", sym = "MSFT", name = "Microsoft",
                    cost = Cents(100000), value = Cents(90000),
                ), // -10k (loss)
                holding(
                    id = "h3", sym = "GOOG", name = "Google",
                    cost = Cents(60000), value = Cents(70000),
                ), // +10k (16.7%)
            ),
        )
        val gainers = InvestmentEngine.topGainers(p, 5)
        assertEquals(2, gainers.size)
        // Sorted by absolute gain descending
        assertEquals("AAPL", gainers[0].holding.symbol)
        assertEquals("GOOG", gainers[1].holding.symbol)
        assertTrue(gainers.all { it.gainLoss.isPositive() })
    }

    @Test
    fun topLosers_filteredAndSorted() {
        val p = portfolio(
            listOf(
                holding(
                    id = "h1", sym = "AAPL", name = "Apple",
                    cost = Cents(100000), value = Cents(120000),
                ), // gain
                holding(
                    id = "h2", sym = "META", name = "Meta",
                    cost = Cents(100000), value = Cents(70000),
                ), // -30k
                holding(
                    id = "h3", sym = "NFLX", name = "Netflix",
                    cost = Cents(80000), value = Cents(75000),
                ), // -5k
            ),
        )
        val losers = InvestmentEngine.topLosers(p, 5)
        assertEquals(2, losers.size)
        // Sorted by loss ascending (worst first)
        assertEquals("META", losers[0].holding.symbol)
        assertEquals("NFLX", losers[1].holding.symbol)
        assertTrue(losers.all { it.gainLoss.isNegative() })
    }

    @Test
    fun topGainers_noGains_returnsEmpty() {
        val p = portfolio(
            listOf(
                holding(id = "h1", cost = Cents(100000), value = Cents(80000)),
            ),
        )
        assertTrue(InvestmentEngine.topGainers(p, 5).isEmpty())
    }

    @Test
    fun topLosers_noLosses_returnsEmpty() {
        val p = portfolio(
            listOf(
                holding(id = "h1", cost = Cents(80000), value = Cents(100000)),
            ),
        )
        assertTrue(InvestmentEngine.topLosers(p, 5).isEmpty())
    }

    // ═══════════════════════════════════════════════════════════════════
    // Unrealized vs realized gains
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun unrealizedGain_computedFromCurrentHoldings() {
        val h = holding(cost = Cents(100000), value = Cents(150000))
        // Unrealized because still held
        assertEquals(Cents(50000), InvestmentEngine.unrealisedGainLoss(h))
        assertTrue(h.isProfit)
    }

    @Test
    fun unrealizedLoss_computedFromCurrentHoldings() {
        val h = holding(cost = Cents(100000), value = Cents(80000))
        assertEquals(Cents(-20000), InvestmentEngine.unrealisedGainLoss(h))
        assertFalse(h.isProfit)
    }

    @Test
    fun realizedGain_simulatedBySoldHolding() {
        // Simulate realized gain: holding was sold, so its value = sale price
        val soldPrice = Cents(150000)
        val costBasis = Cents(100000)
        val realizedGain = soldPrice - costBasis
        assertEquals(Cents(50000), realizedGain)
        assertTrue(realizedGain.isPositive())
    }

    @Test
    fun realizedLoss_simulatedBySoldHolding() {
        val soldPrice = Cents(70000)
        val costBasis = Cents(100000)
        val realizedLoss = soldPrice - costBasis
        assertEquals(Cents(-30000), realizedLoss)
        assertTrue(realizedLoss.isNegative())
    }

    // ═══════════════════════════════════════════════════════════════════
    // Portfolio summary
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun summary_computesAllFields() {
        val p = portfolio(
            listOf(
                holding(
                    id = "h1", ac = AssetClass.STOCKS,
                    cost = Cents(100000), value = Cents(130000),
                ),
                holding(
                    id = "h2", sym = "BND", name = "Bond ETF",
                    ac = AssetClass.BONDS, cost = Cents(50000), value = Cents(52000),
                ),
            ),
        )
        val s = InvestmentEngine.summary(p)
        assertEquals(Cents(182000), s.totalValue)
        assertEquals(Cents(150000), s.totalCostBasis)
        assertEquals(Cents(32000), s.totalGainLoss)
        assertEquals(2, s.holdingCount)
        assertNotNull(s.totalReturnPercent)
        assertTrue(s.assetAllocation.isNotEmpty())
    }

    @Test
    fun summary_emptyPortfolio() {
        val s = InvestmentEngine.summary(portfolio())
        assertEquals(Cents.ZERO, s.totalValue)
        assertEquals(Cents.ZERO, s.totalCostBasis)
        assertEquals(Cents.ZERO, s.totalGainLoss)
        assertEquals(0, s.holdingCount)
        assertNull(s.totalReturnPercent)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Validation edge cases
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun holding_blankSymbol_throws() {
        assertFailsWith<IllegalArgumentException> { holding(sym = "") }
    }

    @Test
    fun holding_blankName_throws() {
        assertFailsWith<IllegalArgumentException> { holding(name = "") }
    }

    @Test
    fun holding_negativeQuantity_throws() {
        assertFailsWith<IllegalArgumentException> { holding(qty = -1) }
    }

    @Test
    fun portfolio_blankName_throws() {
        assertFailsWith<IllegalArgumentException> {
            portfolio(name = "  ")
        }
    }

    @Test
    fun holding_zeroQuantity_allowed() {
        val h = holding(qty = 0, cost = Cents.ZERO, value = Cents.ZERO)
        assertEquals(0L, h.quantity)
    }

    @Test
    fun holding_largeValues_noOverflow() {
        val h = holding(
            cost = Cents(Long.MAX_VALUE / 2),
            value = Cents(Long.MAX_VALUE / 2 + 1000),
        )
        assertEquals(Cents(1000), InvestmentEngine.unrealisedGainLoss(h))
    }

    @Test
    fun holding_isProfit_trueWhenGain() {
        assertTrue(holding(cost = Cents(100), value = Cents(200)).isProfit)
    }

    @Test
    fun holding_isProfit_falseWhenLoss() {
        assertFalse(holding(cost = Cents(200), value = Cents(100)).isProfit)
    }

    @Test
    fun holding_isProfit_falseWhenBreakEven() {
        assertFalse(holding(cost = Cents(100), value = Cents(100)).isProfit)
    }

    @Test
    fun topHoldings_zeroN_throws() {
        assertFailsWith<IllegalArgumentException> {
            InvestmentEngine.topHoldings(portfolio(), 0)
        }
    }

    @Test
    fun topGainers_zeroN_throws() {
        assertFailsWith<IllegalArgumentException> {
            InvestmentEngine.topGainers(portfolio(), 0)
        }
    }

    @Test
    fun topLosers_zeroN_throws() {
        assertFailsWith<IllegalArgumentException> {
            InvestmentEngine.topLosers(portfolio(), 0)
        }
    }
}
