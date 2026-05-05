// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.multicurrency

import kotlinx.serialization.Serializable

/**
 * Comprehensive ISO 4217 currency catalog with display metadata.
 *
 * Provides 30+ currency definitions including symbol, name, decimal places,
 * and flag emoji for UI rendering. This is the authoritative currency
 * reference for the Finance app — all formatting and conversion logic
 * derives currency metadata from this catalog.
 *
 * @see CurrencyDefinition for the per-currency data model
 */
object CurrencyCatalog {

    /**
     * Full metadata for a single currency.
     *
     * @property code ISO 4217 3-letter currency code.
     * @property name English display name.
     * @property symbol Currency symbol for compact display.
     * @property decimalPlaces Number of minor-unit digits (e.g., 2 for USD cents, 0 for JPY).
     * @property flagEmoji Unicode flag emoji for the currency's primary country.
     */
    @Serializable
    data class CurrencyDefinition(
        val code: String,
        val name: String,
        val symbol: String,
        val decimalPlaces: Int,
        val flagEmoji: String,
    )

    /** All supported currencies, keyed by ISO 4217 code. */
    val all: Map<String, CurrencyDefinition> = listOf(
        CurrencyDefinition("USD", "US Dollar", "$", 2, "\uD83C\uDDFA\uD83C\uDDF8"),
        CurrencyDefinition("EUR", "Euro", "€", 2, "\uD83C\uDDEA\uD83C\uDDFA"),
        CurrencyDefinition("GBP", "British Pound", "£", 2, "\uD83C\uDDEC\uD83C\uDDE7"),
        CurrencyDefinition("JPY", "Japanese Yen", "¥", 0, "\uD83C\uDDEF\uD83C\uDDF5"),
        CurrencyDefinition("CAD", "Canadian Dollar", "CA$", 2, "\uD83C\uDDE8\uD83C\uDDE6"),
        CurrencyDefinition("AUD", "Australian Dollar", "A$", 2, "\uD83C\uDDE6\uD83C\uDDFA"),
        CurrencyDefinition("CHF", "Swiss Franc", "CHF", 2, "\uD83C\uDDE8\uD83C\uDDED"),
        CurrencyDefinition("CNY", "Chinese Yuan", "¥", 2, "\uD83C\uDDE8\uD83C\uDDF3"),
        CurrencyDefinition("INR", "Indian Rupee", "₹", 2, "\uD83C\uDDEE\uD83C\uDDF3"),
        CurrencyDefinition("MXN", "Mexican Peso", "MX$", 2, "\uD83C\uDDF2\uD83C\uDDFD"),
        CurrencyDefinition("BRL", "Brazilian Real", "R$", 2, "\uD83C\uDDE7\uD83C\uDDF7"),
        CurrencyDefinition("KRW", "South Korean Won", "₩", 0, "\uD83C\uDDF0\uD83C\uDDF7"),
        CurrencyDefinition("SEK", "Swedish Krona", "kr", 2, "\uD83C\uDDF8\uD83C\uDDEA"),
        CurrencyDefinition("NOK", "Norwegian Krone", "kr", 2, "\uD83C\uDDF3\uD83C\uDDF4"),
        CurrencyDefinition("DKK", "Danish Krone", "kr", 2, "\uD83C\uDDE9\uD83C\uDDF0"),
        CurrencyDefinition("NZD", "New Zealand Dollar", "NZ$", 2, "\uD83C\uDDF3\uD83C\uDDFF"),
        CurrencyDefinition("SGD", "Singapore Dollar", "S$", 2, "\uD83C\uDDF8\uD83C\uDDEC"),
        CurrencyDefinition("HKD", "Hong Kong Dollar", "HK$", 2, "\uD83C\uDDED\uD83C\uDDF0"),
        CurrencyDefinition("ZAR", "South African Rand", "R", 2, "\uD83C\uDDFF\uD83C\uDDE6"),
        CurrencyDefinition("TRY", "Turkish Lira", "₺", 2, "\uD83C\uDDF9\uD83C\uDDF7"),
        CurrencyDefinition("PLN", "Polish Zloty", "zł", 2, "\uD83C\uDDF5\uD83C\uDDF1"),
        CurrencyDefinition("THB", "Thai Baht", "฿", 2, "\uD83C\uDDF9\uD83C\uDDED"),
        CurrencyDefinition("IDR", "Indonesian Rupiah", "Rp", 2, "\uD83C\uDDEE\uD83C\uDDE9"),
        CurrencyDefinition("MYR", "Malaysian Ringgit", "RM", 2, "\uD83C\uDDF2\uD83C\uDDFE"),
        CurrencyDefinition("PHP", "Philippine Peso", "₱", 2, "\uD83C\uDDF5\uD83C\uDDED"),
        CurrencyDefinition("CZK", "Czech Koruna", "Kč", 2, "\uD83C\uDDE8\uD83C\uDDFF"),
        CurrencyDefinition("ILS", "Israeli Shekel", "₪", 2, "\uD83C\uDDEE\uD83C\uDDF1"),
        CurrencyDefinition("CLP", "Chilean Peso", "CL$", 0, "\uD83C\uDDE8\uD83C\uDDF1"),
        CurrencyDefinition("ARS", "Argentine Peso", "AR$", 2, "\uD83C\uDDE6\uD83C\uDDF7"),
        CurrencyDefinition("COP", "Colombian Peso", "CO$", 2, "\uD83C\uDDE8\uD83C\uDDF4"),
        CurrencyDefinition("BHD", "Bahraini Dinar", "BD", 3, "\uD83C\uDDE7\uD83C\uDDED"),
        CurrencyDefinition("KWD", "Kuwaiti Dinar", "KD", 3, "\uD83C\uDDF0\uD83C\uDDFC"),
        CurrencyDefinition("OMR", "Omani Rial", "OMR", 3, "\uD83C\uDDF4\uD83C\uDDF2"),
        CurrencyDefinition("AED", "UAE Dirham", "AED", 2, "\uD83C\uDDE6\uD83C\uDDEA"),
        CurrencyDefinition("SAR", "Saudi Riyal", "SAR", 2, "\uD83C\uDDF8\uD83C\uDDE6"),
        CurrencyDefinition("TWD", "Taiwan Dollar", "NT$", 2, "\uD83C\uDDF9\uD83C\uDDFC"),
        CurrencyDefinition("VND", "Vietnamese Dong", "₫", 0, "\uD83C\uDDFB\uD83C\uDDF3"),
        CurrencyDefinition("RUB", "Russian Ruble", "₽", 2, "\uD83C\uDDF7\uD83C\uDDFA"),
        CurrencyDefinition("EGP", "Egyptian Pound", "E£", 2, "\uD83C\uDDEA\uD83C\uDDEC"),
        CurrencyDefinition("NGN", "Nigerian Naira", "₦", 2, "\uD83C\uDDF3\uD83C\uDDEC"),
    ).associateBy { it.code }

    /** Number of supported currencies. */
    val count: Int get() = all.size

    /**
     * Look up a currency definition by ISO 4217 code.
     *
     * @param code 3-letter ISO 4217 currency code (case-insensitive).
     * @return The [CurrencyDefinition] or `null` if not in the catalog.
     */
    fun get(code: String): CurrencyDefinition? = all[code.uppercase()]

    /**
     * All supported currency codes as a sorted list.
     */
    val codes: List<String> get() = all.keys.sorted()

    /**
     * Search currencies by name, code, or symbol.
     *
     * @param query Search string (case-insensitive).
     * @return Matching currency definitions.
     */
    fun search(query: String): List<CurrencyDefinition> {
        val q = query.lowercase().trim()
        if (q.isEmpty()) return all.values.toList()
        return all.values.filter { def ->
            def.code.lowercase().contains(q) ||
                def.name.lowercase().contains(q) ||
                def.symbol.lowercase().contains(q)
        }
    }
}
