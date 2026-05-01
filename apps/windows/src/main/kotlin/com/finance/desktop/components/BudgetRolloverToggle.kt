// SPDX-License-Identifier: BUSL-1.1

package com.finance.desktop.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Autorenew
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.finance.desktop.theme.FinanceDesktopTheme

/**
 * Toggle component for budget rollover functionality.
 *
 * When enabled, unused budget from the previous month carries forward to the
 * current period. The component displays the rollover amount and allows the
 * user to toggle the feature on/off per budget.
 *
 * ## Accessibility
 * - Toggle announced with current state and rollover amount
 * - Info tooltip provides explanation for screen reader users
 */
@Composable
fun BudgetRolloverToggle(
    isEnabled: Boolean,
    rolloverAmountFormatted: String,
    previousMonthRemaining: String,
    onToggle: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val stateLabel = if (isEnabled) "enabled" else "disabled"

    Card(
        modifier = modifier.fillMaxWidth()
            .semantics { contentDescription = "Budget rollover ${stateLabel}. Rollover amount: ${rolloverAmountFormatted}" },
    ) {
        Column(modifier = Modifier.padding(FinanceDesktopTheme.spacing.lg)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Filled.Autorenew,
                        contentDescription = null,
                        tint = if (isEnabled) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(24.dp),
                    )
                    Spacer(Modifier.width(FinanceDesktopTheme.spacing.md))
                    Column {
                        Text(
                            text = "Budget Rollover",
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium,
                        )
                        Text(
                            text = "Carry unused budget to next period",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Switch(
                    checked = isEnabled,
                    onCheckedChange = onToggle,
                    modifier = Modifier.semantics {
                        role = Role.Switch
                        contentDescription = "Budget rollover toggle, currently ${stateLabel}"
                    },
                )
            }

            AnimatedVisibility(
                visible = isEnabled,
                enter = expandVertically(),
                exit = shrinkVertically(),
            ) {
                Column(modifier = Modifier.padding(top = FinanceDesktopTheme.spacing.md)) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                    Spacer(Modifier.height(FinanceDesktopTheme.spacing.md))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        RolloverDetail("Previous Month Remaining", previousMonthRemaining)
                        RolloverDetail("Rollover Amount", rolloverAmountFormatted)
                    }

                    Spacer(Modifier.height(FinanceDesktopTheme.spacing.sm))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Filled.Info,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(16.dp),
                        )
                        Spacer(Modifier.width(FinanceDesktopTheme.spacing.xs))
                        Text(
                            text = "Rollover adds unused budget from last period to your current limit",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RolloverDetail(label: String, value: String) {
    Column(modifier = Modifier.semantics { contentDescription = "${label}: ${value}" }) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    }
}
