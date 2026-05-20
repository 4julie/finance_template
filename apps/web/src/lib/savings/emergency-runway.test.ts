// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import { calculateEmergencyRunway, getRunwayStatus } from './emergency-runway';

describe('emergency-runway', () => {
  describe('getRunwayStatus', () => {
    it('returns critical for less than 1 month', () => {
      expect(getRunwayStatus(0.5)).toBe('critical');
    });

    it('returns insufficient for 1-2 months', () => {
      expect(getRunwayStatus(1)).toBe('insufficient');
      expect(getRunwayStatus(2.5)).toBe('insufficient');
    });

    it('returns adequate for 3-5 months', () => {
      expect(getRunwayStatus(3)).toBe('adequate');
      expect(getRunwayStatus(5.9)).toBe('adequate');
    });

    it('returns strong for 6+ months', () => {
      expect(getRunwayStatus(6)).toBe('strong');
      expect(getRunwayStatus(12)).toBe('strong');
    });
  });

  describe('calculateEmergencyRunway', () => {
    it('calculates months of coverage', () => {
      const result = calculateEmergencyRunway({
        emergencyFundCents: 1_200_000, // $12,000
        monthlyExpensesCents: 400_000, // $4,000/mo
        essentialExpensesCents: 250_000, // $2,500/mo
        monthlySavingsRateCents: 50_000, // $500/mo
      });

      expect(result.totalExpenseMonths).toBe(3);
      expect(result.essentialExpenseMonths).toBe(4.8);
      expect(result.status).toBe('adequate');
    });

    it('projects months to target', () => {
      const result = calculateEmergencyRunway({
        emergencyFundCents: 600_000, // $6,000
        monthlyExpensesCents: 400_000, // $4,000/mo — need $24,000 for 6 months
        essentialExpensesCents: 250_000,
        monthlySavingsRateCents: 100_000, // $1,000/mo
      });

      // Need $24,000 - $6,000 = $18,000 gap at $1,000/mo = 18 months
      expect(result.monthsToTarget).toBe(18);
      expect(result.status).toBe('insufficient');
    });

    it('returns null monthsToTarget when already at target', () => {
      const result = calculateEmergencyRunway({
        emergencyFundCents: 3_000_000, // $30,000
        monthlyExpensesCents: 400_000, // $4,000/mo — need $24,000
        essentialExpensesCents: 250_000,
        monthlySavingsRateCents: 100_000,
      });

      expect(result.monthsToTarget).toBeNull();
      expect(result.status).toBe('strong');
    });

    it('returns null monthsToTarget when savings rate is zero', () => {
      const result = calculateEmergencyRunway({
        emergencyFundCents: 100_000,
        monthlyExpensesCents: 400_000,
        essentialExpensesCents: 250_000,
        monthlySavingsRateCents: 0,
      });

      expect(result.monthsToTarget).toBeNull();
      expect(result.status).toBe('critical');
    });

    it('handles zero expenses gracefully', () => {
      const result = calculateEmergencyRunway({
        emergencyFundCents: 100_000,
        monthlyExpensesCents: 0,
        essentialExpensesCents: 0,
        monthlySavingsRateCents: 50_000,
      });

      expect(result.totalExpenseMonths).toBe(Infinity);
      expect(result.essentialExpenseMonths).toBe(Infinity);
      expect(result.status).toBe('strong');
    });

    it('handles zero fund and zero expenses', () => {
      const result = calculateEmergencyRunway({
        emergencyFundCents: 0,
        monthlyExpensesCents: 0,
        essentialExpensesCents: 0,
        monthlySavingsRateCents: 0,
      });

      expect(result.totalExpenseMonths).toBe(0);
      expect(result.status).toBe('critical');
    });

    it('accepts custom target months', () => {
      const result = calculateEmergencyRunway(
        {
          emergencyFundCents: 300_000, // $3,000
          monthlyExpensesCents: 400_000, // $4,000/mo
          essentialExpensesCents: 250_000,
          monthlySavingsRateCents: 100_000,
        },
        3, // 3-month target instead of default 6
      );

      // Need $12,000 - $3,000 = $9,000 gap at $1,000/mo = 9 months
      expect(result.monthsToTarget).toBe(9);
    });
  });
});
