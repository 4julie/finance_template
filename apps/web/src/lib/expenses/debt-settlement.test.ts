// ---------------------------------------------------------------------------
// Tests — Debt Settlement & Simplification Engine (#1793)
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';
import type { DebtAccount } from './types';
import {
  analyzeConsolidation,
  comparePayoffStrategies,
  createNegotiationEntry,
  estimateCreditImpact,
  evaluateLumpSumOffer,
  evaluatePaymentPlanOffer,
} from './debt-settlement';

// ── Fixtures ───────────────────────────────────────────────────────────────

const cc: DebtAccount = {
  id: 'cc-1',
  name: 'Credit Card',
  balanceCents: 500_000,
  annualRateBps: 2000,
  minimumPaymentCents: 15_000,
  originationDate: '2023-01-01',
};

const auto: DebtAccount = {
  id: 'auto-1',
  name: 'Auto Loan',
  balanceCents: 1_000_000,
  annualRateBps: 500,
  minimumPaymentCents: 20_000,
  originationDate: '2023-06-01',
};

const student: DebtAccount = {
  id: 'student-1',
  name: 'Student Loan',
  balanceCents: 2_000_000,
  annualRateBps: 700,
  minimumPaymentCents: 25_000,
  originationDate: '2020-09-01',
};

// ── evaluateLumpSumOffer ───────────────────────────────────────────────────

describe('evaluateLumpSumOffer', () => {
  it('calculates savings correctly', () => {
    const offer = evaluateLumpSumOffer(cc, 300_000);
    expect(offer.debtId).toBe('cc-1');
    expect(offer.originalBalanceCents).toBe(500_000);
    expect(offer.offeredAmountCents).toBe(300_000);
    expect(offer.savingsCents).toBe(200_000);
    expect(offer.savingsPercent).toBe(40);
    expect(offer.offerType).toBe('lump-sum');
  });

  it('handles offer equal to balance', () => {
    const offer = evaluateLumpSumOffer(cc, 500_000);
    expect(offer.savingsCents).toBe(0);
    expect(offer.savingsPercent).toBe(0);
  });

  it('handles offer exceeding balance (negative savings)', () => {
    const offer = evaluateLumpSumOffer(cc, 600_000);
    expect(offer.savingsCents).toBe(-100_000);
  });

  it('handles zero balance debt', () => {
    const zeroDebt = { ...cc, balanceCents: 0 };
    const offer = evaluateLumpSumOffer(zeroDebt, 0);
    expect(offer.savingsPercent).toBe(0);
  });
});

// ── evaluatePaymentPlanOffer ───────────────────────────────────────────────

describe('evaluatePaymentPlanOffer', () => {
  it('calculates payment plan correctly', () => {
    const offer = evaluatePaymentPlanOffer(cc, 12, 30_000);
    expect(offer.offerType).toBe('payment-plan');
    expect(offer.installments).toBe(12);
    expect(offer.installmentAmountCents).toBe(30_000);
    expect(offer.offeredAmountCents).toBe(360_000);
    expect(offer.savingsCents).toBe(140_000);
  });

  it('throws for zero installments', () => {
    expect(() => evaluatePaymentPlanOffer(cc, 0, 30_000)).toThrow('Installments must be > 0');
  });
});

// ── estimateCreditImpact ───────────────────────────────────────────────────

describe('estimateCreditImpact', () => {
  it('paid-in-full has minimal impact', () => {
    const impact = estimateCreditImpact('paid-in-full', 500_000, 2_000_000);
    expect(impact.impactLevel).toBe('minimal');
    expect(impact.recoveryMonths).toBeLessThanOrEqual(3);
  });

  it('settlement has moderate/significant impact', () => {
    const impact = estimateCreditImpact('settlement', 500_000, 2_000_000);
    expect(['moderate', 'significant']).toContain(impact.impactLevel);
  });

  it('high-utilisation settlement is significant', () => {
    const impact = estimateCreditImpact('settlement', 800_000, 1_000_000);
    expect(impact.impactLevel).toBe('significant');
    expect(impact.recoveryMonths).toBeGreaterThanOrEqual(12);
  });

  it('consolidation has moderate impact', () => {
    const impact = estimateCreditImpact('consolidation', 500_000, 2_000_000);
    expect(impact.impactLevel).toBe('moderate');
  });

  it('unknown action has minimal impact', () => {
    const impact = estimateCreditImpact('balance transfer', 500_000, 2_000_000);
    expect(impact.impactLevel).toBe('minimal');
  });
});

// ── analyzeConsolidation ───────────────────────────────────────────────────

describe('analyzeConsolidation', () => {
  it('recommends consolidation when rate is lower', () => {
    const analysis = analyzeConsolidation([cc, auto], 400, 40_000);
    expect(analysis.consolidatedBalanceCents).toBe(1_500_000);
    expect(analysis.interestSavingsCents).toBeGreaterThan(0);
    expect(analysis.isRecommended).toBe(true);
  });

  it('does not recommend when consolidated rate is higher', () => {
    const analysis = analyzeConsolidation([auto], 2000, 20_000);
    expect(analysis.isRecommended).toBe(false);
  });

  it('handles empty debts', () => {
    const analysis = analyzeConsolidation([], 500, 10_000);
    expect(analysis.consolidatedBalanceCents).toBe(0);
    expect(analysis.isRecommended).toBe(false);
  });
});

// ── comparePayoffStrategies ────────────────────────────────────────────────

describe('comparePayoffStrategies', () => {
  it('returns 3 strategies', () => {
    const strategies = comparePayoffStrategies([cc, auto], 50_000);
    expect(strategies).toHaveLength(3);
    expect(strategies.map((s) => s.strategy)).toEqual(['avalanche', 'snowball', 'settlement']);
  });

  it('avalanche pays less interest than snowball (or equal)', () => {
    const strategies = comparePayoffStrategies([cc, auto, student], 70_000);
    const avalanche = strategies.find((s) => s.strategy === 'avalanche')!;
    const snowball = strategies.find((s) => s.strategy === 'snowball')!;
    expect(avalanche.totalInterestCents).toBeLessThanOrEqual(snowball.totalInterestCents);
  });

  it('settlement has zero interest', () => {
    const strategies = comparePayoffStrategies([cc], 50_000, 60);
    const settlement = strategies.find((s) => s.strategy === 'settlement')!;
    expect(settlement.totalInterestCents).toBe(0);
    // 60% of 500_000 = 300_000; at 50_000/mo = 6 months
    expect(settlement.totalPaidCents).toBe(300_000);
    expect(settlement.payoffMonths).toBe(6);
  });

  it('returns empty for no debts', () => {
    expect(comparePayoffStrategies([], 50_000)).toEqual([]);
  });
});

// ── createNegotiationEntry ─────────────────────────────────────────────────

describe('createNegotiationEntry', () => {
  it('creates a valid entry', () => {
    const entry = createNegotiationEntry(
      'cc-1',
      '2024-06-15',
      300_000,
      'pending',
      'Initial offer sent',
    );
    expect(entry.debtId).toBe('cc-1');
    expect(entry.status).toBe('pending');
    expect(entry.counterOfferCents).toBeUndefined();
  });

  it('includes counter offer', () => {
    const entry = createNegotiationEntry(
      'cc-1',
      '2024-06-20',
      300_000,
      'countered',
      'Creditor countered',
      350_000,
    );
    expect(entry.counterOfferCents).toBe(350_000);
    expect(entry.status).toBe('countered');
  });
});
