// SPDX-License-Identifier: BUSL-1.1

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearRateCache,
  getCacheTimestamp,
  getCachedRate,
  getCachedRates,
  isCacheStale,
  setCachedRate,
  setCachedRates,
} from './rate-cache';
import type { ExchangeRate } from './exchange-rate-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRate(from: string, to: string, rate: number): ExchangeRate {
  return {
    from,
    to,
    rate,
    timestamp: '2025-01-15T12:00:00.000Z',
    source: 'static',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('rate-cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getCachedRate / setCachedRate', () => {
    it('returns null when no rate is cached', () => {
      expect(getCachedRate('USD', 'EUR')).toBeNull();
    });

    it('stores and retrieves a rate', () => {
      const rate = makeRate('USD', 'EUR', 0.92);
      setCachedRate(rate);

      const cached = getCachedRate('USD', 'EUR');
      expect(cached).not.toBeNull();
      expect(cached!.rate).toBe(0.92);
      expect(cached!.from).toBe('USD');
      expect(cached!.to).toBe('EUR');
    });

    it('does not cross-contaminate different pairs', () => {
      setCachedRate(makeRate('USD', 'EUR', 0.92));
      setCachedRate(makeRate('USD', 'GBP', 0.79));

      expect(getCachedRate('USD', 'EUR')!.rate).toBe(0.92);
      expect(getCachedRate('USD', 'GBP')!.rate).toBe(0.79);
      expect(getCachedRate('EUR', 'GBP')).toBeNull();
    });
  });

  describe('getCachedRates / setCachedRates', () => {
    it('returns null when no rates are cached', () => {
      expect(getCachedRates('USD')).toBeNull();
    });

    it('stores and retrieves a full rate set', () => {
      const rates: Record<string, ExchangeRate> = {
        EUR: makeRate('USD', 'EUR', 0.92),
        GBP: makeRate('USD', 'GBP', 0.79),
      };
      setCachedRates('USD', rates);

      const cached = getCachedRates('USD');
      expect(cached).not.toBeNull();
      expect(cached!['EUR'].rate).toBe(0.92);
      expect(cached!['GBP'].rate).toBe(0.79);
    });

    it('also populates individual pair cache', () => {
      const rates: Record<string, ExchangeRate> = {
        EUR: makeRate('USD', 'EUR', 0.92),
      };
      setCachedRates('USD', rates);

      // Individual pair lookup should work too
      expect(getCachedRate('USD', 'EUR')!.rate).toBe(0.92);
    });
  });

  describe('isCacheStale', () => {
    it('returns true when cache has never been written', () => {
      expect(isCacheStale()).toBe(true);
    });

    it('returns false immediately after writing', () => {
      setCachedRate(makeRate('USD', 'EUR', 0.92));
      expect(isCacheStale()).toBe(false);
    });

    it('returns true when cache is older than max age', () => {
      setCachedRate(makeRate('USD', 'EUR', 0.92));
      // Pass a max age of -1ms — the cache is always stale
      expect(isCacheStale(-1)).toBe(true);
    });

    it('returns false when cache is within max age', () => {
      setCachedRate(makeRate('USD', 'EUR', 0.92));
      // Pass a very large max age
      expect(isCacheStale(999_999_999)).toBe(false);
    });
  });

  describe('getCacheTimestamp', () => {
    it('returns null when cache has never been written', () => {
      expect(getCacheTimestamp()).toBeNull();
    });

    it('returns a timestamp after writing', () => {
      setCachedRate(makeRate('USD', 'EUR', 0.92));
      const ts = getCacheTimestamp();
      expect(ts).not.toBeNull();
      expect(new Date(ts!).getTime()).not.toBeNaN();
    });
  });

  describe('clearRateCache', () => {
    it('removes all cached rates', () => {
      setCachedRate(makeRate('USD', 'EUR', 0.92));
      setCachedRate(makeRate('USD', 'GBP', 0.79));
      setCachedRates('USD', { EUR: makeRate('USD', 'EUR', 0.92) });

      clearRateCache();

      expect(getCachedRate('USD', 'EUR')).toBeNull();
      expect(getCachedRate('USD', 'GBP')).toBeNull();
      expect(getCachedRates('USD')).toBeNull();
      expect(getCacheTimestamp()).toBeNull();
    });

    it('does not remove non-cache localStorage items', () => {
      localStorage.setItem('some-other-key', 'value');
      setCachedRate(makeRate('USD', 'EUR', 0.92));

      clearRateCache();

      expect(localStorage.getItem('some-other-key')).toBe('value');
    });
  });
});
