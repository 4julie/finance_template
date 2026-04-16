// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.analytics

import kotlinx.datetime.Instant

/**
 * Sealed hierarchy of analytics events for v1.0 KPI instrumentation.
 *
 * Every event carries a [timestamp] and a [properties] map for structured
 * context. Properties must **never** contain PII, financial amounts, account
 * numbers, or any data that could identify a user. The property map is
 * deliberately `Map<String, String>` — analytics backends expect string
 * key-value pairs and this prevents accidentally attaching complex objects.
 *
 * Events are consumed by [AnalyticsTracker] implementations, which handle
 * consent gating and transport. Platform apps provide concrete trackers
 * backed by Firebase Analytics, Amplitude, PostHog, or similar services.
 *
 * ## Event naming convention
 * Each event has a [name] property that follows the `snake_case` convention
 * expected by most analytics backends (e.g., `"transaction_created"`,
 * `"budget_exceeded"`).
 *
 * ## Adding new events
 * 1. Add a new `data class` subclass to this sealed hierarchy.
 * 2. Override [name] with a unique `snake_case` identifier.
 * 3. Populate [properties] with anonymous metadata only.
 * 4. Add the event to the corresponding test in `AnalyticsEventTest.kt`.
 *
 * @see AnalyticsTracker for the tracking interface
 */
sealed class AnalyticsEvent {
    /** Event name identifier sent to the analytics backend. */
    abstract val name: String

    /** When the event occurred. */
    abstract val timestamp: Instant

    /** Anonymous key-value properties attached to the event. */
    abstract val properties: Map<String, String>

    // ═══════════════════════════════════════════════════════════════════
    //  Session & Navigation
    // ═══════════════════════════════════════════════════════════════════

    /**
     * User opened the app or returned from background.
     *
     * @property platform The client platform (e.g., "ios", "android", "web", "windows").
     * @property appVersion Semantic version string of the running app.
     */
    data class AppOpened(
        override val timestamp: Instant,
        val platform: String,
        val appVersion: String,
    ) : AnalyticsEvent() {
        override val name: String = "app_opened"
        override val properties: Map<String, String> = mapOf(
            "platform" to platform,
            "app_version" to appVersion,
        )
    }

