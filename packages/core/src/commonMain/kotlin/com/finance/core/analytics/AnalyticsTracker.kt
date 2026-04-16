// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.analytics

/**
 * Platform-agnostic interface for tracking analytics events.
 *
 * Implementations must:
 * - Gate all tracking behind user consent ([isEnabled]).
 * - Never transmit PII, financial amounts, or account identifiers.
 * - Buffer events locally when offline and flush when connectivity resumes.
 *
 * Each platform app provides a concrete implementation backed by its
 * analytics SDK (e.g., Firebase Analytics on Android/iOS, PostHog on Web).
 *
 * Usage:
 * ```
 * tracker.track(AnalyticsEvent.TransactionCreated(
 *     timestamp = Clock.System.now(),
 *     transactionType = "EXPENSE",
 *     hasCategoryAssigned = true,
 *     hasNotes = false,
 *     hasTags = false,
 * ))
 * ```
 *
 * @see AnalyticsEvent for the event hierarchy
 * @see NoOpAnalyticsTracker for the disabled/no-consent stub
 * @see BufferedAnalyticsTracker for the shared buffered implementation
 */
interface AnalyticsTracker {

    /**
     * Track an analytics event.
     *
     * If [isEnabled] returns false, this call must be a silent no-op.
     * Implementations may buffer events and batch-send them.
     *
     * @param event The analytics event to track.
     */
    fun track(event: AnalyticsEvent)

    /**
     * Set a user property that persists across events.
     *
     * User properties provide segmentation dimensions (e.g., "plan_type",
     * "account_count_bucket"). Values must be anonymous — no PII.
     *
     * If [isEnabled] returns false, this call must be a silent no-op.
     *
     * @param key Property key (snake_case, no PII).
     * @param value Property value (anonymous string).
     */
    fun setUserProperty(key: String, value: String)

    /**
     * Associate a pseudonymous user ID with subsequent events.
     *
     * The ID must be a non-reversible hash or random UUID that cannot
     * be linked back to the user's real identity.
     *
     * @param userId Pseudonymous user identifier, or null to clear.
     */
    fun setUserId(userId: String?)

    /**
     * Whether analytics tracking is currently enabled and consented.
     *
     * When false, [track], [setUserProperty], and [setUserId] must be no-ops.
     */
    fun isEnabled(): Boolean

    /**
     * Flush any buffered events immediately.
     *
     * Called before app backgrounding or sign-out to avoid data loss.
     * No-op if the implementation does not buffer.
     */
    fun flush()
}

/**
 * No-op [AnalyticsTracker] used when analytics is disabled or
 * user consent has not been granted.
 */
object NoOpAnalyticsTracker : AnalyticsTracker {
    override fun track(event: AnalyticsEvent) = Unit
    override fun setUserProperty(key: String, value: String) = Unit
    override fun setUserId(userId: String?) = Unit
    override fun isEnabled(): Boolean = false
    override fun flush() = Unit
}
