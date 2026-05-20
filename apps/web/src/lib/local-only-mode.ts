// SPDX-License-Identifier: BUSL-1.1

/**
 * Local-Only Mode — manages the user's preference for local-only operation.
 *
 * When local-only mode is active:
 *   - No cloud sync occurs
 *   - No account creation is required
 *   - All data stays in the browser's SQLite-WASM (OPFS)
 *   - Core features (budgets, tracking, reporting) remain fully available
 *
 * The mode is persisted in localStorage and exposed via a React context.
 *
 * References: issue #1621 (local-only onboarding path)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key for local-only mode preference. */
const LOCAL_ONLY_STORAGE_KEY = 'finance-local-only-mode';

/** localStorage key for onboarding completion. */
const ONBOARDING_COMPLETE_KEY = 'finance-onboarding-complete';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Features available in local-only mode vs. account mode. */
export interface FeatureAvailability {
  /** Feature identifier. */
  readonly id: string;
  /** Human-readable feature name. */
  readonly name: string;
  /** Short description. */
  readonly description: string;
  /** Available without an account (local-only). */
  readonly availableLocalOnly: boolean;
  /** Requires an account / sync. */
  readonly requiresAccount: boolean;
}

/** All features with their availability in each mode. */
export const FEATURE_AVAILABILITY: FeatureAvailability[] = [
  {
    id: 'accounts',
    name: 'Account Tracking',
    description: 'Track bank accounts, credit cards, and cash.',
    availableLocalOnly: true,
    requiresAccount: false,
  },
  {
    id: 'transactions',
    name: 'Transaction Management',
    description: 'Record and categorize income and expenses.',
    availableLocalOnly: true,
    requiresAccount: false,
  },
  {
    id: 'budgets',
    name: 'Budget Planning',
    description: 'Create budgets and track spending by category.',
    availableLocalOnly: true,
    requiresAccount: false,
  },
  {
    id: 'goals',
    name: 'Savings Goals',
    description: 'Set and track financial goals.',
    availableLocalOnly: true,
    requiresAccount: false,
  },
  {
    id: 'insights',
    name: 'Spending Insights',
    description: 'Analyze spending patterns and trends.',
    availableLocalOnly: true,
    requiresAccount: false,
  },
  {
    id: 'reports',
    name: 'Report Builder',
    description: 'Generate custom financial reports.',
    availableLocalOnly: true,
    requiresAccount: false,
  },
  {
    id: 'import',
    name: 'Data Import',
    description: 'Import transactions from CSV or bank exports.',
    availableLocalOnly: true,
    requiresAccount: false,
  },
  {
    id: 'export',
    name: 'Data Export',
    description: 'Export all data as JSON or CSV.',
    availableLocalOnly: true,
    requiresAccount: false,
  },
  {
    id: 'sync',
    name: 'Cloud Sync',
    description: 'Sync data across devices via secure cloud.',
    availableLocalOnly: false,
    requiresAccount: true,
  },
  {
    id: 'household',
    name: 'Household Sharing',
    description: 'Share finances with family or partners.',
    availableLocalOnly: false,
    requiresAccount: true,
  },
  {
    id: 'backup',
    name: 'Automatic Backups',
    description: 'Cloud-based automatic backup and restore.',
    availableLocalOnly: false,
    requiresAccount: true,
  },
];

// ---------------------------------------------------------------------------
// Storage functions
// ---------------------------------------------------------------------------

/** Check if the user has chosen local-only mode. */
export function isLocalOnlyMode(): boolean {
  try {
    return localStorage.getItem(LOCAL_ONLY_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Set local-only mode preference. */
export function setLocalOnlyMode(enabled: boolean): void {
  try {
    localStorage.setItem(LOCAL_ONLY_STORAGE_KEY, String(enabled));
  } catch {
    // localStorage unavailable — degrade gracefully.
  }
}

/** Check if onboarding has been completed. */
export function isOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Mark onboarding as complete. */
export function setOnboardingComplete(complete: boolean): void {
  try {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, String(complete));
  } catch {
    // localStorage unavailable — degrade gracefully.
  }
}
