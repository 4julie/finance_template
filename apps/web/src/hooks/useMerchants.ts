// SPDX-License-Identifier: BUSL-1.1

/**
 * React hook for accessing known merchants and performing pattern matching.
 *
 * Wraps the localStorage-based merchant store with React state so that
 * components re-render when merchants are added, updated, or removed.
 *
 * Usage:
 * ```tsx
 * const { merchants, matchDescription, addMerchant } = useMerchants();
 * const result = matchDescription('WALGREENS 1234');
 * // result?.merchant.name => 'Walgreens'
 * ```
 *
 * References: issue #1514
 */

import { useCallback, useState } from 'react';

import type { CreateMerchantInput, KnownMerchant, MerchantMatchResult } from '../lib/merchants';
import {
  addKnownMerchant,
  deleteMerchant,
  getKnownMerchants,
  matchMerchant,
  updateKnownMerchant,
  updateMerchantMatchCount,
} from '../lib/merchants';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/** Shape returned by {@link useMerchants}. */
export interface UseMerchantsResult {
  /** All known merchants. */
  merchants: KnownMerchant[];
  /** Match a description against all known merchants. */
  matchDescription: (description: string) => MerchantMatchResult | null;
  /** Add a new merchant and refresh the list. */
  addMerchant: (input: CreateMerchantInput) => KnownMerchant;
  /** Update a merchant's properties and refresh the list. */
  updateMerchant: (id: string, updates: Partial<CreateMerchantInput>) => KnownMerchant | null;
  /** Increment a merchant's match count and refresh the list. */
  recordMatch: (id: string) => void;
  /** Remove a merchant and refresh the list. */
  removeMerchant: (id: string) => boolean;
  /** Re-read the merchant list from storage. */
  refresh: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Load known merchants from localStorage and provide CRUD + matching.
 *
 * The hook reads the merchant list lazily on first render. Mutations
 * (add, update, delete) immediately refresh the local state.
 */
export function useMerchants(): UseMerchantsResult {
  const [merchants, setMerchants] = useState<KnownMerchant[]>(() => getKnownMerchants());

  const refresh = useCallback(() => {
    setMerchants(getKnownMerchants());
  }, []);

  const matchDescription = useCallback(
    (description: string): MerchantMatchResult | null => {
      return matchMerchant(description, merchants);
    },
    [merchants],
  );

  const addMerchant = useCallback(
    (input: CreateMerchantInput): KnownMerchant => {
      const created = addKnownMerchant(input);
      refresh();
      return created;
    },
    [refresh],
  );

  const updateMerchant = useCallback(
    (id: string, updates: Partial<CreateMerchantInput>): KnownMerchant | null => {
      const updated = updateKnownMerchant(id, updates);
      if (updated) {
        refresh();
      }
      return updated;
    },
    [refresh],
  );

  const recordMatch = useCallback(
    (id: string): void => {
      updateMerchantMatchCount(id);
      refresh();
    },
    [refresh],
  );

  const removeMerchant = useCallback(
    (id: string): boolean => {
      const deleted = deleteMerchant(id);
      if (deleted) {
        refresh();
      }
      return deleted;
    },
    [refresh],
  );

  return {
    merchants,
    matchDescription,
    addMerchant,
    updateMerchant,
    recordMatch,
    removeMerchant,
    refresh,
  };
}
