// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.billing

import com.finance.models.types.Cents
import com.finance.models.types.Currency

/**
 * Registry of available subscription plans with pricing.
 *
 * Prices are in USD cents. Platform apps convert to local currency
 * using the app store's pricing matrix.
 */
object Plans {

    val PLUS_MONTHLY = SubscriptionPlan(
        planId = PlanId.PLUS_MONTHLY,
        displayName = "Plus Monthly",
        priceCents = Cents(499), // $4.99
        currency = Currency.USD,
        interval = BillingInterval.MONTHLY,
        trialDays = 7,
        productIds = mapOf(
            PurchasePlatform.APPLE to "com.finance.plus.monthly",
            PurchasePlatform.GOOGLE to "plus_monthly",
            PurchasePlatform.STRIPE to "price_plus_monthly",
        ),
    )

    val PLUS_YEARLY = SubscriptionPlan(
        planId = PlanId.PLUS_YEARLY,
        displayName = "Plus Yearly",
        priceCents = Cents(3999), // $39.99
        currency = Currency.USD,
        interval = BillingInterval.YEARLY,
        trialDays = 7,
        productIds = mapOf(
            PurchasePlatform.APPLE to "com.finance.plus.yearly",
            PurchasePlatform.GOOGLE to "plus_yearly",
            PurchasePlatform.STRIPE to "price_plus_yearly",
        ),
    )

    val PREMIUM_MONTHLY = SubscriptionPlan(
        planId = PlanId.PREMIUM_MONTHLY,
        displayName = "Premium Monthly",
        priceCents = Cents(999), // $9.99
        currency = Currency.USD,
        interval = BillingInterval.MONTHLY,
        trialDays = 7,
        productIds = mapOf(
            PurchasePlatform.APPLE to "com.finance.premium.monthly",
            PurchasePlatform.GOOGLE to "premium_monthly",
            PurchasePlatform.STRIPE to "price_premium_monthly",
        ),
    )

    val PREMIUM_YEARLY = SubscriptionPlan(
        planId = PlanId.PREMIUM_YEARLY,
        displayName = "Premium Yearly",
        priceCents = Cents(7999), // $79.99
        currency = Currency.USD,
        interval = BillingInterval.YEARLY,
        trialDays = 7,
        productIds = mapOf(
            PurchasePlatform.APPLE to "com.finance.premium.yearly",
            PurchasePlatform.GOOGLE to "premium_yearly",
            PurchasePlatform.STRIPE to "price_premium_yearly",
        ),
    )

    val FAMILY_MONTHLY = SubscriptionPlan(
        planId = PlanId.FAMILY_MONTHLY,
        displayName = "Family Monthly",
        priceCents = Cents(1499), // $14.99
        currency = Currency.USD,
        interval = BillingInterval.MONTHLY,
        trialDays = 14,
        productIds = mapOf(
            PurchasePlatform.APPLE to "com.finance.family.monthly",
            PurchasePlatform.GOOGLE to "family_monthly",
            PurchasePlatform.STRIPE to "price_family_monthly",
        ),
    )

    val FAMILY_YEARLY = SubscriptionPlan(
        planId = PlanId.FAMILY_YEARLY,
        displayName = "Family Yearly",
        priceCents = Cents(11999), // $119.99
        currency = Currency.USD,
        interval = BillingInterval.YEARLY,
        trialDays = 14,
        productIds = mapOf(
            PurchasePlatform.APPLE to "com.finance.family.yearly",
            PurchasePlatform.GOOGLE to "family_yearly",
            PurchasePlatform.STRIPE to "price_family_yearly",
        ),
    )

    /** All available paid plans. */
    val ALL: List<SubscriptionPlan> = listOf(
        PLUS_MONTHLY, PLUS_YEARLY,
        PREMIUM_MONTHLY, PREMIUM_YEARLY,
        FAMILY_MONTHLY, FAMILY_YEARLY,
    )

    /** Lookup a plan by its [PlanId]. Returns null for [PlanId.FREE]. */
    fun byId(planId: PlanId): SubscriptionPlan? = ALL.find { it.planId == planId }

    /** Group plans by tier for pricing page display. */
    fun groupedByTier(): Map<String, List<SubscriptionPlan>> = mapOf(
        "Plus" to listOf(PLUS_MONTHLY, PLUS_YEARLY),
        "Premium" to listOf(PREMIUM_MONTHLY, PREMIUM_YEARLY),
        "Family" to listOf(FAMILY_MONTHLY, FAMILY_YEARLY),
    )
}
