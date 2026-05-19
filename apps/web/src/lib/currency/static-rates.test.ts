// SPDX-License-Identifier: BUSL-1.1

import { beforeEach, describe, expect, it } from 'vitest';

import { STATIC_CURRENCY_CODES, StaticRateProvider } from './static-rates';

describe('StaticRateProvider', () => {
  let provider: StaticRateProvider;

  beforeEach(() => {
    provider = new StaticRateProvider();
  });

  it('has the correct name', () => {
    expect(provider.name).toBe('Static Rates');
  });

  it('is always available', async () => {
    expect(await provider.isAvailable()).toBe(true);
  });

  it('supports at least 30 currencies', () => {
    expect(STATIC_CURRENCY_CODES.length).toBeGreaterThanOrEqual(30);
  });

  describe('fetchRate', () => {
    it('returns 1 for same currency', async () => {
      expect(await provider.fetchRate('USD', 'USD')).toBe(1);
      expect(await provider.fetchRate('EUR', 'EUR')).toBe(1);
    });

    it('returns a positive rate for valid pairs', async () => {
      const rate = await provider.fetchRate('USD', 'EUR');
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(2); // EUR/USD is roughly 0.9
    });

    it('returns the inverse rate for swapped pairs', async () => {
      const usdToEur = await provider.fetchRate('USD', 'EUR');
      const eurToUsd = await provider.fetchRate('EUR', 'USD');
      expect(usdToEur * eurToUsd).toBeCloseTo(1, 5);
    });

    it('computes cross-rates correctly', async () => {
      const eurToGbp = await provider.fetchRate('EUR', 'GBP');
      const usdToGbp = await provider.fetchRate('USD', 'GBP');
      const usdToEur = await provider.fetchRate('USD', 'EUR');
      // EUR→GBP should equal (USD→GBP) / (USD→EUR)
      expect(eurToGbp).toBeCloseTo(usdToGbp / usdToEur, 5);
    });

    it('throws for unsupported source currency', async () => {
      await expect(provider.fetchRate('XYZ', 'USD')).rejects.toThrow('Unsupported currency: XYZ');
    });

    it('throws for unsupported target currency', async () => {
      await expect(provider.fetchRate('USD', 'XYZ')).rejects.toThrow('Unsupported currency: XYZ');
    });
  });

  describe('fetchRates', () => {
    it('returns rates for all supported currencies except the base', async () => {
      const rates = await provider.fetchRates('USD');
      const codes = Object.keys(rates);
      expect(codes).not.toContain('USD');
      // Should have all currencies minus the base
      expect(codes.length).toBe(STATIC_CURRENCY_CODES.length - 1);
    });

    it('returns 1-based rate for USD base', async () => {
      const rates = await provider.fetchRates('USD');
      // EUR rate from USD should be ~0.92
      expect(rates['EUR']).toBeCloseTo(0.92, 1);
    });

    it('works with non-USD base', async () => {
      const rates = await provider.fetchRates('EUR');
      // USD from EUR should be ~1.087 (1/0.92)
      expect(rates['USD']).toBeCloseTo(1 / 0.92, 1);
    });

    it('throws for unsupported base currency', async () => {
      await expect(provider.fetchRates('XYZ')).rejects.toThrow('Unsupported currency: XYZ');
    });
  });
});
