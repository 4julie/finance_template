// SPDX-License-Identifier: BUSL-1.1

/**
 * Exchange rate cache with configurable TTL.
 *
 * Caches exchange rates in `localStorage` so the app can display
 * approximate converted totals even when offline. Rates are stored
 * per base currency with a timestamp for staleness checks.
 *
 * References: issue #1515
 */

import type { ExchangeRate } from './exchange-rate-types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_KEY_PREFIX = 'finance-exchange-rates-cache';
const CACHE_META_KEY = 'finance-exchange-rates-meta';

/** Default cache TTL: 24 hours. */
export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface CacheMeta {
  /** ISO 8601 timestamp of last cache write. */
  lastUpdated: string;
}

interface CachedRateEntry {
  rate: ExchangeRate;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the localStorage key for a specific base currency. */
function ratesKey(baseCurrency: string): string {
  return `${CACHE_KEY_PREFIX}:${baseCurrency}`;
}

/** Build the localStorage key for a specific currency pair. */
function pairKey(from: string, to: string): string {
  return `${CACHE_KEY_PREFIX}:pair:${from}:${to}`;
}

/**
 * Safely read and parse JSON from localStorage.
 *
 * Returns `null` on any error (missing key, corrupt JSON, etc.).
 */
function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get a single cached exchange rate for a currency pair.
 *
 * @returns The cached `ExchangeRate`, or `null` if not found.
 */
export function getCachedRate(from: string, to: string): ExchangeRate | null {
  const entry = readJson<CachedRateEntry>(pairKey(from, to));
  return entry?.rate ?? null;
}

/**
 * Cache a single exchange rate.
 */
export function setCachedRate(rate: ExchangeRate): void {
  try {
    const entry: CachedRateEntry = { rate };
    localStorage.setItem(pairKey(rate.from, rate.to), JSON.stringify(entry));
    updateMeta();
  } catch {
    // localStorage may be full or unavailable — fail silently
  }
}

/**
 * Get all cached rates for a base currency.
 *
 * @returns A map of target currency codes to `ExchangeRate`, or `null` if
 *          no cached rates exist for the given base.
 */
export function getCachedRates(baseCurrency: string): Record<string, ExchangeRate> | null {
  return readJson<Record<string, ExchangeRate>>(ratesKey(baseCurrency));
}

/**
 * Cache a full set of rates for a base currency.
 */
export function setCachedRates(baseCurrency: string, rates: Record<string, ExchangeRate>): void {
  try {
    localStorage.setItem(ratesKey(baseCurrency), JSON.stringify(rates));
    updateMeta();

    // Also cache individual pairs for quick pair lookups
    for (const rate of Object.values(rates)) {
      const entry: CachedRateEntry = { rate };
      localStorage.setItem(pairKey(rate.from, rate.to), JSON.stringify(entry));
    }
  } catch {
    // localStorage may be full or unavailable — fail silently
  }
}

/**
 * Check whether the cache is stale based on the given max age.
 *
 * @param maxAgeMs - Maximum age in milliseconds (default: 24 hours).
 * @returns `true` if the cache is stale or has never been written.
 */
export function isCacheStale(maxAgeMs: number = DEFAULT_CACHE_TTL_MS): boolean {
  const meta = readJson<CacheMeta>(CACHE_META_KEY);
  if (!meta?.lastUpdated) return true;

  const lastUpdated = new Date(meta.lastUpdated).getTime();
  if (Number.isNaN(lastUpdated)) return true;

  return Date.now() - lastUpdated > maxAgeMs;
}

/**
 * Get the ISO 8601 timestamp of the last cache update.
 *
 * @returns The timestamp string, or `null` if the cache has never been written.
 */
export function getCacheTimestamp(): string | null {
  const meta = readJson<CacheMeta>(CACHE_META_KEY);
  return meta?.lastUpdated ?? null;
}

/**
 * Clear all cached exchange rates.
 */
export function clearRateCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    localStorage.removeItem(CACHE_META_KEY);
  } catch {
    // fail silently
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Update the cache metadata timestamp. */
function updateMeta(): void {
  const meta: CacheMeta = { lastUpdated: new Date().toISOString() };
  localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
}
