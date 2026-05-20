// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import { calculateRoundUpSavings, calculateSingleRoundUp } from './round-up';
import type { RoundUpConfig } from './types';

describe('round-up', () => {
  describe('calculateSingleRoundUp', () => {
    const dollarConfig: RoundUpConfig = { target: 'dollar', multiplier: 1 };
    const fiveConfig: RoundUpConfig = { target: 'five', multiplier: 1 };
    const tenConfig: RoundUpConfig = { target: 'ten', multiplier: 1 };

    it('rounds up to nearest dollar', () => {
      expect(calculateSingleRoundUp(350, dollarConfig)).toBe(50); // $3.50 → $4.00, saves $0.50
    });

    it('returns 0 when already at exact dollar', () => {
      expect(calculateSingleRoundUp(400, dollarConfig)).toBe(0);
    });

    it('rounds up to nearest $5', () => {
      expect(calculateSingleRoundUp(350, fiveConfig)).toBe(150); // $3.50 → $5.00, saves $1.50
    });

    it('rounds up to nearest $10', () => {
      expect(calculateSingleRoundUp(350, tenConfig)).toBe(650); // $3.50 → $10.00, saves $6.50
    });

    it('returns 0 for zero amount', () => {
      expect(calculateSingleRoundUp(0, dollarConfig)).toBe(0);
    });

    it('returns 0 for negative amount', () => {
      expect(calculateSingleRoundUp(-100, dollarConfig)).toBe(0);
    });

    it('applies multiplier', () => {
      const config: RoundUpConfig = { target: 'dollar', multiplier: 2 };
      expect(calculateSingleRoundUp(350, config)).toBe(100); // $0.50 × 2 = $1.00
    });

    it('handles 1 cent round-up', () => {
      expect(calculateSingleRoundUp(99, dollarConfig)).toBe(1);
    });

    it('handles $9.99 round to $10', () => {
      expect(calculateSingleRoundUp(999, tenConfig)).toBe(1);
    });
  });

  describe('calculateRoundUpSavings', () => {
    const config: RoundUpConfig = { target: 'dollar', multiplier: 1 };

    it('calculates total round-ups for multiple transactions', () => {
      const transactions = [
        { amountCents: 350 }, // → 50
        { amountCents: 725 }, // → 75
        { amountCents: 199 }, // → 1
      ];

      const result = calculateRoundUpSavings(transactions, config, 30);

      expect(result.totalCents).toBe(126);
      expect(result.averageCents).toBe(42);
    });

    it('returns zeros for empty transactions', () => {
      const result = calculateRoundUpSavings([], config, 30);

      expect(result.totalCents).toBe(0);
      expect(result.averageCents).toBe(0);
      expect(result.projectedAnnualCents).toBe(0);
    });

    it('projects annual savings', () => {
      const transactions = [
        { amountCents: 350 }, // → 50
        { amountCents: 250 }, // → 50
      ];

      const result = calculateRoundUpSavings(transactions, config, 7);

      expect(result.totalCents).toBe(100);
      // dailyRate = 100/7 ≈ 14.28, annual ≈ 14.28 × 365 ≈ 5214
      expect(result.projectedAnnualCents).toBeGreaterThan(5000);
    });

    it('handles period of 0 days by using 1', () => {
      const transactions = [{ amountCents: 350 }];
      const result = calculateRoundUpSavings(transactions, config, 0);

      expect(result.projectedAnnualCents).toBeGreaterThan(0);
    });
  });
});
