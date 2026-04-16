// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.analytics

import kotlinx.datetime.Instant
import kotlin.test.*

/**
 * Tests for [AnalyticsEvent] sealed hierarchy — verifies event names,
 * property construction, and that no PII leaks into properties.
 */
class AnalyticsEventTest {

    private val fixedInstant = Instant.parse("2024-06-15T12:00:00Z")

    // ── AppOpened ────────────────────────────────────────────────────

    @Test
    fun appOpenedEventName() {
        val event = AnalyticsEvent.AppOpened(
            timestamp = fixedInstant,
            platform = "android",
            appVersion = "1.0.0",
        )
        assertEquals("app_opened", event.name)
    }

    @Test
    fun appOpenedProperties() {
        val event = AnalyticsEvent.AppOpened(
            timestamp = fixedInstant,
            platform = "ios",
            appVersion = "2.1.0",
        )
        assertEquals("ios", event.properties["platform"])
        assertEquals("2.1.0", event.properties["app_version"])
        assertEquals(2, event.properties.size)
    }

    // ── ScreenViewed ─────────────────────────────────────────────────

    @Test
    fun screenViewedEventName() {
        val event = AnalyticsEvent.ScreenViewed(
            timestamp = fixedInstant,
            screenName = "dashboard",
        )
        assertEquals("screen_viewed", event.name)
        assertEquals("dashboard", event.properties["screen_name"])
    }

    // ── TransactionCreated ───────────────────────────────────────────

    @Test
    fun transactionCreatedProperties() {
        val event = AnalyticsEvent.TransactionCreated(
            timestamp = fixedInstant,
            transactionType = "EXPENSE",
            hasCategoryAssigned = true,
            hasNotes = false,
            hasTags = true,
        )
        assertEquals("transaction_created", event.name)
        assertEquals("EXPENSE", event.properties["transaction_type"])
        assertEquals("true", event.properties["has_category"])
        assertEquals("false", event.properties["has_notes"])
        assertEquals("true", event.properties["has_tags"])
        assertEquals(4, event.properties.size)
    }

    @Test
    fun transactionCreatedTimestamp() {
        val event = AnalyticsEvent.TransactionCreated(
            timestamp = fixedInstant,
            transactionType = "INCOME",
            hasCategoryAssigned = false,
            hasNotes = false,
            hasTags = false,
        )
        assertEquals(fixedInstant, event.timestamp)
    }

    // ── TransactionUpdated ───────────────────────────────────────────

    @Test
    fun transactionUpdatedEventName() {
        val event = AnalyticsEvent.TransactionUpdated(
            timestamp = fixedInstant,
            transactionType = "TRANSFER",
            fieldsChanged = 3,
        )
        assertEquals("transaction_updated", event.name)
        assertEquals("3", event.properties["fields_changed"])
    }

    // ── TransactionDeleted ───────────────────────────────────────────

    @Test
    fun transactionDeletedEventName() {
        val event = AnalyticsEvent.TransactionDeleted(
            timestamp = fixedInstant,
            transactionType = "EXPENSE",
        )
        assertEquals("transaction_deleted", event.name)
        assertEquals("EXPENSE", event.properties["transaction_type"])
    }

    // ── BudgetCreated ────────────────────────────────────────────────

    @Test
    fun budgetCreatedProperties() {
        val event = AnalyticsEvent.BudgetCreated(
            timestamp = fixedInstant,
            period = "MONTHLY",
            isRollover = true,
        )
        assertEquals("budget_created", event.name)
        assertEquals("MONTHLY", event.properties["period"])
        assertEquals("true", event.properties["is_rollover"])
    }

    // ── BudgetExceeded ───────────────────────────────────────────────

    @Test
    fun budgetExceededProperties() {
        val event = AnalyticsEvent.BudgetExceeded(
            timestamp = fixedInstant,
            utilizationPercent = 115,
        )
        assertEquals("budget_exceeded", event.name)
        assertEquals("115", event.properties["utilization_percent"])
    }

    // ── BudgetThresholdReached ───────────────────────────────────────

