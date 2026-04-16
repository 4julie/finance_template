// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.analytics

/**
 * v1.0 Key Performance Indicator (KPI) definitions.
 *
 * These constants define the feature keys and property names used
 * throughout the analytics instrumentation. Centralising them prevents
 * typos and makes it easy to search for all usage sites.
 *
 * ## KPI Categories
 *
 * | Category        | Metric                            | Event                          |
 * |-----------------|-----------------------------------|--------------------------------|
 * | Engagement      | DAU / MAU                         | `app_opened`                   |
 * | Feature Adopt.  | % users creating budgets          | `budget_created`               |
 * | Feature Adopt.  | % users setting goals             | `goal_created`                 |
 * | Feature Adopt.  | % users using transfers           | `transaction_created` (TRANSFER) |
 * | Data Health     | Sync success rate                 | `sync_completed`               |
 * | Data Health     | Average sync latency              | `sync_completed`               |
 * | Retention       | Feature first-use                 | `feature_adopted`              |
 * | Errors          | Client error rate                 | `error_occurred`               |
 */
object KpiMetrics {

    // ── Feature keys for FeatureAdopted events ────────────────────────

    /** First transaction created by the user. */
    const val FEATURE_FIRST_TRANSACTION = "first_transaction"

    /** First budget created by the user. */
    const val FEATURE_FIRST_BUDGET = "first_budget"

    /** First savings goal created by the user. */
    const val FEATURE_FIRST_GOAL = "first_goal"

    /** First data export performed by the user. */
    const val FEATURE_FIRST_EXPORT = "first_export"

    /** First data import performed by the user. */
    const val FEATURE_FIRST_IMPORT = "first_import"

    /** First recurring transaction rule set up by the user. */
    const val FEATURE_FIRST_RECURRING = "first_recurring"

    /** First account transfer created by the user. */
    const val FEATURE_FIRST_TRANSFER = "first_transfer"

    // ── User property keys ────────────────────────────────────────────

    /** Number of active accounts (bucketed: "0", "1-3", "4-10", "11+"). */
    const val PROP_ACCOUNT_COUNT_BUCKET = "account_count_bucket"

    /** Number of active budgets (bucketed: "0", "1-3", "4-10", "11+"). */
    const val PROP_BUDGET_COUNT_BUCKET = "budget_count_bucket"

    /** Primary currency code (e.g., "USD", "EUR"). */
    const val PROP_PRIMARY_CURRENCY = "primary_currency"

    /** Client platform (e.g., "ios", "android", "web", "windows"). */
    const val PROP_PLATFORM = "platform"

    /** App version (e.g., "1.0.0"). */
    const val PROP_APP_VERSION = "app_version"

    // ── Screen names ──────────────────────────────────────────────────

    const val SCREEN_DASHBOARD = "dashboard"
    const val SCREEN_TRANSACTIONS = "transactions"
    const val SCREEN_BUDGETS = "budgets"
    const val SCREEN_GOALS = "goals"
    const val SCREEN_ACCOUNTS = "accounts"
    const val SCREEN_SETTINGS = "settings"
    const val SCREEN_EXPORT = "export"
    const val SCREEN_IMPORT = "import"
    const val SCREEN_REPORTS = "reports"

    // ── Bucket helpers ────────────────────────────────────────────────

    /**
     * Converts a count to a bucketed string for user properties.
     *
     * Buckets: "0", "1-3", "4-10", "11+"
     */
    fun countToBucket(count: Int): String = when {
        count <= 0 -> "0"
        count <= 3 -> "1-3"
        count <= 10 -> "4-10"
        else -> "11+"
    }
}
