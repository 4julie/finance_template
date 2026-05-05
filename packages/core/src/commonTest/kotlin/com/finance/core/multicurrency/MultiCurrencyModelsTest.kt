// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.multicurrency

import com.finance.models.types.Cents
import com.finance.models.types.Currency
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class MultiCurrencyModelsTest {

    private val now: Instant = Clock.System.now()

    // ═════════════════════════════════════════════════════════════════
    // Currency Catalog
    // ═════════════════════════════════════════════════════════════════

    @Test
    fun catalog_hasAtLeast30Currencies() {
        assertTrue(CurrencyCatalog.count >= 30, "Expected 30+ currencies, got ${CurrencyCatalog.count}")
    }

    @Test
    fun catalog_lookupByCode() {
        val usd = CurrencyCatalog.get("USD")
        assertNotNull(usd)
        assertEquals("US Dollar", usd.name)
        assertEquals("$", usd.symbol)
        assertEquals(2, usd.decimalPlaces)
    }

    @Test
    fun catalog_lookupCaseInsensitive() {
        assertNotNull(CurrencyCatalog.get("usd"))
        assertNotNull(CurrencyCatalog.get("Eur"))
    }

    @Test
    fun catalog_returnsNullForUnknown() {
        assertNull(CurrencyCatalog.get("XYZ"))
    }

    @Test
    fun catalog_zeroDecimalCurrencies() {
        val jpy = CurrencyCatalog.get("JPY")
        assertNotNull(jpy)
        assertEquals(0, jpy.decimalPlaces)
    }

    @Test
    fun catalog_threeDecimalCurrencies() {
        val bhd = CurrencyCatalog.get("BHD")
        assertNotNull(bhd)
        assertEquals(3, bhd.decimalPlaces)
    }

    @Test
    fun catalog_searchByName() {
        val results = CurrencyCatalog.search("dollar")
        assertTrue(results.isNotEmpty())
        assertTrue(results.any { it.code == "USD" })
    }

    @Test
    fun catalog_searchByCode() {
        val results = CurrencyCatalog.search("EUR")
        assertTrue(results.isNotEmpty())
        assertEquals("EUR", results[0].code)
    }

    @Test
    fun catalog_searchEmpty_returnsAll() {
        val results = CurrencyCatalog.search("")
        assertEquals(CurrencyCatalog.count, results.size)
    }

    @Test
    fun catalog_allHaveFlagEmoji() {
        CurrencyCatalog.all.values.forEach { def ->
            assertTrue(def.flagEmoji.isNotEmpty(), "Currency ${def.code} missing flag emoji")
        }
    }

    // ═════════════════════════════════════════════════════════════════
    // Account Currency Config
    // ═════════════════════════════════════════════════════════════════

    @Test
    fun accountCurrencyConfig_creation() {
        val config = AccountCurrencyConfig("acc-1", Currency.EUR)
        assertEquals("acc-1", config.accountId)
        assertEquals(Currency.EUR, config.baseCurrency)
    }

    // ═════════════════════════════════════════════════════════════════
    // Transaction Currency Info
    // ═════════════════════════════════════════════════════════════════

    @Test
    fun transactionCurrencyInfo_sameCurrency() {
        val info = TransactionCurrencyInfo(
            originalAmount = Cents(5000L),
            originalCurrency = Currency.USD,
            convertedAmount = Cents(5000L),
            baseCurrency = Currency.USD,
            exchangeRate = 1.0,
            rateTimestamp = now,
        )
        assertTrue(info.isSameCurrency)
    }

    @Test
    fun transactionCurrencyInfo_differentCurrency() {
        val info = TransactionCurrencyInfo(
            originalAmount = Cents(10000L),
            originalCurrency = Currency.EUR,
            convertedAmount = Cents(10850L),
            baseCurrency = Currency.USD,
            exchangeRate = 1.085,
            rateTimestamp = now,
        )
        assertFalse(info.isSameCurrency)
        assertEquals(Cents(10000L), info.originalAmount)
        assertEquals(Cents(10850L), info.convertedAmount)
    }

    // ═════════════════════════════════════════════════════════════════
    // Display Currency Preference
    // ═════════════════════════════════════════════════════════════════

    @Test
    fun displayPreference_defaults() {
        val pref = DisplayCurrencyPreference(Currency.USD)
        assertEquals(Currency.USD, pref.displayCurrency)
        assertTrue(pref.showOriginalAmounts)
    }

    // ═════════════════════════════════════════════════════════════════
    // Multi-Currency Service — Conversion at Entry
    // ═════════════════════════════════════════════════════════════════

    @Test
    fun convertAtEntry_sameCurrency_returnsDirectly() {
        val cache = MultiCurrencyEngine.ExchangeRateCache()
        val result = MultiCurrencyService.convertAtEntry(
            Cents(5000L), Currency.USD, Currency.USD, cache, now,
        )
        assertNotNull(result)
        assertEquals(Cents(5000L), result.convertedAmount)
        assertEquals(1.0, result.rateUsed)
    }

    @Test
    fun convertAtEntry_withRate_converts() {
        val cache = MultiCurrencyEngine.ExchangeRateCache()
        cache.put(Currency.EUR, Currency.USD, 1.085, now)

        val result = MultiCurrencyService.convertAtEntry(
            Cents(10000L), Currency.EUR, Currency.USD, cache, now,
        )
        assertNotNull(result)
        assertEquals(Cents(10850L), result.convertedAmount)
        assertEquals(1.085, result.rateUsed)
    }

    @Test
    fun convertAtEntry_noRate_returnsNull() {
        val cache = MultiCurrencyEngine.ExchangeRateCache()
        val result = MultiCurrencyService.convertAtEntry(
            Cents(5000L), Currency.EUR, Currency.USD, cache, now,
        )
        assertNull(result)
    }

    // ═════════════════════════════════════════════════════════════════
    // Multi-Currency Service — Build Currency Info
    // ═════════════════════════════════════════════════════════════════

    @Test
    fun buildCurrencyInfo_sameCurrency() {
        val info = MultiCurrencyService.buildCurrencyInfo(
            originalAmount = Cents(5000L),
            originalCurrency = Currency.USD,
            accountBaseCurrency = Currency.USD,
            exchangeRate = 1.0,
            rateTimestamp = now,
        )
        assertTrue(info.isSameCurrency)
        assertEquals(Cents(5000L), info.convertedAmount)
    }

    @Test
    fun buildCurrencyInfo_foreignCurrency() {
        val info = MultiCurrencyService.buildCurrencyInfo(
            originalAmount = Cents(10000L),
            originalCurrency = Currency.EUR,
            accountBaseCurrency = Currency.USD,
            exchangeRate = 1.085,
            rateTimestamp = now,
        )
        assertFalse(info.isSameCurrency)
        assertEquals(Currency.EUR, info.originalCurrency)
        assertEquals(Currency.USD, info.baseCurrency)
        assertEquals(Cents(10850L), info.convertedAmount)
    }

    // ═════════════════════════════════════════════════════════════════
    // Multi-Currency Service — Report Aggregation
    // ═════════════════════════════════════════════════════════════════

    @Test
    fun aggregateForReport_singleCurrency() {
        val cache = MultiCurrencyEngine.ExchangeRateCache()
        val amounts = listOf(
            CurrencyAmount(Cents(5000L), Currency.USD),
            CurrencyAmount(Cents(3000L), Currency.USD),
        )

        val result = MultiCurrencyService.aggregateForReport(
            amounts, Currency.USD, cache, now,
        )
        assertNotNull(result)
        assertEquals(Cents(8000L), result.totalInDisplayCurrency)
        assertEquals(1, result.currencyCount)
    }

    @Test
    fun aggregateForReport_multiCurrency() {
        val cache = MultiCurrencyEngine.ExchangeRateCache()
        cache.put(Currency.EUR, Currency.USD, 1.085, now)
        cache.put(Currency.GBP, Currency.USD, 1.27, now)

        val amounts = listOf(
            CurrencyAmount(Cents(10000L), Currency.USD), // $100.00
            CurrencyAmount(Cents(10000L), Currency.EUR), // €100.00 → $108.50
            CurrencyAmount(Cents(10000L), Currency.GBP), // £100.00 → $127.00
        )

        val result = MultiCurrencyService.aggregateForReport(
            amounts, Currency.USD, cache, now,
        )
        assertNotNull(result)
        assertEquals(3, result.currencyCount)
        // Total: $100 + $108.50 + $127 = $335.50 = 33550 cents
        assertEquals(Cents(33550L), result.totalInDisplayCurrency)
    }

    @Test
    fun aggregateForReport_missingRate_returnsNull() {
        val cache = MultiCurrencyEngine.ExchangeRateCache()
        val amounts = listOf(
            CurrencyAmount(Cents(5000L), Currency.USD),
            CurrencyAmount(Cents(3000L), Currency.EUR), // No rate cached
        )

        val result = MultiCurrencyService.aggregateForReport(
            amounts, Currency.USD, cache, now,
        )
        assertNull(result)
    }

    // ═════════════════════════════════════════════════════════════════
    // Locale Currency Formatter
    // ═════════════════════════════════════════════════════════════════

    @Test
    fun formatter_usStyle() {
        val result = LocaleCurrencyFormatter.format(
            Cents(123456L), Currency.USD, LocaleCurrencyFormatter.LocaleConvention.US_UK,
        )
        assertEquals("$1,234.56", result)
    }

    @Test
    fun formatter_europeanStyle() {
        val result = LocaleCurrencyFormatter.format(
            Cents(123456L), Currency.EUR, LocaleCurrencyFormatter.LocaleConvention.EUROPEAN,
        )
        assertEquals("1.234,56 €", result)
    }

    @Test
    fun formatter_swissStyle() {
        val result = LocaleCurrencyFormatter.format(
            Cents(123456L), Currency("CHF"), LocaleCurrencyFormatter.LocaleConvention.SWISS,
        )
        assertEquals("CHF1'234.56", result)
    }

    @Test
    fun formatter_zeroDecimalCurrency() {
        val result = LocaleCurrencyFormatter.format(
            Cents(1235L), Currency.JPY, LocaleCurrencyFormatter.LocaleConvention.US_UK,
        )
        assertEquals("¥1,235", result)
    }

    @Test
    fun formatter_negativeAmount() {
        val result = LocaleCurrencyFormatter.format(
            Cents(-2500L), Currency.USD, LocaleCurrencyFormatter.LocaleConvention.US_UK,
        )
        assertEquals("-$25.00", result)
    }

    @Test
    fun formatter_showSign() {
        val result = LocaleCurrencyFormatter.format(
            Cents(2500L), Currency.USD, showSign = true,
        )
        assertEquals("+$25.00", result)
    }

    @Test
    fun formatter_useCode() {
        val result = LocaleCurrencyFormatter.format(
            Cents(2500L), Currency.USD, useCode = true,
        )
        assertEquals("USD25.00", result)
    }

    @Test
    fun formatter_threeDecimalCurrency() {
        val result = LocaleCurrencyFormatter.format(
            Cents(1234567L), Currency("BHD"), LocaleCurrencyFormatter.LocaleConvention.US_UK,
        )
        assertEquals("BD1,234.567", result)
    }

    @Test
    fun formatter_compact() {
        assertEquals("$1.2K", LocaleCurrencyFormatter.formatCompact(Cents(123400L), Currency.USD))
        assertEquals("$3.5M", LocaleCurrencyFormatter.formatCompact(Cents(350000000L), Currency.USD))
        assertEquals("$500", LocaleCurrencyFormatter.formatCompact(Cents(50000L), Currency.USD))
    }

    @Test
    fun formatter_compactNegative() {
        val result = LocaleCurrencyFormatter.formatCompact(Cents(-250000L), Currency.USD)
        assertEquals("-$2.5K", result)
    }

    // ═════════════════════════════════════════════════════════════════
    // Multi-Currency Report Result
    // ═════════════════════════════════════════════════════════════════

    @Test
    fun reportResult_currencyCount() {
        val result = MultiCurrencyReportResult(
            totalInDisplayCurrency = Cents(33550L),
            displayCurrency = Currency.USD,
            lineItems = listOf(
                ReportLineItem(Cents(10000L), Currency.USD, Cents(10000L), 1.0),
                ReportLineItem(Cents(10000L), Currency.EUR, Cents(10850L), 1.085),
                ReportLineItem(Cents(10000L), Currency.GBP, Cents(12700L), 1.27),
            ),
            hasStaleRates = false,
        )
        assertEquals(3, result.currencyCount)
    }

    // ═════════════════════════════════════════════════════════════════
    // Offline conversion
    // ═════════════════════════════════════════════════════════════════

    @Test
    fun offlineConversion_usesCachedRates() {
        val cache = MultiCurrencyEngine.ExchangeRateCache(maxAgeSeconds = Long.MAX_VALUE / 2)
        val oldTimestamp = Instant.fromEpochSeconds(1000000L)
        cache.put(Currency.EUR, Currency.USD, 1.08, oldTimestamp)

        // Rate was set long ago but cache has very long TTL
        val result = MultiCurrencyService.convertAtEntry(
            Cents(10000L), Currency.EUR, Currency.USD, cache, now,
        )
        assertNotNull(result)
        assertEquals(Cents(10800L), result.convertedAmount)
    }
}
