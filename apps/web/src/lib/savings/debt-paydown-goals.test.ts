// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import { calculateDebtPaydown, calculateExtraPaymentImpact } from './debt-paydown-goals';
import type { DebtPaydownGoal } from './types';

const fixedDate = new Date('2025-01-01');

const sampleGoal: DebtPaydownGoal = {
  id: 'goal-1',
  accountId: 'acct-1',
  originalBalanceCents: 1_000_000, // $10,000
  currentBalanceCents: 600_000, // $6,000
  monthlyPaymentCents: 50_000, // $500/mo
  annualRateBps: 1500, // 15%
};

describe('debt-paydown-goals', () => {
  describe('calculateDebtPaydown', () => {
    it('calculates completion percentage', () => {
      const result = calculateDebtPaydown(sampleGoal, fixedDate);

      expect(result.completionPercent).toBe(40); // 4000/10000
      expect(result.paidOffCents).toBe(400_000);
      expect(result.remainingCents).toBe(600_000);
    });

    it('estimates months to payoff', () => {
      const result = calculateDebtPaydown(sampleGoal, fixedDate);

      // $6,000 at 15% APR with $500/mo payments — should be ~13 months
      expect(result.monthsToPayoff).toBeGreaterThan(10);
      expect(result.monthsToPayoff).toBeLessThan(20);
    });

    it('generates a payoff date', () => {
      const result = calculateDebtPaydown(sampleGoal, fixedDate);

      expect(result.estimatedPayoffDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.estimatedPayoffDate > '2025-01-01').toBe(true);
    });

    it('calculates remaining interest', () => {
      const result = calculateDebtPaydown(sampleGoal, fixedDate);

      expect(result.totalInterestRemainingCents).toBeGreaterThan(0);
    });

    it('handles fully paid off debt', () => {
      const paidOff: DebtPaydownGoal = {
        ...sampleGoal,
        currentBalanceCents: 0,
      };

      const result = calculateDebtPaydown(paidOff, fixedDate);

      expect(result.completionPercent).toBe(100);
      expect(result.monthsToPayoff).toBe(0);
      expect(result.totalInterestRemainingCents).toBe(0);
    });

    it('handles zero original balance', () => {
      const zeroOriginal: DebtPaydownGoal = {
        ...sampleGoal,
        originalBalanceCents: 0,
        currentBalanceCents: 0,
      };

      const result = calculateDebtPaydown(zeroOriginal, fixedDate);
      expect(result.completionPercent).toBe(100);
    });

    it('handles zero interest rate', () => {
      const noInterest: DebtPaydownGoal = {
        ...sampleGoal,
        annualRateBps: 0,
      };

      const result = calculateDebtPaydown(noInterest, fixedDate);

      // $6,000 / $500 = 12 months exactly
      expect(result.monthsToPayoff).toBe(12);
      expect(result.totalInterestRemainingCents).toBe(0);
    });
  });

  describe('calculateExtraPaymentImpact', () => {
    it('shows months and interest saved', () => {
      const impact = calculateExtraPaymentImpact(sampleGoal, 20_000, fixedDate); // $200 extra

      expect(impact.extraPaymentCents).toBe(20_000);
      expect(impact.monthsSaved).toBeGreaterThan(0);
      expect(impact.interestSavedCents).toBeGreaterThan(0);
      expect(impact.newMonthsToPayoff).toBeLessThan(
        calculateDebtPaydown(sampleGoal, fixedDate).monthsToPayoff,
      );
    });

    it('generates a new payoff date', () => {
      const impact = calculateExtraPaymentImpact(sampleGoal, 20_000, fixedDate);

      expect(impact.newPayoffDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        impact.newPayoffDate < calculateDebtPaydown(sampleGoal, fixedDate).estimatedPayoffDate,
      ).toBe(true);
    });

    it('handles zero extra payment', () => {
      const base = calculateDebtPaydown(sampleGoal, fixedDate);
      const impact = calculateExtraPaymentImpact(sampleGoal, 0, fixedDate);

      expect(impact.monthsSaved).toBe(0);
      expect(impact.interestSavedCents).toBe(0);
      expect(impact.newMonthsToPayoff).toBe(base.monthsToPayoff);
    });
  });
});
