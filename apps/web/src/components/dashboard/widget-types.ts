// SPDX-License-Identifier: BUSL-1.1

/**
 * Dashboard widget type definitions and default layout configuration.
 *
 * Each widget is a self-contained card that displays a specific financial
 * metric or visualization. Users can toggle widget visibility and reorder
 * them via the dashboard customization panel.
 *
 * Widget configuration is persisted to localStorage so it survives page
 * refreshes and works offline.
 *
 * References: issue #315
 * @module components/dashboard/widget-types
 */

// ---------------------------------------------------------------------------
// Widget identifiers
// ---------------------------------------------------------------------------

/**
 * Unique identifier for each dashboard widget.
 * These map 1:1 to the widget components rendered on the dashboard.
 */
export type WidgetId =
  | 'net-worth'
  | 'monthly-spending'
  | 'budget-health'
  | 'spending-trend'
  | 'spending-by-category'
  | 'category-pie'
  | 'recent-transactions'
  | 'account-summary'
  | 'income-vs-expense'
  | 'goals-progress';

// ---------------------------------------------------------------------------
// Widget metadata
// ---------------------------------------------------------------------------

/** Size hint for responsive grid layout. */
export type WidgetSize = 'small' | 'medium' | 'large';

/** Static metadata about a widget type (not user-configurable). */
export interface WidgetDefinition {
  /** Unique widget identifier. */
  readonly id: WidgetId;
  /** Human-readable display name. */
  readonly label: string;
  /** Short description shown in the customization panel. */
  readonly description: string;
  /** Default size hint for the grid layout. */
  readonly defaultSize: WidgetSize;
  /** Icon name (maps to the icon system). */
  readonly icon: string;
}

/** Registry of all available widget definitions. */
export const WIDGET_DEFINITIONS: readonly WidgetDefinition[] = [
  {
    id: 'net-worth',
    label: 'Net Worth',
    description: 'Total balance across all accounts.',
    defaultSize: 'small',
    icon: 'wallet',
  },
  {
    id: 'monthly-spending',
    label: 'Monthly Spending',
    description: 'Total spending for the current month.',
    defaultSize: 'small',
    icon: 'trending-down',
  },
  {
    id: 'budget-health',
    label: 'Budget Health',
    description: 'Progress bar showing budget usage percentage.',
    defaultSize: 'small',
    icon: 'bar-chart',
  },
  {
    id: 'income-vs-expense',
    label: 'Income vs Expense',
    description: 'Compare monthly income and expenses side by side.',
    defaultSize: 'small',
    icon: 'scale',
  },
  {
    id: 'spending-trend',
    label: 'Spending Trend',
    description: 'Line chart of daily spending over the past 30 days.',
    defaultSize: 'large',
    icon: 'chart-line',
  },
  {
    id: 'spending-by-category',
    label: 'Spending by Category',
    description: 'Bar chart breaking down expenses by category.',
    defaultSize: 'medium',
    icon: 'chart-bar',
  },
  {
    id: 'category-pie',
    label: 'Category Share',
    description: 'Pie chart showing proportional category spending.',
    defaultSize: 'medium',
    icon: 'chart-pie',
  },
  {
    id: 'recent-transactions',
    label: 'Recent Transactions',
    description: 'List of the most recent transactions.',
    defaultSize: 'large',
    icon: 'list',
  },
  {
    id: 'account-summary',
    label: 'Account Summary',
    description: 'Balance totals grouped by account type.',
    defaultSize: 'medium',
    icon: 'credit-card',
  },
  {
    id: 'goals-progress',
    label: 'Goals Progress',
    description: 'Track progress toward your savings goals.',
    defaultSize: 'medium',
    icon: 'target',
  },
] as const;

/** Lookup map for fast widget definition retrieval by ID. */
export const WIDGET_DEFINITION_MAP = new Map<WidgetId, WidgetDefinition>(
  WIDGET_DEFINITIONS.map((def) => [def.id, def]),
);

// ---------------------------------------------------------------------------
// User widget configuration
// ---------------------------------------------------------------------------

/** Per-widget user configuration (visibility, order, size override). */
export interface WidgetConfig {
  /** Widget identifier. */
  readonly id: WidgetId;
  /** Whether the widget is visible on the dashboard. */
  readonly visible: boolean;
  /** Display order (0-based). Lower values appear first. */
  readonly order: number;
  /** Size override (defaults to the widget definition's defaultSize). */
  readonly size: WidgetSize;
}

/** The full dashboard layout configuration. */
export interface DashboardLayout {
  /** Ordered list of widget configurations. */
  readonly widgets: readonly WidgetConfig[];
  /** Schema version for future migration support. */
  readonly version: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Current schema version. Bump when breaking the layout shape. */
export const LAYOUT_VERSION = 1;

/** localStorage key for persisting the dashboard layout. */
export const LAYOUT_STORAGE_KEY = 'finance:dashboard-layout';

/** Default widget order when no user configuration exists. */
export const DEFAULT_WIDGET_ORDER: readonly WidgetId[] = [
  'net-worth',
  'monthly-spending',
  'budget-health',
  'income-vs-expense',
  'spending-trend',
  'spending-by-category',
  'category-pie',
  'recent-transactions',
  'account-summary',
  'goals-progress',
];

/** Build the default layout from the widget definitions. */
export function buildDefaultLayout(): DashboardLayout {
  return {
    version: LAYOUT_VERSION,
    widgets: DEFAULT_WIDGET_ORDER.map((id, index) => {
      const def = WIDGET_DEFINITION_MAP.get(id);
      return {
        id,
        visible: true,
        order: index,
        size: def?.defaultSize ?? 'medium',
      };
    }),
  };
}