    @Test
    fun budgetThresholdReachedProperties() {
        val event = AnalyticsEvent.BudgetThresholdReached(
            timestamp = fixedInstant,
            thresholdPercent = 80,
        )
        assertEquals("budget_threshold_reached", event.name)
        assertEquals("80", event.properties["threshold_percent"])
    }

    // ── GoalCreated ──────────────────────────────────────────────────

    @Test
    fun goalCreatedProperties() {
        val event = AnalyticsEvent.GoalCreated(
            timestamp = fixedInstant,
            hasTargetDate = true,
            hasLinkedAccount = false,
        )
        assertEquals("goal_created", event.name)
        assertEquals("true", event.properties["has_target_date"])
        assertEquals("false", event.properties["has_linked_account"])
    }

    // ── GoalCompleted ────────────────────────────────────────────────

    @Test
    fun goalCompletedWithDays() {
        val event = AnalyticsEvent.GoalCompleted(
            timestamp = fixedInstant,
            daysToComplete = 90,
        )
        assertEquals("goal_completed", event.name)
        assertEquals("90", event.properties["days_to_complete"])
    }

    @Test
    fun goalCompletedWithoutDays() {
        val event = AnalyticsEvent.GoalCompleted(
            timestamp = fixedInstant,
            daysToComplete = null,
        )
        assertEquals("goal_completed", event.name)
        assertFalse(event.properties.containsKey("days_to_complete"))
        assertTrue(event.properties.isEmpty())
    }

    // ── SyncCompleted ────────────────────────────────────────────────

    @Test
    fun syncCompletedProperties() {
        val event = AnalyticsEvent.SyncCompleted(
            timestamp = fixedInstant,
            durationMs = 1500,
            recordCount = 42,
            success = true,
            syncType = "delta",
        )
        assertEquals("sync_completed", event.name)
        assertEquals("1500", event.properties["duration_ms"])
        assertEquals("42", event.properties["record_count"])
        assertEquals("true", event.properties["success"])
        assertEquals("delta", event.properties["sync_type"])
    }

    // ── SyncConflictResolved ─────────────────────────────────────────

    @Test
    fun syncConflictResolvedProperties() {
        val event = AnalyticsEvent.SyncConflictResolved(
            timestamp = fixedInstant,
            resolutionStrategy = "server_wins",
            entityType = "transaction",
        )
        assertEquals("sync_conflict_resolved", event.name)
        assertEquals("server_wins", event.properties["resolution_strategy"])
        assertEquals("transaction", event.properties["entity_type"])
    }

    // ── DataExported ─────────────────────────────────────────────────

    @Test
    fun dataExportedProperties() {
        val event = AnalyticsEvent.DataExported(
            timestamp = fixedInstant,
            format = "json",
            recordCount = 150,
        )
        assertEquals("data_exported", event.name)
        assertEquals("json", event.properties["format"])
        assertEquals("150", event.properties["record_count"])
    }

    // ── DataImported ─────────────────────────────────────────────────

    @Test
    fun dataImportedProperties() {
        val event = AnalyticsEvent.DataImported(
            timestamp = fixedInstant,
            format = "csv",
            recordCount = 200,
            success = false,
        )
        assertEquals("data_imported", event.name)
        assertEquals("csv", event.properties["format"])
        assertEquals("200", event.properties["record_count"])
        assertEquals("false", event.properties["success"])
    }

    // ── AccountCreated ───────────────────────────────────────────────

    @Test
    fun accountCreatedProperties() {
        val event = AnalyticsEvent.AccountCreated(
            timestamp = fixedInstant,
            accountType = "CHECKING",
            currencyCode = "USD",
        )
        assertEquals("account_created", event.name)
        assertEquals("CHECKING", event.properties["account_type"])
        assertEquals("USD", event.properties["currency_code"])
    }

    // ── FeatureAdopted ───────────────────────────────────────────────

    @Test
    fun featureAdoptedProperties() {
        val event = AnalyticsEvent.FeatureAdopted(
            timestamp = fixedInstant,
            featureKey = KpiMetrics.FEATURE_FIRST_BUDGET,
        )
        assertEquals("feature_adopted", event.name)
        assertEquals("first_budget", event.properties["feature_key"])
    }

