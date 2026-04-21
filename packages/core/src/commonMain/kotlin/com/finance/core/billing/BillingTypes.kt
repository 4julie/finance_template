// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.billing

import com.finance.models.types.Cents
import com.finance.models.types.Currency
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import kotlinx.serialization.Serializable

/**
 * Subscription tier representing the user's access level.
 *
 * Ordinal order reflects tier rank — higher ordinal = higher tier.
 * Used by [SubscriptionManager] to resolve plan → tier mapping and
 * to compare tiers for upgrade/downgrade decisions.
 */
@Serializable
enum class Tier {
    /** Free tier with basic functionality. */
    FREE,

    /** Plus tier with expanded limits and analytics. */
    PLUS,

    /** Premium tier with all individual features. */
    PREMIUM,

    /** Family tier with premium + multi-member household. */
    FAMILY,
}

/**
 * Subscription plan identifier.
 */
@Serializable
enum class PlanId {
    FREE,
    PLUS_MONTHLY,
    PLUS_YEARLY,
    PREMIUM_MONTHLY,
    PREMIUM_YEARLY,
    FAMILY_MONTHLY,
    FAMILY_YEARLY,
}

/**
 * Billing interval for subscription plans.
 */
@Serializable
enum class BillingInterval {
    MONTHLY,
    YEARLY,
}

/**
 * Platform where the subscription was purchased.
 * Determines which IAP/billing API to interact with.
 */
@Serializable
enum class PurchasePlatform {
    APPLE,
    GOOGLE,
    STRIPE,
}

/**
 * Current status of a subscription.
 */
@Serializable
enum class SubscriptionStatus {
    /** Active and in good standing. */
    ACTIVE,

    /** Active but will not renew (user cancelled). */
    CANCELLED,

    /** Payment failed, in grace/retry period. */
    PAST_DUE,

    /** Grace period expired, access revoked. */
    EXPIRED,

    /** Currently in a free trial. */
    TRIALING,

    /** Paused by the user (Google Play feature). */
    PAUSED,
}

/**
 * A subscription plan definition with pricing.
 *
 * All monetary values use [Cents] (Long-backed).
 */
@Serializable
data class SubscriptionPlan(
    val planId: PlanId,
    /** Display name (e.g., "Plus Monthly"). */
    val displayName: String,
    /** Price in minor currency units (cents). */
    val priceCents: Cents,
    /** Currency for the price. */
    val currency: Currency,
    /** Billing interval. */
    val interval: BillingInterval,
    /** Free trial duration in days. Null if no trial. */
    val trialDays: Int? = null,
    /** Platform-specific product identifier for IAP. */
    val productIds: Map<PurchasePlatform, String> = emptyMap(),
) {
    init {
        require(priceCents.amount >= 0) { "Price cannot be negative" }
    }

    /** Effective monthly price for comparison (yearly ÷ 12). */
    val effectiveMonthlyCents: Cents get() = when (interval) {
        BillingInterval.MONTHLY -> priceCents
        BillingInterval.YEARLY -> Cents(priceCents.amount / 12)
    }

    /** Savings percentage vs monthly plan. Only meaningful for yearly plans. */
    fun savingsVsMonthly(monthlyPlan: SubscriptionPlan): Double {
        require(monthlyPlan.interval == BillingInterval.MONTHLY) {
            "Comparison plan must be monthly"
        }
        val yearlyFromMonthly = monthlyPlan.priceCents.amount * 12
        if (yearlyFromMonthly == 0L) return 0.0
        return ((yearlyFromMonthly - priceCents.amount).toDouble() / yearlyFromMonthly) * 100.0
    }
}

/**
 * The user's active subscription state.
 *
 * This is the **shared truth** consumed by all platforms. Each platform's
 * IAP layer validates purchases and syncs to this model via the backend.
 */
@Serializable
data class SubscriptionState(
    /** Owner user ID. */
    val ownerId: String,
    /** Active plan. */
    val planId: PlanId,
    /** Subscription status. */
    val status: SubscriptionStatus,
    /** Platform where the subscription was purchased. */
    val platform: PurchasePlatform,
    /** When the current billing period started. */
    val currentPeriodStart: Instant,
    /** When the current billing period ends (next renewal or expiry). */
    val currentPeriodEnd: Instant,
    /** Whether the subscription will auto-renew at period end. */
    val autoRenew: Boolean = true,
    /** End of free trial. Null if no trial or trial ended. */
    val trialEnd: Instant? = null,
    /** Date of the last successful payment. */
    val lastPaymentDate: Instant? = null,
    /** When the subscription was initially created. */
    val createdAt: Instant,
    /** Last update timestamp. */
    val updatedAt: Instant,
) {
    /** Whether the user has an active subscription (not free). */
    val isPaid: Boolean get() = planId != PlanId.FREE &&
        (status == SubscriptionStatus.ACTIVE || status == SubscriptionStatus.TRIALING)

    /** Whether the user is in a trial period. */
    val isTrialing: Boolean get() = status == SubscriptionStatus.TRIALING

    /** Whether the subscription requires renewal action. */
    val needsAttention: Boolean get() = status == SubscriptionStatus.PAST_DUE ||
        (status == SubscriptionStatus.CANCELLED && !autoRenew)
}

/**
 * A billing event for subscription lifecycle tracking.
 */
@Serializable
sealed class BillingEvent {
    abstract val timestamp: Instant
    abstract val planId: PlanId

    /** New subscription started. */
    @Serializable
    data class Subscribed(
        override val timestamp: Instant,
        override val planId: PlanId,
        val platform: PurchasePlatform,
        val isTrialStart: Boolean = false,
    ) : BillingEvent()

    /** Subscription renewed. */
    @Serializable
    data class Renewed(
        override val timestamp: Instant,
        override val planId: PlanId,
        val amountCents: Cents,
    ) : BillingEvent()

    /** User cancelled (subscription remains active until period end). */
    @Serializable
    data class Cancelled(
        override val timestamp: Instant,
        override val planId: PlanId,
        val effectiveEnd: Instant,
    ) : BillingEvent()

    /** Subscription plan changed (upgrade or downgrade). */
    @Serializable
    data class PlanChanged(
        override val timestamp: Instant,
        override val planId: PlanId,
        val fromPlanId: PlanId,
    ) : BillingEvent()

    /** Payment failed. */
    @Serializable
    data class PaymentFailed(
        override val timestamp: Instant,
        override val planId: PlanId,
        val retryDate: Instant? = null,
    ) : BillingEvent()

    /** Subscription expired (no longer active). */
    @Serializable
    data class Expired(
        override val timestamp: Instant,
        override val planId: PlanId,
    ) : BillingEvent()
}
