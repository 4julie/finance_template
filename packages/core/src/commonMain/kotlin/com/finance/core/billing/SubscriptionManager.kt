// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.billing

import kotlinx.datetime.*

/**
 * Manages subscription state transitions and tier resolution.
 *
 * Pure commonMain — no platform dependencies. Platform IAP layers
 * (StoreKit, Google Play Billing, Stripe) validate purchases and
 * call into this engine to update shared subscription state.
 *
 * ## State Machine
 *
 * ```
 * FREE ──subscribe──→ TRIALING ──trial-end──→ ACTIVE
 *                                              ↓
 *                        ACTIVE ──cancel──→ CANCELLED ──period-end──→ EXPIRED
 *                          ↓
 *                        ACTIVE ──payment-fail──→ PAST_DUE ──retry-ok──→ ACTIVE
 *                                                    ↓
 *                                              PAST_DUE ──grace-end──→ EXPIRED
 * ```
 */
object SubscriptionManager {

    /** Grace period for payment retries. */
    private const val GRACE_PERIOD_DAYS = 7

    // ── Tier Resolution ──────────────────────────────────────────────

    /**
     * Resolve the effective [Tier] from a [SubscriptionState].
     *
     * Applies grace period logic: a PAST_DUE subscription within
     * grace period retains its tier. Expired/cancelled past period
     * end revert to [Tier.FREE].
     */
    fun resolveTier(
        state: SubscriptionState?,
        now: Instant = Clock.System.now(),
    ): Tier {
        if (state == null) return Tier.FREE

        return when (state.status) {
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING -> planIdToTier(state.planId)

            SubscriptionStatus.CANCELLED -> {
                // Access continues until period end
                if (now < state.currentPeriodEnd) {
                    planIdToTier(state.planId)
                } else {
                    Tier.FREE
                }
            }

            SubscriptionStatus.PAST_DUE -> {
                // Grace period: keep tier for GRACE_PERIOD_DAYS after period end
                val graceEnd = state.currentPeriodEnd.plus(
                    GRACE_PERIOD_DAYS.toLong() * 24 * 60 * 60,
                    DateTimeUnit.SECOND,
                )
                if (now < graceEnd) {
                    planIdToTier(state.planId)
                } else {
                    Tier.FREE
                }
            }

            SubscriptionStatus.EXPIRED -> Tier.FREE
            SubscriptionStatus.PAUSED -> Tier.FREE
        }
    }

    /**
     * Map a [PlanId] to its corresponding [Tier].
     */
    fun planIdToTier(planId: PlanId): Tier = when (planId) {
        PlanId.FREE -> Tier.FREE
        PlanId.PLUS_MONTHLY, PlanId.PLUS_YEARLY -> Tier.PLUS
        PlanId.PREMIUM_MONTHLY, PlanId.PREMIUM_YEARLY -> Tier.PREMIUM
        PlanId.FAMILY_MONTHLY, PlanId.FAMILY_YEARLY -> Tier.FAMILY
    }

    // ── State Transitions ────────────────────────────────────────────

    /**
     * Create a new subscription state from a purchase.
     */
    fun createSubscription(
        ownerId: String,
        planId: PlanId,
        platform: PurchasePlatform,
        now: Instant = Clock.System.now(),
    ): SubscriptionState {
        require(planId != PlanId.FREE) { "Cannot subscribe to FREE plan" }

        val plan = Plans.byId(planId)
        val hasTrial = plan?.trialDays != null && plan.trialDays > 0

        val periodEnd = when (plan?.interval) {
            BillingInterval.MONTHLY -> now.plus(30L * 24 * 60 * 60, DateTimeUnit.SECOND)
            BillingInterval.YEARLY -> now.plus(365L * 24 * 60 * 60, DateTimeUnit.SECOND)
            null -> now.plus(30L * 24 * 60 * 60, DateTimeUnit.SECOND) // default
        }

        val trialEnd = if (hasTrial) {
            now.plus(plan!!.trialDays!!.toLong() * 24 * 60 * 60, DateTimeUnit.SECOND)
        } else null

        return SubscriptionState(
            ownerId = ownerId,
            planId = planId,
            status = if (hasTrial) SubscriptionStatus.TRIALING else SubscriptionStatus.ACTIVE,
            platform = platform,
            currentPeriodStart = now,
            currentPeriodEnd = periodEnd,
            autoRenew = true,
            trialEnd = trialEnd,
            lastPaymentDate = if (!hasTrial) now else null,
            createdAt = now,
            updatedAt = now,
        )
    }

