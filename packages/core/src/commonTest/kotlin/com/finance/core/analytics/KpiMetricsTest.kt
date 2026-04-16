// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.analytics

import kotlin.test.*

/**
 * Tests for [KpiMetrics] constants and helper functions.
 */
class KpiMetricsTest {

    // ── countToBucket ────────────────────────────────────────────────

    @Test
    fun zeroCountBucketsToZero() {
        assertEquals("0", KpiMetrics.countToBucket(0))
    }

    @Test
    fun negativeCountBucketsToZero() {
        assertEquals("0", KpiMetrics.countToBucket(-5))
    }

    @Test
    fun oneCountBucketsToOneToThree() {
        assertEquals("1-3", KpiMetrics.countToBucket(1))
    }

    @Test
    fun threeCountBucketsToOneToThree() {
        assertEquals("1-3", KpiMetrics.countToBucket(3))
    }

    @Test
    fun fourCountBucketsToFourToTen() {
        assertEquals("4-10", KpiMetrics.countToBucket(4))
    }

    @Test
    fun tenCountBucketsToFourToTen() {
        assertEquals("4-10", KpiMetrics.countToBucket(10))
    }

    @Test
    fun elevenCountBucketsToElevenPlus() {
        assertEquals("11+", KpiMetrics.countToBucket(11))
    }

    @Test
    fun largeCountBucketsToElevenPlus() {
        assertEquals("11+", KpiMetrics.countToBucket(999))
    }

    // ── Constants are non-blank ──────────────────────────────────────

    @Test
    fun featureKeysAreNonBlank() {
        val keys = listOf(
            KpiMetrics.FEATURE_FIRST_TRANSACTION,
            KpiMetrics.FEATURE_FIRST_BUDGET,
            KpiMetrics.FEATURE_FIRST_GOAL,
            KpiMetrics.FEATURE_FIRST_EXPORT,
            KpiMetrics.FEATURE_FIRST_IMPORT,
            KpiMetrics.FEATURE_FIRST_RECURRING,
            KpiMetrics.FEATURE_FIRST_TRANSFER,
        )
        for (key in keys) {
            assertTrue(key.isNotBlank(), "Feature key should not be blank")
        }
    }

    @Test
    fun screenNamesAreNonBlank() {
        val screens = listOf(
            KpiMetrics.SCREEN_DASHBOARD,
            KpiMetrics.SCREEN_TRANSACTIONS,
            KpiMetrics.SCREEN_BUDGETS,
            KpiMetrics.SCREEN_GOALS,
            KpiMetrics.SCREEN_ACCOUNTS,
            KpiMetrics.SCREEN_SETTINGS,
            KpiMetrics.SCREEN_EXPORT,
            KpiMetrics.SCREEN_IMPORT,
            KpiMetrics.SCREEN_REPORTS,
        )
        for (screen in screens) {
            assertTrue(screen.isNotBlank(), "Screen name should not be blank")
        }
    }

    @Test
    fun userPropertyKeysAreNonBlank() {
        val props = listOf(
            KpiMetrics.PROP_ACCOUNT_COUNT_BUCKET,
            KpiMetrics.PROP_BUDGET_COUNT_BUCKET,
            KpiMetrics.PROP_PRIMARY_CURRENCY,
            KpiMetrics.PROP_PLATFORM,
            KpiMetrics.PROP_APP_VERSION,
        )
        for (prop in props) {
            assertTrue(prop.isNotBlank(), "Property key should not be blank")
        }
    }
}
