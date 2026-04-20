// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.navigation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

/**
 * Unit tests for [Route] definitions and route construction helpers.
 *
 * These tests verify that:
 * - All routes produce valid URI-compatible strings
 * - Parameterized route helpers substitute arguments correctly
 * - Deep link routes contain the expected base URI patterns
 * - No two routes collide
 */
class RouteTest {

    // ── Route uniqueness ────────────────────────────────────────────

    @Test
    fun `all route strings are unique`() {
        val routes = listOf(
            Route.Dashboard.route,
            Route.Accounts.route,
            Route.Transactions.route,
            Route.Budgets.route,
            Route.Goals.route,
            Route.Planning.route,
            Route.Settings.route,
            Route.AccountDetail.route,
            Route.TransactionCreate.route,
            Route.AccountCreate.route,
            Route.BudgetCreate.route,
            Route.GoalCreate.route,
            Route.AuthCallback.route,
            Route.Invite.route,
            Route.AccountEdit.route,
            Route.BudgetEdit.route,
            Route.GoalEdit.route,
            Route.TransactionEdit.route,
            Route.Analytics.route,
            Route.TransactionDetail.route,
        )
        assertEquals(routes.size, routes.toSet().size, "Duplicate route strings detected")
    }

    // ── Parameterized route creation ────────────────────────────────

    @Test
    fun `AccountDetail createRoute substitutes id`() {
        val result = Route.AccountDetail.createRoute("acc-123")
        assertEquals("accounts/acc-123", result)
    }

    @Test
    fun `TransactionCreate createRoute without accountId`() {
        val result = Route.TransactionCreate.createRoute()
        assertEquals("transactions/create", result)
    }

    @Test
    fun `TransactionCreate createRoute with accountId`() {
        val result = Route.TransactionCreate.createRoute("acc-456")
        assertEquals("transactions/create?accountId=acc-456", result)
    }

    @Test
    fun `Invite createRoute substitutes code`() {
        val result = Route.Invite.createRoute("abc-def-ghi")
        assertEquals("invite/abc-def-ghi", result)
    }

    @Test
    fun `AccountEdit createRoute substitutes id`() {
        val result = Route.AccountEdit.createRoute("edit-acc-1")
        assertEquals("account/edit/edit-acc-1", result)
    }

    @Test
    fun `BudgetEdit createRoute substitutes id`() {
        val result = Route.BudgetEdit.createRoute("budget-789")
        assertEquals("budget/edit/budget-789", result)
    }

    @Test
    fun `GoalEdit createRoute substitutes id`() {
        val result = Route.GoalEdit.createRoute("goal-abc")
        assertEquals("goal/edit/goal-abc", result)
    }

    @Test
    fun `TransactionEdit createRoute substitutes id`() {
        val result = Route.TransactionEdit.createRoute("txn-xyz")
        assertEquals("transaction/edit/txn-xyz", result)
    }

    @Test
    fun `TransactionDetail createRoute substitutes id`() {
        val result = Route.TransactionDetail.createRoute("txn-detail-1")
        assertEquals("transaction/txn-detail-1", result)
    }

    // ── Route pattern validation ────────────────────────────────────

    @Test
    fun `parameterized routes contain placeholder braces`() {
        assertTrue(Route.AccountDetail.route.contains("{id}"))
        assertTrue(Route.Invite.route.contains("{code}"))
        assertTrue(Route.AccountEdit.route.contains("{id}"))
        assertTrue(Route.BudgetEdit.route.contains("{id}"))
        assertTrue(Route.GoalEdit.route.contains("{id}"))
        assertTrue(Route.TransactionEdit.route.contains("{id}"))
        assertTrue(Route.TransactionDetail.route.contains("{id}"))
    }

    @Test
    fun `static routes do not contain braces`() {
        val staticRoutes = listOf(
            Route.Dashboard.route,
            Route.Accounts.route,
            Route.Transactions.route,
            Route.Budgets.route,
            Route.Goals.route,
            Route.Planning.route,
            Route.Settings.route,
            Route.AccountCreate.route,
            Route.BudgetCreate.route,
            Route.GoalCreate.route,
            Route.AuthCallback.route,
            Route.Analytics.route,
        )
        staticRoutes.forEach { route ->
            assertTrue(!route.contains("{"), "Static route should not contain '{': $route")
        }
    }

    // ── Deep link patterns ──────────────────────────────────────────

    @Test
    fun `AuthCallback route matches expected pattern`() {
        assertEquals("auth/callback", Route.AuthCallback.route)
    }

    @Test
    fun `Invite route matches expected pattern`() {
        assertEquals("invite/{code}", Route.Invite.route)
    }

    @Test
    fun `TransactionDetail route matches expected pattern`() {
        assertEquals("transaction/{id}", Route.TransactionDetail.route)
    }
}
