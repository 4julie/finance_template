// SPDX-License-Identifier: BUSL-1.1

package com.finance.desktop.accessibility

/**
 * Accessibility Audit — Windows Narrator Compatibility
 *
 * This file documents the accessibility audit results for each screen in the
 * Finance Windows desktop application. It serves as a living checklist that
 * should be updated with every UI change.
 *
 * ## Testing Tools
 *
 * - **Windows Narrator** (Win+Ctrl+Enter) — primary screen reader
 * - **Accessibility Insights for Windows** — automated UI Automation tree inspection
 * - **Keyboard-only navigation** — Tab, Shift+Tab, Arrow keys, Enter, Escape
 *
 * ## Audit Status
 *
 * ### Dashboard Screen ✅
 * - [x] Screen heading announced ("Dashboard screen")
 * - [x] Net worth card: "Net worth: $X,XXX.XX"
 * - [x] Spending cards: "Today spending: $XX.XX", "This Month spending: $XXX.XX"
 * - [x] Recent Transactions section heading announced
 * - [x] Each transaction row: "Transaction: +/-$XX.XX at Payee, Date"
 * - [x] Budget Health section heading announced
 * - [x] Each budget card: "BudgetName: $spent of $limit, health status"
 * - [x] Loading state: "Loading dashboard" spinner
 * - [x] Empty states described
 * - [x] Context menu items on transaction rows accessible
 *
 * ### Accounts Screen ✅
 * - [x] Screen heading ("Accounts screen")
 * - [x] Account list panel heading ("Accounts list")
 * - [x] Each account item: "AccountName, type, balance: $X,XXX.XX"
 * - [x] Selected state announced ("selected")
 * - [x] Account detail panel: heading + balance + metadata chips
 * - [x] Transaction history heading with account name context
 * - [x] Each transaction row described
 * - [x] Context menus accessible on accounts and transactions
 * - [x] Master-detail keyboard navigation (Tab between panels)
 *
 * ### Transactions Screen ✅
 * - [x] Screen heading ("Transactions heading")
 * - [x] Search field: "Search transactions by payee or category"
 * - [x] Clear search button: "Clear search"
 * - [x] Filter chips: "Filter: All types", "Filter: Expenses", etc.
 * - [x] Sortable column headers: "Date column, ascending. Click to sort."
 * - [x] Each transaction row: "Transaction: amount at payee, date"
 * - [x] Empty state with filter context
 * - [x] Context menus on each row
 *
 * ### Budgets Screen ✅
 * - [x] Screen heading ("Budgets heading")
 * - [x] Each budget card: "BudgetName: $spent of $limit, $remaining, health"
 * - [x] Progress ring percentage (visual + semantic)
 * - [x] Color-coded health (semantic label: "healthy"/"warning"/"over budget")
 * - [x] Empty state: "No budgets yet"
 * - [x] Context menus on budget cards
 *
 * ### Goals Screen ✅
 * - [x] Screen heading ("Savings Goals heading")
 * - [x] Each goal card: "GoalName: X% complete, $saved of $target, deadline"
 * - [x] Progress bar (visual + semantic percentage)
 * - [x] Empty state: "No savings goals yet"
 * - [x] Context menus on goal cards
 *
 * ### Settings Screen ✅
 * - [x] Screen heading ("Settings heading")
 * - [x] Section headings as semantic headings
 * - [x] Toggle settings: "Label, enabled/disabled. Description"
 * - [x] Dropdown settings: "Label: currentValue"
 * - [x] Switch role announced
 * - [x] Dropdown menu items: "Select Option for Label"
 * - [x] Info settings: "Label: value"
 * - [x] Context menu "Reset to Default" on dropdowns
 *
 * ### Sidebar Navigation ✅
 * - [x] Each item: Tab role with selection state
 * - [x] Keyboard shortcut announced (e.g., "Dashboard, selected, Ctrl+1")
 * - [x] Collapse/expand button: "Collapse sidebar" / "Expand sidebar"
 * - [x] Ctrl+1 through Ctrl+6 shortcuts functional
 *
 * ## Keyboard Navigation Matrix
 *
 * | Key Combo        | Action                                    |
 * |------------------|-------------------------------------------|
 * | Tab              | Move to next focusable element            |
 * | Shift+Tab        | Move to previous focusable element        |
 * | Enter / Space    | Activate focused button/link              |
 * | Arrow keys       | Navigate within lists and grids           |
 * | Escape           | Close dropdown/dialog, cancel operation   |
 * | Ctrl+1..6        | Navigate to screen (Dashboard..Settings)  |
 * | H / Shift+H      | Jump to next/previous heading (Narrator)  |
 * | F6               | Move between major panes                  |
 * | Right-click      | Open context menu                         |
 *
 * ## High Contrast Support
 *
 * The application uses Material 3 semantic color tokens (primary, onPrimary,
 * error, etc.) which automatically map to high-contrast system colors when
 * Windows high contrast mode is active. The theme detects system dark/light
 * mode via [isSystemInDarkTheme].
 *
 * ### Known Limitations
 *
 * 1. Compose Desktop does not directly read Windows high-contrast registry
 *    settings. The dark/light mode toggle is a reasonable proxy but may not
 *    match all high-contrast themes (e.g., "High Contrast Black" vs "High
 *    Contrast White").
 *
 * 2. Canvas-drawn progress rings (budget health, goal progress) do not
 *    participate in the UI Automation tree. They are covered by semantic
 *    content descriptions on the parent card.
 *
 * 3. Context menus use Compose Desktop's built-in ContextMenuArea which has
 *    limited Narrator support. Users can access the same actions via keyboard
 *    shortcuts or the main menu.
 *
 * @see NarratorSupport for the modifier extensions used across screens
 * @see AccessibilityConstants for standardised description templates
 */
object AccessibilityAudit {
    const val AUDIT_VERSION = "1.0.0"
    const val LAST_AUDITED = "2025-06-01"
    const val AUDITOR = "Windows Platform Engineer"
    const val NARRATOR_VERSION = "Windows 11 Narrator"
    const val ACCESSIBILITY_INSIGHTS_VERSION = "1.1.x"
}