    // ── ErrorOccurred ────────────────────────────────────────────────

    @Test
    fun errorOccurredProperties() {
        val event = AnalyticsEvent.ErrorOccurred(
            timestamp = fixedInstant,
            errorCode = "SYNC_TIMEOUT",
            screen = "dashboard",
        )
        assertEquals("error_occurred", event.name)
        assertEquals("SYNC_TIMEOUT", event.properties["error_code"])
        assertEquals("dashboard", event.properties["screen"])
    }

    // ── All events have unique names ─────────────────────────────────

    @Test
    fun allEventNamesAreUnique() {
        val events = listOf(
            AnalyticsEvent.AppOpened(fixedInstant, "test", "1.0"),
            AnalyticsEvent.ScreenViewed(fixedInstant, "test"),
            AnalyticsEvent.TransactionCreated(fixedInstant, "E", true, false, false),
            AnalyticsEvent.TransactionUpdated(fixedInstant, "E", 1),
            AnalyticsEvent.TransactionDeleted(fixedInstant, "E"),
            AnalyticsEvent.BudgetCreated(fixedInstant, "M", false),
            AnalyticsEvent.BudgetExceeded(fixedInstant, 100),
            AnalyticsEvent.BudgetThresholdReached(fixedInstant, 80),
            AnalyticsEvent.GoalCreated(fixedInstant, false, false),
            AnalyticsEvent.GoalCompleted(fixedInstant, null),
            AnalyticsEvent.SyncCompleted(fixedInstant, 0, 0, true, "full"),
            AnalyticsEvent.SyncConflictResolved(fixedInstant, "s", "t"),
            AnalyticsEvent.DataExported(fixedInstant, "json", 0),
            AnalyticsEvent.DataImported(fixedInstant, "csv", 0, true),
            AnalyticsEvent.AccountCreated(fixedInstant, "C", "USD"),
            AnalyticsEvent.FeatureAdopted(fixedInstant, "f"),
            AnalyticsEvent.ErrorOccurred(fixedInstant, "E", "s"),
        )
        val names = events.map { it.name }
        assertEquals(names.size, names.toSet().size, "Duplicate event names found: ${names.groupBy { it }.filter { it.value.size > 1 }.keys}")
    }

    // ── Event names are snake_case ───────────────────────────────────

    @Test
    fun allEventNamesAreSnakeCase() {
        val events = listOf(
            AnalyticsEvent.AppOpened(fixedInstant, "test", "1.0"),
            AnalyticsEvent.ScreenViewed(fixedInstant, "test"),
            AnalyticsEvent.TransactionCreated(fixedInstant, "E", true, false, false),
            AnalyticsEvent.TransactionUpdated(fixedInstant, "E", 1),
            AnalyticsEvent.TransactionDeleted(fixedInstant, "E"),
            AnalyticsEvent.BudgetCreated(fixedInstant, "M", false),
            AnalyticsEvent.BudgetExceeded(fixedInstant, 100),
            AnalyticsEvent.BudgetThresholdReached(fixedInstant, 80),
            AnalyticsEvent.GoalCreated(fixedInstant, false, false),
            AnalyticsEvent.GoalCompleted(fixedInstant, null),
            AnalyticsEvent.SyncCompleted(fixedInstant, 0, 0, true, "full"),
            AnalyticsEvent.SyncConflictResolved(fixedInstant, "s", "t"),
            AnalyticsEvent.DataExported(fixedInstant, "json", 0),
            AnalyticsEvent.DataImported(fixedInstant, "csv", 0, true),
            AnalyticsEvent.AccountCreated(fixedInstant, "C", "USD"),
            AnalyticsEvent.FeatureAdopted(fixedInstant, "f"),
            AnalyticsEvent.ErrorOccurred(fixedInstant, "E", "s"),
        )
        val snakeCaseRegex = Regex("^[a-z][a-z0-9_]*$")
        for (event in events) {
            assertTrue(
                snakeCaseRegex.matches(event.name),
                "Event name '${event.name}' is not valid snake_case",
            )
        }
    }
}
