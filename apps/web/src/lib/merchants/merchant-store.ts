// SPDX-License-Identifier: BUSL-1.1

/**
 * localStorage-based store for known merchants.
 *
 * Persists the merchant list (including seed data) so that match counts
 * and user-added merchants survive page reloads. Falls back gracefully
 * when localStorage is unavailable (e.g. private browsing with quota
 * exhausted).
 *
 * @module lib/merchants/merchant-store
 * References: issue #1514
 */

import type { CreateMerchantInput, KnownMerchant } from './merchant-types';
import { SEED_MERCHANTS } from './merchant-seed';

const STORAGE_KEY = 'finance_known_merchants';
const SEEDED_KEY = 'finance_merchants_seeded';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely read from localStorage. Returns `null` on any failure. */
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Safely write to localStorage. Silently ignores quota errors. */
function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Quota exceeded or private browsing — ignore.
  }
}

/** Persist the full merchant list to localStorage. */
function persist(merchants: KnownMerchant[]): void {
  writeStorage(STORAGE_KEY, JSON.stringify(merchants));
}

/** Ensure seed merchants are loaded on first run. */
function ensureSeeded(): void {
  const alreadySeeded = readStorage(SEEDED_KEY);
  if (alreadySeeded === 'true') {
    return;
  }

  const existing = readStorage(STORAGE_KEY);
  if (existing !== null) {
    writeStorage(SEEDED_KEY, 'true');
    return;
  }

  const seeded: KnownMerchant[] = SEED_MERCHANTS.map((input) => ({
    id: crypto.randomUUID(),
    name: input.name,
    displayName: input.displayName,
    categoryDefault: input.categoryDefault,
    patterns: [...input.patterns],
    matchCount: 0,
  }));

  persist(seeded);
  writeStorage(SEEDED_KEY, 'true');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Retrieve all known merchants, seeding defaults on first access. */
export function getKnownMerchants(): KnownMerchant[] {
  ensureSeeded();
  const raw = readStorage(STORAGE_KEY);
  if (raw === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as KnownMerchant[];
  } catch {
    return [];
  }
}

/** Add a new merchant to the store. Returns the created merchant. */
export function addKnownMerchant(input: CreateMerchantInput): KnownMerchant {
  const merchants = getKnownMerchants();
  const merchant: KnownMerchant = {
    id: crypto.randomUUID(),
    name: input.name,
    displayName: input.displayName,
    categoryDefault: input.categoryDefault,
    patterns: [...input.patterns],
    matchCount: 0,
  };
  merchants.push(merchant);
  persist(merchants);
  return merchant;
}

/** Increment the match count for a given merchant. */
export function updateMerchantMatchCount(id: string): void {
  const merchants = getKnownMerchants();
  const merchant = merchants.find((m) => m.id === id);
  if (merchant) {
    // matchCount is readonly on the interface — we mutate the deserialized copy.
    (merchant as { matchCount: number }).matchCount += 1;
    persist(merchants);
  }
}

/** Update a merchant's properties. */
export function updateKnownMerchant(
  id: string,
  updates: Partial<CreateMerchantInput>,
): KnownMerchant | null {
  const merchants = getKnownMerchants();
  const index = merchants.findIndex((m) => m.id === id);
  if (index === -1) {
    return null;
  }
  const existing = merchants[index];
  const updated: KnownMerchant = {
    ...existing,
    name: updates.name ?? existing.name,
    displayName: updates.displayName ?? existing.displayName,
    categoryDefault: updates.categoryDefault ?? existing.categoryDefault,
    patterns: updates.patterns ? [...updates.patterns] : [...existing.patterns],
  };
  merchants[index] = updated;
  persist(merchants);
  return updated;
}

/** Remove a merchant from the store. Returns `true` if found and removed. */
export function deleteMerchant(id: string): boolean {
  const merchants = getKnownMerchants();
  const index = merchants.findIndex((m) => m.id === id);
  if (index === -1) {
    return false;
  }
  merchants.splice(index, 1);
  persist(merchants);
  return true;
}
