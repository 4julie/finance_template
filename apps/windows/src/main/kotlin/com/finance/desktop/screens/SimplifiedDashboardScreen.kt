// SPDX-License-Identifier: BUSL-1.1

package com.finance.desktop.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.finance.desktop.di.koinGet
import com.finance.desktop.theme.FinanceDesktopTheme
import com.finance.desktop.viewmodel.DashboardViewModel

/** Minimum touch/click target size for cognitive accessibility mode. */
private val MIN_TARGET_SIZE = 48.dp

/**
 * Simplified dashboard with reduced information density for cognitive accessibility.
 *
 * Features:
 * - Large interaction targets (min 48dp)
 * - Reduced animation mode
 * - Simplified navigation with fewer options
 * - High-contrast labels and clear visual hierarchy
 * - Only essential financial info: balance, spending, top budgets
 *
 * Toggle via Settings > Accessibility > Simplified Layout
 */
@Composable
fun SimplifiedDashboardScreen(modifier: Modifier = Modifier) {
    val viewModel = koinGet<DashboardViewModel>()
    val state by viewModel.uiState.collectAsState()

    if (state.isLoading) {
        Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(Modifier.size(64.dp).semantics { contentDescription = "Loading" })
        }
        return
    }

    Column(modifier.fillMaxSize().padding(FinanceDesktopTheme.spacing.xxxl)
        .semantics { contentDescription = "Simplified dashboard" }) {
        Text("Your Finances", style = MaterialTheme.typography.headlineLarge.copy(fontSize = 32.sp),
            fontWeight = FontWeight.Bold, modifier = Modifier.semantics { heading() })
        Spacer(Modifier.height(FinanceDesktopTheme.spacing.xxxl))

        // Large balance card
        SimplifiedInfoCard(Icons.Filled.AccountBalance, "Total Balance", state.netWorthFormatted, "Your total net worth across all accounts")
        Spacer(Modifier.height(FinanceDesktopTheme.spacing.xxl))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(FinanceDesktopTheme.spacing.xxl)) {
            SimplifiedInfoCard(Icons.Filled.Today, "Today", state.todaySpendingFormatted, "Money spent today", Modifier.weight(1f))
            SimplifiedInfoCard(Icons.Filled.CalendarMonth, "This Month", state.monthlySpendingFormatted, "Money spent this month", Modifier.weight(1f))
        }
        Spacer(Modifier.height(FinanceDesktopTheme.spacing.xxxl))

        // Simplified budget section - only top 3
        Text("Budget Status", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold,
            modifier = Modifier.semantics { heading() })
        Spacer(Modifier.height(FinanceDesktopTheme.spacing.lg))

        val topBudgets = state.budgetStatuses.take(3)
        if (topBudgets.isEmpty()) {
            Text("No budgets set up yet", style = MaterialTheme.typography.bodyLarge.copy(fontSize = 18.sp), color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            topBudgets.forEach { budget ->
                SimplifiedBudgetRow(budget.name, budget.spent, budget.limit, budget.utilizationPercent)
                Spacer(Modifier.height(FinanceDesktopTheme.spacing.lg))
            }
        }
    }
}

@Composable
private fun SimplifiedInfoCard(icon: ImageVector, title: String, value: String, description: String, modifier: Modifier = Modifier) {
    ElevatedCard(modifier = modifier.fillMaxWidth().heightIn(min = MIN_TARGET_SIZE * 2)
        .semantics { contentDescription = "${title}: ${value}. ${description}" },
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
        Column(Modifier.padding(FinanceDesktopTheme.spacing.xxl), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, Modifier.size(40.dp), tint = MaterialTheme.colorScheme.onPrimaryContainer)
            Spacer(Modifier.height(FinanceDesktopTheme.spacing.md))
            Text(title, style = MaterialTheme.typography.titleMedium.copy(fontSize = 18.sp), color = MaterialTheme.colorScheme.onPrimaryContainer)
            Spacer(Modifier.height(FinanceDesktopTheme.spacing.sm))
            Text(value, style = MaterialTheme.typography.headlineLarge.copy(fontSize = 36.sp), fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun SimplifiedBudgetRow(name: String, spent: String, limit: String, utilization: Float) {
    val progress = utilization.coerceIn(0f, 1f)
    val color = when { utilization > 0.9f -> MaterialTheme.colorScheme.error; utilization > 0.7f -> MaterialTheme.colorScheme.tertiary; else -> MaterialTheme.colorScheme.primary }
    val status = when { utilization > 1f -> "Over budget"; utilization > 0.9f -> "Almost at limit"; else -> "On track" }

    Card(Modifier.fillMaxWidth().heightIn(min = MIN_TARGET_SIZE)
        .semantics { contentDescription = "${name}: ${spent} of ${limit}, ${status}" }) {
        Column(Modifier.padding(FinanceDesktopTheme.spacing.lg)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(name, style = MaterialTheme.typography.bodyLarge.copy(fontSize = 18.sp), fontWeight = FontWeight.Medium)
                Text("${spent} / ${limit}", style = MaterialTheme.typography.bodyLarge.copy(fontSize = 18.sp))
            }
            Spacer(Modifier.height(FinanceDesktopTheme.spacing.md))
            LinearProgressIndicator(progress = { progress }, Modifier.fillMaxWidth().height(12.dp), color = color,
                trackColor = MaterialTheme.colorScheme.surfaceVariant)
            Spacer(Modifier.height(FinanceDesktopTheme.spacing.xs))
            Text(status, style = MaterialTheme.typography.labelLarge, color = color, fontWeight = FontWeight.SemiBold)
        }
    }
}

/**
 * Accessibility settings data for cognitive accessibility mode.
 * Persisted via SettingsRepository to DPAPI-encrypted storage.
 */
data class AccessibilitySettings(
    val simplifiedLayout: Boolean = false,
    val largeTargets: Boolean = false,
    val reducedAnimations: Boolean = false,
    val simplifiedNavigation: Boolean = false,
)
