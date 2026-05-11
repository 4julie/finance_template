// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.multicurrency

import com.finance.models.types.Cents
import com.finance.models.types.Currency
import kotlinx.datetime.Instant
import kotlinx.serialization.Serializable

/**
 * Represents the currency configuration for an account.
 *
 * Each account has a base currency that determines how transactions
 * are stored and displayed by default. Transactions can override
 * the currency if entered in a different one.
 *
 * @property accountId The account's unique identifier.
 * @property baseCurrency The account's base currency (ISO 4217).
 */
@Serializable
data class AccountCurrencyConfig(
    val accountId: String,
    val baseCurrency: Currency,
)

/**
 * A transaction amount with both original and converted currency information.
 *
 * When a transaction is entered in a currency different from the account's
 * base currency, both the original amount and the converted amount are stored.
 * This preserves the exact amount paid while providing a consistent view
 * in the account's base currency.
 *
 * @property originalAmount The amount in the transaction's original currency.
 * @property originalCurrency The currency the transaction was made in.
 * @property convertedAmount The amount converted to the account's base currency.
 * @property baseCurrency The account's base currency.
 * @property exchangeRate The rate used for conversion (original → base).
 * @property rateTimestamp When the exchange rate was captured.
 */
@Serializable
data class TransactionCurrencyInfo(
    val originalAmount: Cents,
    val originalCurrency: Currency,
    val convertedAmount: Cents,
    val baseCurrency: Currency,
    val exchangeRate: Double,
    val rateTimestamp: Instant,
) {
    init {
        require(exchangeRate > 0) { "Exchange rate must be positive, was $exchangeRate" }
    }

    /** `true` when the transaction is in the account's base currency (no conversion). */
    val isSameCurrency: Boolean get() = originalCurrency == baseCurrency
}

/**
 * User's display currency preference.
 *
 * Controls how aggregated financial data is displayed across the app.
 * Individual account views always show in the account's base currency,
 * but dashboard totals and reports use this preference.
 *
 * @property displayCurrency The currency for aggregated displays.
 * @property showOriginalAmounts If `true`, show both original and converted amounts.
 */
@Serializable
data class DisplayCurrencyPreference(
    val displayCurrency: Currency,
    val showOriginalAmounts: Boolean = true,
)

/**
 * Result of converting a transaction amount at entry time.
 *
 * @property convertedAmount The amount in the target (base) currency.
 * @property rateUsed The exchange rate that was applied.
 * @property rateTimestamp When the rate was fetched/cached.
 * @property isOfflineRate `true` if the rate came from the offline cache.
 */
@Serializable
data class ConversionAtEntryResult(
    val convertedAmount: Cents,
    val rateUsed: Double,
    val rateTimestamp: Instant,
    val isOfflineRate: Boolean = false,
)

/**
 * Multi-currency reporting aggregation result.
 *
 * @property totalInDisplayCurrency The sum of all amounts converted to the display currency.
 * @property displayCurrency The target currency for the aggregation.
 * @property lineItems Individual conversion results for each source amount.
 * @property hasStaleRates `true` if any line item used a rate older than the cache TTL.
 */
@Serializable
data class MultiCurrencyReportResult(
    val totalInDisplayCurrency: Cents,
    val displayCurrency: Currency,
    val lineItems: List<ReportLineItem>,
    val hasStaleRates: Boolean,
) {
    /** Number of distinct currencies in the report. */
    val currencyCount: Int get() = lineItems.map { it.sourceCurrency }.distinct().size
}

/**
 * A single line item in a multi-currency report.
 *
 * @property sourceAmount Amount in the original currency.
 * @property sourceCurrency The original currency.
 * @property convertedAmount Amount in the display currency.
 * @property rateUsed Exchange rate applied.
 * @property isStale `true` if the rate is older than the configured cache TTL.
 */
@Serializable
data class ReportLineItem(
    val sourceAmount: Cents,
    val sourceCurrency: Currency,
    val convertedAmount: Cents,
    val rateUsed: Double,
    val isStale: Boolean = false,
)
