// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.snapshot

import com.finance.android.ui.data.SampleData
import com.finance.android.ui.screens.AccountDetailScreen
import com.finance.android.ui.screens.AccountsEmptyState
import com.finance.android.ui.screens.AccountsList
import com.finance.android.ui.viewmodel.AccountGroup
import com.finance.models.Account
import com.finance.models.AccountType
import com.finance.models.Transaction
import com.finance.models.TransactionStatus
import com.finance.models.TransactionType
import com.finance.models.types.Cents
import com.finance.models.types.Currency
import com.finance.models.types.SyncId
import kotlinx.datetime.Instant
import kotlinx.datetime.LocalDate
import org.junit.Rule
import org.junit.Test

/**
 * Paparazzi snapshot tests for the Accounts list and detail screens.
 *
 * Captures golden images for the account list (grouped by type),
 * empty state, and account detail view in light/dark/high-contrast
 * modes at both 1.0× and 2.0× font scales.
 */
class AccountsSnapshotTest {

    @get:Rule
    val paparazzi = SnapshotTestConfig.paparazzi()

    // ── Account list ────────────────────────────────────────────────────────

    private fun sampleGroups() = listOf(
        AccountGroup(
            AccountType.CHECKING, "Checking",
            SampleData.accounts.filter { it.type == AccountType.CHECKING },
            Cents(524_73L), "\$524.73",
        ),
        AccountGroup(
            AccountType.SAVINGS, "Savings",
            SampleData.accounts.filter { it.type == AccountType.SAVINGS },
            Cents(18_670_00L), "\$18,670.00",
        ),
        AccountGroup(
            AccountType.CREDIT_CARD, "Credit Cards",
            SampleData.accounts.filter { it.type == AccountType.CREDIT_CARD },
            Cents(2_370_51L), "\$2,370.51",
        ),
        AccountGroup(
            AccountType.INVESTMENT, "Investments",
            SampleData.accounts.filter { it.type == AccountType.INVESTMENT },
            Cents(99_990_00L), "\$99,990.00",
        ),
    )