    /**
     * Transition subscription to cancelled (remains active until period end).
     */
    fun cancelSubscription(
        state: SubscriptionState,
        now: Instant = Clock.System.now(),
    ): SubscriptionState {
        require(state.status == SubscriptionStatus.ACTIVE ||
            state.status == SubscriptionStatus.TRIALING) {
            "Can only cancel an active or trialing subscription"
        }

        return state.copy(
            status = SubscriptionStatus.CANCELLED,
            autoRenew = false,
            updatedAt = now,
        )
    }

    /**
     * Transition subscription to renewed (new period).
     */
    fun renewSubscription(
        state: SubscriptionState,
        now: Instant = Clock.System.now(),
    ): SubscriptionState {
        val plan = Plans.byId(state.planId)

        val newPeriodEnd = when (plan?.interval) {
            BillingInterval.MONTHLY -> now.plus(30L * 24 * 60 * 60, DateTimeUnit.SECOND)
            BillingInterval.YEARLY -> now.plus(365L * 24 * 60 * 60, DateTimeUnit.SECOND)
            null -> now.plus(30L * 24 * 60 * 60, DateTimeUnit.SECOND)
        }

        return state.copy(
            status = SubscriptionStatus.ACTIVE,
            currentPeriodStart = now,
            currentPeriodEnd = newPeriodEnd,
            autoRenew = true,
            lastPaymentDate = now,
            updatedAt = now,
        )
    }

    /**
     * Transition subscription after payment failure.
     */
    fun markPaymentFailed(
        state: SubscriptionState,
        now: Instant = Clock.System.now(),
    ): SubscriptionState {
        return state.copy(
            status = SubscriptionStatus.PAST_DUE,
            updatedAt = now,
        )
    }

    /**
     * Expire a subscription (access fully revoked).
     */
    fun expireSubscription(
        state: SubscriptionState,
        now: Instant = Clock.System.now(),
    ): SubscriptionState {
        return state.copy(
            status = SubscriptionStatus.EXPIRED,
            autoRenew = false,
            updatedAt = now,
        )
    }

    /**
     * Change plan (upgrade or downgrade).
     */
    fun changePlan(
        state: SubscriptionState,
        newPlanId: PlanId,
        now: Instant = Clock.System.now(),
    ): SubscriptionState {
        require(newPlanId != PlanId.FREE) { "Use cancelSubscription to downgrade to free" }
        require(state.isPaid) { "Can only change plan on an active subscription" }

        return state.copy(
            planId = newPlanId,
            updatedAt = now,
        )
    }

    // ── Query Helpers ────────────────────────────────────────────────

    /**
     * Check if the subscription is in a state that should show a renewal prompt.
     */
    fun shouldShowRenewalPrompt(
        state: SubscriptionState,
        now: Instant = Clock.System.now(),
    ): Boolean {
        if (state.status != SubscriptionStatus.CANCELLED) return false
        // Show prompt in the last 7 days before period end
        val daysUntilEnd = now.until(state.currentPeriodEnd, DateTimeUnit.SECOND) / (24 * 60 * 60)
        return daysUntilEnd in 0..7
    }

    /**
     * Calculate remaining days in the current billing period.
     */
    fun remainingDays(
        state: SubscriptionState,
        now: Instant = Clock.System.now(),
    ): Int {
        val seconds = now.until(state.currentPeriodEnd, DateTimeUnit.SECOND)
        return (seconds / (24 * 60 * 60)).toInt().coerceAtLeast(0)
    }

    /**
     * Check if a plan change is an upgrade (higher tier).
     */
    fun isUpgrade(currentPlanId: PlanId, newPlanId: PlanId): Boolean {
        return planIdToTier(newPlanId).ordinal > planIdToTier(currentPlanId).ordinal
    }

    /**
     * Check if a plan change is a downgrade (lower tier).
     */
    fun isDowngrade(currentPlanId: PlanId, newPlanId: PlanId): Boolean {
        return planIdToTier(newPlanId).ordinal < planIdToTier(currentPlanId).ordinal
    }
}
