// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import { calculateSafeToSpend, getWarningLevel, recalculateAfterSpending } from './safe-to-spend';

describe('safe-to-spend', () => {
  describe('calculateSafeToSpend', () => {
    it('calculates basic safe-to-spend', () => {
      const result = calculateSafeToSpend({
        incomeCents: 500_000, // $5,000
        committedExpensesCents: 300_000, // $3,000
        minimumBalanceFloorCents: 50_000, // $500
        daysRemaining: 30,
      });

      expect(result.totalCents).toBe(150_000); // $1,500
      expect(result.dailyRateCents).toBe(5_000); // $50/day
      expect(result.weeklyRateCents).toBe(35_000); // $350/week
      expect(result.warningLevel).toBe('safe'); // 150k/500k = 0.30 > 0.25
    });

    it('clamps negative safe-to-spend to zero', () => {
      const result = calculateSafeToSpend({
        incomeCents: 300_000,
        committedExpensesCents: 300_000,
        minimumBalanceFloorCents: 50_000,
        daysRemaining: 30,
      });

      expect(result.totalCents).toBe(0);
      expect(result.dailyRateCents).toBe(0);
      expect(result.weeklyRateCents).toBe(0);
      expect(result.warningLevel).toBe('critical');
    });

    it('handles zero days remaining by using 1', () => {
      const result = calculateSafeToSpend({
        incomeCents: 500_000,
        committedExpensesCents: 200_000,
        minimumBalanceFloorCents: 0,
        daysRemaining: 0,
      });

      expect(result.totalCents).toBe(300_000);
      expect(result.dailyRateCents).toBe(300_000);
    });

    it('returns safe warning for high ratio', () => {
      const result = calculateSafeToSpend({
        incomeCents: 500_000,
        committedExpensesCents: 100_000,
        minimumBalanceFloorCents: 0,
        daysRemaining: 30,
      });

      expect(result.warningLevel).toBe('safe');
    });

    it('returns warning level when close to floor', () => {
      const result = calculateSafeToSpend({
        incomeCents: 500_000,
        committedExpensesCents: 460_000,
        minimumBalanceFloorCents: 0,
        daysRemaining: 30,
      });

      // 40_000 / 500_000 = 0.08 → warning
      expect(result.warningLevel).toBe('warning');
    });
  });

  describe('getWarningLevel', () => {
    it('returns critical for zero income', () => {
      expect(getWarningLevel(100, 0)).toBe('critical');
    });

    it('returns critical when safe is zero', () => {
      expect(getWarningLevel(0, 500_000)).toBe('critical');
    });

    it('returns warning at 10% boundary', () => {
      expect(getWarningLevel(50_000, 500_000)).toBe('warning');
    });

    it('returns caution between 10% and 25%', () => {
      expect(getWarningLevel(100_000, 500_000)).toBe('caution');
    });

    it('returns safe above 25%', () => {
      expect(getWarningLevel(200_000, 500_000)).toBe('safe');
    });
  });

  describe('recalculateAfterSpending', () => {
    it('reduces safe-to-spend by amount spent', () => {
      const original = calculateSafeToSpend({
        incomeCents: 500_000,
        committedExpensesCents: 200_000,
        minimumBalanceFloorCents: 0,
        daysRemaining: 30,
      });

      const result = recalculateAfterSpending(original, 100_000, 500_000, 20);

      expect(result.totalCents).toBe(200_000);
      expect(result.dailyRateCents).toBe(10_000);
    });

    it('clamps to zero when overspent', () => {
      const original = calculateSafeToSpend({
        incomeCents: 500_000,
        committedExpensesCents: 200_000,
        minimumBalanceFloorCents: 0,
        daysRemaining: 30,
      });

      const result = recalculateAfterSpending(original, 400_000, 500_000, 10);

      expect(result.totalCents).toBe(0);
      expect(result.dailyRateCents).toBe(0);
      expect(result.warningLevel).toBe('critical');
    });
  });
});
