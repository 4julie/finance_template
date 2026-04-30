// SPDX-License-Identifier: BUSL-1.1

/**
 * React hook for GDPR consent management.
 *
 * Provides consent state and actions to the component tree.
 * Triggers the first-run consent dialog when consent hasn't been collected.
 *
 * Usage:
 * ```tsx
 * const { consent, needsConsent, updateCategory, acceptAll, rejectAll } = useConsent();
 * ```
 *
 * References: issue #443
 */

import { useCallback, useState } from 'react';
import {
  hasCompletedConsent,
  loadConsent,
  needsConsentRefresh,
  revokeAllConsent,
  updateConsent,
  type ConsentCategory,
  type ConsentRecord,
} from '../lib/consent-storage';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/** Shape returned by {@link useConsent}. */
export interface UseConsentResult {
  /** Current consent state. */
  readonly consent: ConsentRecord;
  /** Whether the consent dialog should be shown. */
  readonly needsConsent: boolean;
  /** Whether the user has ever completed the consent flow. */
  readonly hasCompleted: boolean;
  /** Update a single consent category. */
  readonly updateCategory: (category: ConsentCategory, value: boolean) => void;
  /** Accept all consent categories. */
  readonly acceptAll: () => void;
  /** Reject all non-essential categories. */
  readonly rejectAll: () => void;
  /** Save current selections and dismiss the dialog. */
  readonly savePreferences: (categories: Partial<Record<ConsentCategory, boolean>>) => void;
  /** Force refresh consent state from storage. */
  readonly refresh: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Manage GDPR consent state and actions. */
export function useConsent(): UseConsentResult {
  const [consent, setConsent] = useState<ConsentRecord>(loadConsent);
  const [needsConsent, setNeedsConsent] = useState(
    () => !hasCompletedConsent() || needsConsentRefresh(),
  );

  const refresh = useCallback(() => {
    setConsent(loadConsent());
    setNeedsConsent(!hasCompletedConsent() || needsConsentRefresh());
  }, []);

  const updateCategory = useCallback((category: ConsentCategory, value: boolean) => {
    const updated = updateConsent({ [category]: value });
    setConsent(updated);
    setNeedsConsent(false);
  }, []);

  const acceptAll = useCallback(() => {
    const updated = updateConsent({
      analytics: true,
      error_reporting: true,
      sync: true,
      marketing: true,
    });
    setConsent(updated);
    setNeedsConsent(false);
  }, []);

  const rejectAll = useCallback(() => {
    const updated = revokeAllConsent();
    setConsent(updated);
    setNeedsConsent(false);
  }, []);

  const savePreferences = useCallback((categories: Partial<Record<ConsentCategory, boolean>>) => {
    const updated = updateConsent(categories);
    setConsent(updated);
    setNeedsConsent(false);
  }, []);

  return {
    consent,
    needsConsent,
    hasCompleted: consent.hasCompletedFirstRun,
    updateCategory,
    acceptAll,
    rejectAll,
    savePreferences,
    refresh,
  };
}
