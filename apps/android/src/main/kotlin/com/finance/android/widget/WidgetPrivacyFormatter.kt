// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.widget

import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

/** Privacy masking modes shared with the web privacy foundation. */
enum class WidgetMaskingMode { Visible, Bucketed, Percent, Dots }

/** Canonical Android widget formatter for integer-cent monetary values. */
object WidgetPrivacyFormatter {
    private val buckets = listOf(0L, 1L, 10L, 50L, 100L, 500L, 1_000L, 5_000L, 10_000L, 50_000L)

    fun formatAmount(
        cents: Long,
        mode: WidgetMaskingMode = WidgetMaskingMode.Bucketed,
        currencyCode: String = "USD",
        locale: Locale = Locale.getDefault(),
        percentOfCents: Long? = null,
    ): String = when (mode) {
        WidgetMaskingMode.Visible -> currency(locale, currencyCode, cents / 100.0)
        WidgetMaskingMode.Bucketed -> bucket(cents, locale, currencyCode)
        WidgetMaskingMode.Percent -> percentOfCents
            ?.takeIf { it != 0L }
            ?.let { NumberFormat.getPercentInstance(locale).format(cents.toDouble() / it.toDouble()) }
            ?: "Progress only"
        WidgetMaskingMode.Dots -> "•••"
    }

    private fun currency(locale: Locale, currencyCode: String, amount: Double): String =
        NumberFormat.getCurrencyInstance(locale).apply {
            currency = Currency.getInstance(currencyCode)
        }.format(amount)

    private fun bucket(cents: Long, locale: Locale, currencyCode: String): String {
        val absMajor = kotlin.math.abs(cents) / 100
        if (absMajor == 0L) return currency(locale, currencyCode, 0.0).substringBeforeLast(".")
        val sign = if (cents < 0) "-" else ""
        val max = buckets.firstOrNull { absMajor <= it && it > 0L } ?: buckets.last()
        val min = buckets.getOrElse((buckets.indexOf(max) - 1).coerceAtLeast(0)) { 0L }
        return "$sign${compact(min)}–${compact(max)}"
    }

    private fun compact(value: Long): String = when {
        value >= 1_000 -> "$${value / 1_000}K"
        else -> "$$value"
    }
}
