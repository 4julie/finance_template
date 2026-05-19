// SPDX-License-Identifier: BUSL-1.1

/**
 * React hook for exchange rate management.
 *
 * Wraps `ExchangeRateService` in a React-friendly API with loading states,
 * error handling, and user-override management.
 *
 * Usage:
 * ```tsx
 * const {
 *   rates, loading, error,
 *   convert, getRate, setOverride, removeOverride,
 * } = useExchangeRates('USD');
 * ```
 *
 * References: issue #1515
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ExchangeRate, ExchangeRateProvider } from '../lib/currency/exchange-rate-types';
import { ExchangeRateService } from '../lib/currency/exchange-rate-service';
import { getCacheTimestamp } from '../lib/currency/rate-cache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Return type for the `useExchangeRates` hook. */
export interface UseExchangeRatesResult {
  /** All rates for the base currency. */
  rates: Record<string, ExchangeRate>;
  /** Whether rates are currently loading. */
  loading: boolean;
  /** Error message, or null. */
  error: string | null;
  /** ISO 8601 timestamp of last rate update. */
  lastUpdated: string | null;
  /** Name of the active rate provider. */
  providerName: string;
  /** Convert an amount (cents) from one currency to another. */
  convert: (amount: number, from: string, to: string) => Promise<number>;
  /** Get the exchange rate for a pair. */
  getRate: (from: string, to: string) => Promise<ExchangeRate>;
  /** Set a manual override rate. */
  setOverride: (from: string, to: string, rate: number) => void;
  /** Remove a manual override rate. */
  removeOverride: (from: string, to: string) => void;
  /** Get all active user overrides. */
  overrides: Record<string, number>;
  /** Clear all user overrides. */
  clearOverrides: () => void;
  /** Refresh rates from the provider. */
  refresh: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * React hook for exchange rate management.
 *
 * @param baseCurrency - ISO 4217 code for the base currency (default: "USD").
 * @param provider - Optional custom provider (default: StaticRateProvider).
 */
export function useExchangeRates(
  baseCurrency: string = 'USD',
  provider?: ExchangeRateProvider,
): UseExchangeRatesResult {
  const [rates, setRates] = useState<Record<string, ExchangeRate>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [refreshToken, setRefreshToken] = useState(0);

  // Stable service ref — recreate only when provider changes
  const serviceRef = useRef<ExchangeRateService | null>(null);
  const service = useMemo(() => {
    const svc = new ExchangeRateService(provider);
    serviceRef.current = svc;
    return svc;
  }, [provider]);

  // Load rates on mount and when baseCurrency or refreshToken changes
  useEffect(() => {
    let cancelled = false;

    async function loadRates(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const allRates = await service.getAllRates(baseCurrency);
        if (!cancelled) {
          setRates(allRates);
          setLastUpdated(getCacheTimestamp() ?? new Date().toISOString());
          setOverrides(service.getUserOverrides());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load exchange rates.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRates();

    return () => {
      cancelled = true;
    };
  }, [baseCurrency, refreshToken, service]);

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  const convert = useCallback(
    async (amount: number, from: string, to: string): Promise<number> => {
      const result = await service.convert(amount, from, to);
      return result.amount;
    },
    [service],
  );

  const getRate = useCallback(
    async (from: string, to: string): Promise<ExchangeRate> => {
      return service.getRate(from, to);
    },
    [service],
  );

  const setOverride = useCallback(
    (from: string, to: string, rate: number) => {
      service.setUserOverride(from, to, rate);
      setOverrides(service.getUserOverrides());
      refresh();
    },
    [service, refresh],
  );

  const removeOverride = useCallback(
    (from: string, to: string) => {
      service.removeUserOverride(from, to);
      setOverrides(service.getUserOverrides());
      refresh();
    },
    [service, refresh],
  );

  const clearOverrides = useCallback(() => {
    service.clearUserOverrides();
    setOverrides({});
    refresh();
  }, [service, refresh]);

  return {
    rates,
    loading,
    error,
    lastUpdated,
    providerName: service.providerName,
    convert,
    getRate,
    setOverride,
    removeOverride,
    overrides,
    clearOverrides,
    refresh,
  };
}
