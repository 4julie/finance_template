// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import {
  calculateQuarterlyEstimates,
  calculateSafeHarborEstimates,
  calculateUnderpaymentPenalty,
  isQuarterlyRequired,
  getQuarterlyDueDate,
} from './quarterly-estimates';

describe('quarterly-estimates', () => {
  describe('calculateQuarterlyEstimates', () => {
    it('test vector: $120,000 annual tax', () => {
      // $120,000 / 4 = $30,000 per quarter
      const estimates = calculateQuarterlyEstimates(12_000_000, 2024);

      expect(estimates).toHaveLength(4);
      expect(estimates[0].quarter).toBe(1);
      expect(estimates[0].dueDate).toBe('2024-04-15');
      expect(estimates[0].payment).toBe(3_000_000);
      expect(estimates[1].dueDate).toBe('2024-06-15');
      expect(estimates[2].dueDate).toBe('2024-09-15');
      expect(estimates[3].dueDate).toBe('2025-01-15');
    });

    it('divides annual tax equally across quarters', () => {
      const estimates = calculateQuarterlyEstimates(10_000_000, 2024);
      const expected = Math.round(10_000_000 / 4);

      for (const est of estimates) {
        expect(est.payment).toBe(expected);
      }
    });

    it('handles odd amounts with rounding', () => {
      // $10,001 / 4 = $2,500.25, rounds to $2,500
      const estimates = calculateQuarterlyEstimates(10_001_00, 2024);
      const totalPayment = estimates.reduce((sum, est) => sum + est.payment, 0);
      expect(totalPayment).toBeLessThanOrEqual(10_001_00);
      expect(totalPayment).toBeGreaterThan(10_000_00 - 10_000);
    });

    it('Q4 due date is next year', () => {
      const estimates = calculateQuarterlyEstimates(4_000_000, 2024);
      expect(estimates[3].dueDate).toBe('2025-01-15');
    });
  });

  describe('calculateSafeHarborEstimates', () => {
    it('uses 100% safe harbor when AGI ≤ $150,000', () => {
      // Prior year: $12,000 tax, $100,000 AGI
      // Safe harbor: 100% = $12,000
      // Per quarter: $3,000
      const estimates = calculateSafeHarborEstimates(12_000_00, 100_000_00, 2024);

      expect(estimates[0].payment).toBe(3_000_00);
    });

    it('uses 110% safe harbor when AGI > $150,000', () => {
      // Prior year: $15,000 tax, $200,000 AGI
      // Safe harbor: 110% = $16,500
      // Per quarter: $4,125
      const estimates = calculateSafeHarborEstimates(15_000_00, 200_000_00, 2024);

      const expected = Math.round((15_000_00 * 1.1) / 4);
      expect(estimates[0].payment).toBe(expected);
    });

    it('test vector: $120,000 projected income', () => {
      // Assume prior year: $15,000 tax, $100,000 AGI
      // Safe harbor (100%): $15,000
      const estimates = calculateSafeHarborEstimates(15_000_00, 100_000_00, 2024);

      expect(estimates).toHaveLength(4);
      const quarterly = Math.round(15_000_00 / 4);
      for (const est of estimates) {
        expect(est.payment).toBe(quarterly);
      }
    });

    it('threshold boundary at $150,000 AGI', () => {
      const low = calculateSafeHarborEstimates(12_000_00, 150_000_00, 2024);
      const high = calculateSafeHarborEstimates(12_000_00, 150_000_01, 2024);

      expect(low[0].payment).toBeLessThan(high[0].payment);
    });
  });

  describe('calculateUnderpaymentPenalty', () => {
    it('no penalty when payments meet requirement', () => {
      const penalty = calculateUnderpaymentPenalty(16_000_00, 16_000_00);
      expect(penalty).toBe(0);
    });

    it('calculates penalty on shortfall', () => {
      // Required: $4,000, Paid: $3,000, Shortfall: $1,000
      // At ~8% annual rate for 365 days: $80
      const penalty = calculateUnderpaymentPenalty(400_000, 300_000, 365);
      expect(penalty).toBeGreaterThan(0);
      expect(penalty).toBeLessThan(100_000); // Less than 25% of shortfall
    });

    it('penalty increases with shortfall duration', () => {
      const penalty90 = calculateUnderpaymentPenalty(400_000, 300_000, 90);
      const penalty365 = calculateUnderpaymentPenalty(400_000, 300_000, 365);

      expect(penalty365).toBeGreaterThan(penalty90);
    });

    it('penalty scales with shortfall amount', () => {
      const small = calculateUnderpaymentPenalty(100_000, 50_000, 365);
      const large = calculateUnderpaymentPenalty(1_000_000, 500_000, 365);

      expect(large).toBeGreaterThan(small);
      expect(large).toBeCloseTo(small * 10, -1);
    });
  });

  describe('isQuarterlyRequired', () => {
    it('not required for $900 tax', () => {
      expect(isQuarterlyRequired(90_000)).toBe(false);
    });

    it('required for $1,001 tax', () => {
      expect(isQuarterlyRequired(100_100)).toBe(true);
    });

    it('boundary at $1,000 threshold', () => {
      expect(isQuarterlyRequired(100_000)).toBe(false);
      expect(isQuarterlyRequired(100_001)).toBe(true);
    });

    it('required for high tax liability', () => {
      expect(isQuarterlyRequired(50_000_00)).toBe(true);
    });
  });

  describe('getQuarterlyDueDate', () => {
    it('Q1 due 04-15', () => {
      expect(getQuarterlyDueDate(1, 2024)).toBe('2024-04-15');
    });

    it('Q2 due 06-15', () => {
      expect(getQuarterlyDueDate(2, 2024)).toBe('2024-06-15');
    });

    it('Q3 due 09-15', () => {
      expect(getQuarterlyDueDate(3, 2024)).toBe('2024-09-15');
    });

    it('Q4 due 01-15 next year', () => {
      expect(getQuarterlyDueDate(4, 2024)).toBe('2025-01-15');
    });

    it('throws on invalid quarter', () => {
      expect(() => getQuarterlyDueDate(0, 2024)).toThrow();
      expect(() => getQuarterlyDueDate(5, 2024)).toThrow();
    });
  });
});