    /**
     * User navigated to a screen.
     *
     * @property screenName Identifier for the screen (e.g., "dashboard", "budget_list").
     */
    data class ScreenViewed(
        override val timestamp: Instant,
        val screenName: String,
    ) : AnalyticsEvent() {
        override val name: String = "screen_viewed"
        override val properties: Map<String, String> = mapOf(
            "screen_name" to screenName,
        )
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Transaction Events
    // ═══════════════════════════════════════════════════════════════════

    /**
     * A new transaction was created.
     *
     * Properties include the transaction type (expense/income/transfer) and
     * whether it was categorised. **Never** include the amount or payee.
     */
    data class TransactionCreated(
        override val timestamp: Instant,
        val transactionType: String,
        val hasCategoryAssigned: Boolean,
        val hasNotes: Boolean,
        val hasTags: Boolean,
    ) : AnalyticsEvent() {
        override val name: String = "transaction_created"
        override val properties: Map<String, String> = mapOf(
            "transaction_type" to transactionType,
            "has_category" to hasCategoryAssigned.toString(),
            "has_notes" to hasNotes.toString(),
            "has_tags" to hasTags.toString(),
        )
    }

    /**
     * A transaction was edited (amount, category, date, etc. changed).
     */
    data class TransactionUpdated(
        override val timestamp: Instant,
        val transactionType: String,
        val fieldsChanged: Int,
    ) : AnalyticsEvent() {
        override val name: String = "transaction_updated"
        override val properties: Map<String, String> = mapOf(
            "transaction_type" to transactionType,
            "fields_changed" to fieldsChanged.toString(),
        )
    }

    /**
     * A transaction was soft-deleted.
     */
    data class TransactionDeleted(
        override val timestamp: Instant,
        val transactionType: String,
    ) : AnalyticsEvent() {
        override val name: String = "transaction_deleted"
        override val properties: Map<String, String> = mapOf(
            "transaction_type" to transactionType,
        )
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Budget Events
    // ═══════════════════════════════════════════════════════════════════

    /**
     * A new budget was created.
     *
     * @property period Budget period type (e.g., "MONTHLY", "WEEKLY").
     * @property isRollover Whether the budget carries unused amounts forward.
     */
    data class BudgetCreated(
        override val timestamp: Instant,
        val period: String,
        val isRollover: Boolean,
    ) : AnalyticsEvent() {
        override val name: String = "budget_created"
        override val properties: Map<String, String> = mapOf(
            "period" to period,
            "is_rollover" to isRollover.toString(),
        )
    }

    /**
     * Budget spending has exceeded the budgeted amount.
     *
     * @property utilizationPercent How far over budget (e.g., 115 = 15% over).
     */
    data class BudgetExceeded(
        override val timestamp: Instant,
        val utilizationPercent: Int,
    ) : AnalyticsEvent() {
        override val name: String = "budget_exceeded"
        override val properties: Map<String, String> = mapOf(
            "utilization_percent" to utilizationPercent.toString(),
        )
    }

    /**
     * Budget spending has reached a warning threshold (e.g., 80%, 90%).
     *
     * @property thresholdPercent The threshold that was crossed.
     */
    data class BudgetThresholdReached(
        override val timestamp: Instant,
        val thresholdPercent: Int,
    ) : AnalyticsEvent() {
        override val name: String = "budget_threshold_reached"
        override val properties: Map<String, String> = mapOf(
            "threshold_percent" to thresholdPercent.toString(),
        )
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Goal Events
    // ═══════════════════════════════════════════════════════════════════

    /**
     * A new savings goal was created.
     *
     * @property hasTargetDate Whether the goal has a deadline.
     * @property hasLinkedAccount Whether the goal is linked to a savings account.
     */
    data class GoalCreated(
        override val timestamp: Instant,
        val hasTargetDate: Boolean,
        val hasLinkedAccount: Boolean,
    ) : AnalyticsEvent() {
        override val name: String = "goal_created"
        override val properties: Map<String, String> = mapOf(
            "has_target_date" to hasTargetDate.toString(),
            "has_linked_account" to hasLinkedAccount.toString(),
        )
    }

    /**
     * A savings goal was completed (current amount ≥ target amount).
     */
    data class GoalCompleted(
        override val timestamp: Instant,
        val daysToComplete: Int?,
    ) : AnalyticsEvent() {
        override val name: String = "goal_completed"
        override val properties: Map<String, String> = buildMap {
            daysToComplete?.let { put("days_to_complete", it.toString()) }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Sync Events
    // ═══════════════════════════════════════════════════════════════════

    /**
     * A sync operation completed (success or failure).
     *
     * @property durationMs How long the sync took.
     * @property recordCount Number of records synced.
     * @property success Whether the sync succeeded.
     * @property syncType The type of sync ("full", "delta", "push").
     */
    data class SyncCompleted(
        override val timestamp: Instant,
        val durationMs: Long,
        val recordCount: Int,
        val success: Boolean,
        val syncType: String,
    ) : AnalyticsEvent() {
        override val name: String = "sync_completed"
        override val properties: Map<String, String> = mapOf(
            "duration_ms" to durationMs.toString(),
            "record_count" to recordCount.toString(),
            "success" to success.toString(),
            "sync_type" to syncType,
        )
    }

    /**
     * A sync conflict was detected and resolved.
     *
     * @property resolutionStrategy How the conflict was resolved.
     * @property entityType The entity type involved ("transaction", "budget", etc.).
     */
    data class SyncConflictResolved(
        override val timestamp: Instant,
        val resolutionStrategy: String,
        val entityType: String,
    ) : AnalyticsEvent() {
        override val name: String = "sync_conflict_resolved"
        override val properties: Map<String, String> = mapOf(
            "resolution_strategy" to resolutionStrategy,
            "entity_type" to entityType,
        )
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Data Export / Import Events
    // ═══════════════════════════════════════════════════════════════════

    /**
     * User exported financial data.
     *
     * @property format Export format ("json", "csv").
     * @property recordCount Total records exported.
     */
    data class DataExported(
        override val timestamp: Instant,
        val format: String,
        val recordCount: Int,
    ) : AnalyticsEvent() {
        override val name: String = "data_exported"
        override val properties: Map<String, String> = mapOf(
            "format" to format,
            "record_count" to recordCount.toString(),
        )
    }

    /**
     * User imported financial data.
     *
     * @property format Import format ("csv", "ofx", etc.).
     * @property recordCount Total records imported.
     * @property success Whether the import completed without errors.
     */
    data class DataImported(
        override val timestamp: Instant,
        val format: String,
        val recordCount: Int,
        val success: Boolean,
    ) : AnalyticsEvent() {
        override val name: String = "data_imported"
        override val properties: Map<String, String> = mapOf(
            "format" to format,
            "record_count" to recordCount.toString(),
            "success" to success.toString(),
        )
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Account Events
    // ═══════════════════════════════════════════════════════════════════

    /**
     * A new account was created.
     *
     * @property accountType The type of account (e.g., "CHECKING", "SAVINGS").
     * @property currencyCode ISO 4217 currency code.
     */
    data class AccountCreated(
        override val timestamp: Instant,
        val accountType: String,
        val currencyCode: String,
    ) : AnalyticsEvent() {
        override val name: String = "account_created"
        override val properties: Map<String, String> = mapOf(
            "account_type" to accountType,
            "currency_code" to currencyCode,
        )
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Feature Adoption Events
    // ═══════════════════════════════════════════════════════════════════

    /**
     * User engaged with a specific feature for the first time.
     *
     * Used to track v1.0 feature adoption rates.
     *
     * @property featureKey Unique key identifying the feature.
     */
    data class FeatureAdopted(
        override val timestamp: Instant,
        val featureKey: String,
    ) : AnalyticsEvent() {
        override val name: String = "feature_adopted"
        override val properties: Map<String, String> = mapOf(
            "feature_key" to featureKey,
        )
    }

    /**
     * User encountered an error in the application.
     *
     * @property errorCode Machine-readable error code.
     * @property screen Screen where the error occurred.
     */
    data class ErrorOccurred(
        override val timestamp: Instant,
        val errorCode: String,
        val screen: String,
    ) : AnalyticsEvent() {
        override val name: String = "error_occurred"
        override val properties: Map<String, String> = mapOf(
            "error_code" to errorCode,
            "screen" to screen,
        )
    }
}