    @Test
    fun accountList_light_1x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.LIGHT, FontScale.NORMAL) {
                AccountsList(groups = sampleGroups(), onAccountClick = {})
            }
        }
    }

    @Test
    fun accountList_dark_1x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.DARK, FontScale.NORMAL) {
                AccountsList(groups = sampleGroups(), onAccountClick = {})
            }
        }
    }

    @Test
    fun accountList_highContrast_1x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.HIGH_CONTRAST, FontScale.NORMAL) {
                AccountsList(groups = sampleGroups(), onAccountClick = {})
            }
        }
    }

    @Test
    fun accountList_light_2x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.LIGHT, FontScale.LARGE) {
                AccountsList(groups = sampleGroups(), onAccountClick = {})
            }
        }
    }

    @Test
    fun accountList_dark_2x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.DARK, FontScale.LARGE) {
                AccountsList(groups = sampleGroups(), onAccountClick = {})
            }
        }
    }

    @Test
    fun accountList_highContrast_2x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.HIGH_CONTRAST, FontScale.LARGE) {
                AccountsList(groups = sampleGroups(), onAccountClick = {})
            }
        }
    }

    // ── Account empty state ─────────────────────────────────────────────────

    @Test
    fun accountEmpty_light_1x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.LIGHT, FontScale.NORMAL) {
                AccountsEmptyState()
            }
        }
    }

    @Test
    fun accountEmpty_dark_1x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.DARK, FontScale.NORMAL) {
                AccountsEmptyState()
            }
        }
    }

    // ── Account detail ──────────────────────────────────────────────────────
    //
    // Pinned dates so snapshots are deterministic and immune to calendar drift.
    // The golden images were recorded on 2026-04-09; using those same dates
    // keeps the rendered text identical across CI runs.

    private val pinnedDate = LocalDate(2026, 4, 9)
    private val pinnedYesterday = LocalDate(2026, 4, 8)
    private val pinnedInstant = Instant.parse("2026-04-09T00:00:00Z")

    private val pinnedAccount = Account(
        id = SyncId("acc-checking"), householdId = SyncId("household-1"),
        name = "Main Checking", type = AccountType.CHECKING,
        currency = Currency.USD, currentBalance = Cents(524_73L),
        isArchived = false, sortOrder = 0, icon = null, color = null,
        createdAt = pinnedInstant, updatedAt = pinnedInstant,
    )

    private val pinnedTransactions = listOf(
        Transaction(
            id = SyncId("txn-1"), householdId = SyncId("household-1"),
            accountId = SyncId("acc-checking"), categoryId = SyncId("cat-groceries"),
            type = TransactionType.EXPENSE, status = TransactionStatus.CLEARED,
            amount = Cents(-8_743L), currency = Currency.USD,
            payee = "Whole Foods Market", date = pinnedDate,
            createdAt = pinnedInstant, updatedAt = pinnedInstant,
        ),
        Transaction(
            id = SyncId("txn-2"), householdId = SyncId("household-1"),
            accountId = SyncId("acc-credit"), categoryId = SyncId("cat-dining"),
            type = TransactionType.EXPENSE, status = TransactionStatus.CLEARED,
            amount = Cents(-5_85L), currency = Currency.USD,
            payee = "Starbucks", date = pinnedDate,
            createdAt = pinnedInstant, updatedAt = pinnedInstant,
        ),
        Transaction(
            id = SyncId("txn-3"), householdId = SyncId("household-1"),
            accountId = SyncId("acc-credit"), categoryId = SyncId("cat-transport"),
            type = TransactionType.EXPENSE, status = TransactionStatus.CLEARED,
            amount = Cents(-14_50L), currency = Currency.USD,
            payee = "Uber", date = pinnedDate,
            createdAt = pinnedInstant, updatedAt = pinnedInstant,
        ),
        Transaction(
            id = SyncId("txn-4"), householdId = SyncId("household-1"),
            accountId = SyncId("acc-credit"), categoryId = SyncId("cat-shopping"),
            type = TransactionType.EXPENSE, status = TransactionStatus.CLEARED,
            amount = Cents(-67_42L), currency = Currency.USD,
            payee = "Target", date = pinnedYesterday,
            createdAt = pinnedInstant, updatedAt = pinnedInstant,
        ),
        Transaction(
            id = SyncId("txn-5"), householdId = SyncId("household-1"),
            accountId = SyncId("acc-checking"), categoryId = SyncId("cat-subscriptions"),
            type = TransactionType.EXPENSE, status = TransactionStatus.CLEARED,
            amount = Cents(-15_99L), currency = Currency.USD,
            payee = "Netflix", date = pinnedYesterday,
            createdAt = pinnedInstant, updatedAt = pinnedInstant,
        ),
    )

    @Test
    fun accountDetail_light_1x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.LIGHT, FontScale.NORMAL) {
                AccountDetailScreen(
                    account = pinnedAccount,
                    transactions = pinnedTransactions,
                    onBack = {},
                )
            }
        }
    }

    @Test
    fun accountDetail_dark_1x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.DARK, FontScale.NORMAL) {
                AccountDetailScreen(
                    account = pinnedAccount,
                    transactions = pinnedTransactions,
                    onBack = {},
                )
            }
        }
    }

    @Test
    fun accountDetail_highContrast_1x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.HIGH_CONTRAST, FontScale.NORMAL) {
                AccountDetailScreen(
                    account = pinnedAccount,
                    transactions = pinnedTransactions,
                    onBack = {},
                )
            }
        }
    }

    @Test
    fun accountDetail_light_2x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.LIGHT, FontScale.LARGE) {
                AccountDetailScreen(
                    account = pinnedAccount,
                    transactions = pinnedTransactions,
                    onBack = {},
                )
            }
        }
    }

    @Test
    fun accountDetail_dark_2x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.DARK, FontScale.LARGE) {
                AccountDetailScreen(
                    account = pinnedAccount,
                    transactions = pinnedTransactions,
                    onBack = {},
                )
            }
        }
    }

    @Test
    fun accountDetail_highContrast_2x() {
        paparazzi.snapshot {
            SnapshotThemeWrapper(ThemeMode.HIGH_CONTRAST, FontScale.LARGE) {
                AccountDetailScreen(
                    account = pinnedAccount,
                    transactions = pinnedTransactions,
                    onBack = {},
                )
            }
        }
    }
}
