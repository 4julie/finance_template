// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';
import {
  addNoise,
  anonymizeBatch,
  anonymizeSpending,
  consumeBudget,
  createPrivacyBudget,
  generateLaplaceNoise,
  remainingBudget,
  roundToNearest50Dollars,
} from '../anonymization';

describe('roundToNearest50Dollars', () => {
  it('rounds $123 (12300 cents) to $100 (10000 cents)', () => {
    expect(roundToNearest50Dollars(12300)).toBe(10000);
  });

  it('rounds $175 (17500 cents) to $200 (20000 cents)', () => {
    expect(roundToNearest50Dollars(17500)).toBe(20000);
  });

  it('rounds $0 to $0', () => {
    expect(roundToNearest50Dollars(0)).toBe(0);
  });

  it('rounds $25 (2500 cents) to $0 (banker rounding: 0.5 rounds to even)', () => {
    expect(roundToNearest50Dollars(2500)).toBe(0);
  });

  it('rounds $75 (7500 cents) to $100 (banker rounding: 1.5 rounds to 2)', () => {
    expect(roundToNearest50Dollars(7500)).toBe(10000);
  });
});

describe('generateLaplaceNoise', () => {
  it('generates deterministic noise with fixed random source', () => {
    const noise = generateLaplaceNoise(5000, 0.5, () => 0.5);
    // u = 0.0, noise should be 0
    expect(noise).toBe(0);
  });

  it('throws for non-positive epsilon', () => {
    expect(() => generateLaplaceNoise(5000, 0)).toThrow('Epsilon must be positive');
    expect(() => generateLaplaceNoise(5000, -1)).toThrow('Epsilon must be positive');
  });

  it('produces integer output (Banker rounded)', () => {
    const noise = generateLaplaceNoise(5000, 0.5, () => 0.7);
    expect(Number.isInteger(noise)).toBe(true);
  });
});

describe('addNoise', () => {
  it('never returns negative values', () => {
    // Force large negative noise by using a small random value
    const result = addNoise(100, 50000, 0.1, () => 0.01);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('returns a number', () => {
    const result = addNoise(50000, 5000, 1.0, () => 0.5);
    expect(typeof result).toBe('number');
  });
});

describe('Privacy budget', () => {
  it('creates budget with default max', () => {
    const budget = createPrivacyBudget();
    expect(budget.spent).toBe(0);
    expect(budget.max).toBe(1.0);
  });

  it('creates budget with custom max', () => {
    const budget = createPrivacyBudget(2.0);
    expect(budget.max).toBe(2.0);
  });

  it('consumes budget', () => {
    const budget = createPrivacyBudget(1.0);
    const updated = consumeBudget(budget, 0.3);
    expect(updated.spent).toBeCloseTo(0.3);
    expect(remainingBudget(updated)).toBeCloseTo(0.7);
  });

  it('throws when budget exceeded', () => {
    const budget = createPrivacyBudget(0.5);
    expect(() => consumeBudget(budget, 0.6)).toThrow('Privacy budget exceeded');
  });

  it('allows exact budget consumption', () => {
    const budget = createPrivacyBudget(1.0);
    const updated = consumeBudget(budget, 1.0);
    expect(remainingBudget(updated)).toBe(0);
  });
});

describe('anonymizeSpending', () => {
  it('produces anonymized summary with category and month', () => {
    const result = anonymizeSpending(
      { category: 'food', amountCents: 45000, month: '2024-03' },
      0.5,
      5000,
      () => 0.5, // zero noise
    );

    expect(result.category).toBe('food');
    expect(result.month).toBe('2024-03');
    // 45000 rounds to 45000 -> nearest 5000 = 45000
    expect(result.roundedAmountCents % 5000).toBe(0);
  });

  it('never exposes raw amounts', () => {
    const raw = { category: 'housing' as const, amountCents: 123456, month: '2024-01' };
    const result = anonymizeSpending(raw, 0.5, 5000, () => 0.5);
    // The anonymized amount should be rounded to $50 granularity
    expect(result.roundedAmountCents % 5000).toBe(0);
    expect(result.roundedAmountCents).not.toBe(123456);
  });
});

describe('anonymizeBatch', () => {
  it('anonymizes records within budget', () => {
    const records = [
      { category: 'food' as const, amountCents: 30000, month: '2024-01' },
      { category: 'housing' as const, amountCents: 80000, month: '2024-01' },
      { category: 'transport' as const, amountCents: 15000, month: '2024-01' },
    ];

    const budget = createPrivacyBudget(1.0);
    const [results, updatedBudget] = anonymizeBatch(records, 0.3, budget, 5000, () => 0.5);

    expect(results).toHaveLength(3);
    expect(updatedBudget.spent).toBeCloseTo(0.9);
  });

  it('stops when budget exhausted', () => {
    const records = [
      { category: 'food' as const, amountCents: 30000, month: '2024-01' },
      { category: 'housing' as const, amountCents: 80000, month: '2024-01' },
      { category: 'transport' as const, amountCents: 15000, month: '2024-01' },
    ];

    const budget = createPrivacyBudget(0.5);
    const [results, updatedBudget] = anonymizeBatch(records, 0.3, budget, 5000, () => 0.5);

    // Only 1 record fits (0.3 <= 0.5), second would be 0.6 > 0.5
    expect(results).toHaveLength(1);
    expect(updatedBudget.spent).toBeCloseTo(0.3);
  });
});
