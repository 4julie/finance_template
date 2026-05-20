// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';

import {
  evaluateAmountCondition,
  evaluateCategoryCondition,
  evaluateMerchantCondition,
  evaluateDateRangeCondition,
  evaluateRecurringCondition,
  evaluateAccountCondition,
  evaluateCondition,
  matchesPattern,
} from '../conditions';

import type { Transaction, RuleCondition } from '../types';

// ---------------------------------------------------------------------------
// Test fixture
// ---------------------------------------------------------------------------

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    amountCents: -4999,
    categoryId: 'cat-groceries',
    categoryName: 'Groceries',
    merchantName: 'Whole Foods Market',
    date: '2025-03-15',
    isRecurring: false,
    accountId: 'acct-checking',
    accountName: 'Primary Checking',
    tags: ['imported'],
    note: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

describe('matchesPattern', () => {
  it('matches substring case-insensitively', () => {
    expect(matchesPattern('Whole Foods Market', 'whole foods', 'substring')).toBe(true);
  });

  it('rejects non-matching substring', () => {
    expect(matchesPattern('Target', 'whole foods', 'substring')).toBe(false);
  });

  it('matches starts_with case-insensitively', () => {
    expect(matchesPattern('Whole Foods Market', 'whole', 'starts_with')).toBe(true);
  });

  it('rejects starts_with when only a middle match', () => {
    expect(matchesPattern('Whole Foods Market', 'foods', 'starts_with')).toBe(false);
  });

  it('matches exact case-insensitively', () => {
    expect(matchesPattern('Groceries', 'groceries', 'exact')).toBe(true);
  });

  it('rejects exact when partial', () => {
    expect(matchesPattern('Groceries Plus', 'groceries', 'exact')).toBe(false);
  });

  it('matches regex', () => {
    expect(matchesPattern('Whole Foods #123', '^Whole Foods', 'regex')).toBe(true);
  });

  it('returns false for invalid regex', () => {
    expect(matchesPattern('test', '[invalid', 'regex')).toBe(false);
  });

  it('regex is case-sensitive by default', () => {
    expect(matchesPattern('whole foods', '^Whole', 'regex')).toBe(false);
  });

  it('regex with case-insensitive flag via constructor', () => {
    // JS does not support inline (?i) — users must write case-insensitive
    // patterns explicitly (e.g. [Ww]hole or use substring mode instead).
    expect(matchesPattern('whole foods', '^[Ww]hole', 'regex')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Amount conditions
// ---------------------------------------------------------------------------

describe('evaluateAmountCondition', () => {
  const tx = makeTx({ amountCents: -5000 }); // $50 expense

  it('greater_than matches when abs amount exceeds threshold', () => {
    expect(
      evaluateAmountCondition(tx, { type: 'amount', operator: 'greater_than', valueCents: 4999 }),
    ).toBe(true);
  });

  it('greater_than rejects equal amounts', () => {
    expect(
      evaluateAmountCondition(tx, { type: 'amount', operator: 'greater_than', valueCents: 5000 }),
    ).toBe(false);
  });

  it('less_than matches when abs amount is below threshold', () => {
    expect(
      evaluateAmountCondition(tx, { type: 'amount', operator: 'less_than', valueCents: 5001 }),
    ).toBe(true);
  });

  it('equal matches exact abs amount', () => {
    expect(
      evaluateAmountCondition(tx, { type: 'amount', operator: 'equal', valueCents: 5000 }),
    ).toBe(true);
  });

  it('greater_or_equal matches at boundary', () => {
    expect(
      evaluateAmountCondition(tx, {
        type: 'amount',
        operator: 'greater_or_equal',
        valueCents: 5000,
      }),
    ).toBe(true);
  });

  it('less_or_equal matches at boundary', () => {
    expect(
      evaluateAmountCondition(tx, { type: 'amount', operator: 'less_or_equal', valueCents: 5000 }),
    ).toBe(true);
  });

  it('between matches inclusive range', () => {
    expect(
      evaluateAmountCondition(tx, {
        type: 'amount',
        operator: 'between',
        valueCents: 4000,
        upperBoundCents: 6000,
      }),
    ).toBe(true);
  });

  it('between rejects out-of-range', () => {
    expect(
      evaluateAmountCondition(tx, {
        type: 'amount',
        operator: 'between',
        valueCents: 5001,
        upperBoundCents: 6000,
      }),
    ).toBe(false);
  });

  it('uses absolute value for negative amounts', () => {
    expect(
      evaluateAmountCondition(makeTx({ amountCents: -100 }), {
        type: 'amount',
        operator: 'equal',
        valueCents: 100,
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Category conditions
// ---------------------------------------------------------------------------

describe('evaluateCategoryCondition', () => {
  it('matches by category name substring', () => {
    expect(
      evaluateCategoryCondition(makeTx(), {
        type: 'category',
        pattern: 'grocer',
        mode: 'substring',
      }),
    ).toBe(true);
  });

  it('returns false when category is null', () => {
    expect(
      evaluateCategoryCondition(makeTx({ categoryName: null, categoryId: null }), {
        type: 'category',
        pattern: 'grocer',
        mode: 'substring',
      }),
    ).toBe(false);
  });

  it('falls back to categoryId when name is null', () => {
    expect(
      evaluateCategoryCondition(makeTx({ categoryName: null, categoryId: 'cat-groceries' }), {
        type: 'category',
        pattern: 'cat-groceries',
        mode: 'exact',
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Merchant conditions
// ---------------------------------------------------------------------------

describe('evaluateMerchantCondition', () => {
  it('matches merchant by substring', () => {
    expect(
      evaluateMerchantCondition(makeTx(), {
        type: 'merchant',
        pattern: 'whole foods',
        mode: 'substring',
      }),
    ).toBe(true);
  });

  it('returns false when merchantName is null', () => {
    expect(
      evaluateMerchantCondition(makeTx({ merchantName: null }), {
        type: 'merchant',
        pattern: 'anything',
        mode: 'substring',
      }),
    ).toBe(false);
  });

  it('matches using regex', () => {
    expect(
      evaluateMerchantCondition(makeTx({ merchantName: 'AMZN*Mktp US' }), {
        type: 'merchant',
        pattern: '^AMZN\\*',
        mode: 'regex',
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Date range conditions
// ---------------------------------------------------------------------------

describe('evaluateDateRangeCondition', () => {
  it('matches a date within the range', () => {
    expect(
      evaluateDateRangeCondition(makeTx({ date: '2025-03-15' }), {
        type: 'date_range',
        startDate: '2025-03-01',
        endDate: '2025-03-31',
      }),
    ).toBe(true);
  });

  it('matches inclusive boundaries', () => {
    expect(
      evaluateDateRangeCondition(makeTx({ date: '2025-03-01' }), {
        type: 'date_range',
        startDate: '2025-03-01',
        endDate: '2025-03-31',
      }),
    ).toBe(true);
  });

  it('rejects dates outside the range', () => {
    expect(
      evaluateDateRangeCondition(makeTx({ date: '2025-04-01' }), {
        type: 'date_range',
        startDate: '2025-03-01',
        endDate: '2025-03-31',
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Recurring conditions
// ---------------------------------------------------------------------------

describe('evaluateRecurringCondition', () => {
  it('matches recurring transactions', () => {
    expect(
      evaluateRecurringCondition(makeTx({ isRecurring: true }), {
        type: 'recurring',
        isRecurring: true,
      }),
    ).toBe(true);
  });

  it('rejects non-recurring when looking for recurring', () => {
    expect(
      evaluateRecurringCondition(makeTx({ isRecurring: false }), {
        type: 'recurring',
        isRecurring: true,
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Account conditions
// ---------------------------------------------------------------------------

describe('evaluateAccountCondition', () => {
  it('matches by account name', () => {
    expect(
      evaluateAccountCondition(makeTx(), {
        type: 'account',
        pattern: 'primary',
        mode: 'substring',
      }),
    ).toBe(true);
  });

  it('falls back to accountId when name is null', () => {
    expect(
      evaluateAccountCondition(makeTx({ accountName: null }), {
        type: 'account',
        pattern: 'acct-checking',
        mode: 'exact',
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Compound conditions
// ---------------------------------------------------------------------------

describe('evaluateCondition (compound)', () => {
  const tx = makeTx();

  it('AND: all children must match', () => {
    const condition: RuleCondition = {
      type: 'and',
      children: [
        { type: 'merchant', pattern: 'whole foods', mode: 'substring' },
        { type: 'amount', operator: 'greater_than', valueCents: 1000 },
      ],
    };
    expect(evaluateCondition(tx, condition)).toBe(true);
  });

  it('AND: fails when one child fails', () => {
    const condition: RuleCondition = {
      type: 'and',
      children: [
        { type: 'merchant', pattern: 'whole foods', mode: 'substring' },
        { type: 'amount', operator: 'greater_than', valueCents: 99999 },
      ],
    };
    expect(evaluateCondition(tx, condition)).toBe(false);
  });

  it('OR: passes when any child matches', () => {
    const condition: RuleCondition = {
      type: 'or',
      children: [
        { type: 'merchant', pattern: 'target', mode: 'substring' },
        { type: 'merchant', pattern: 'whole foods', mode: 'substring' },
      ],
    };
    expect(evaluateCondition(tx, condition)).toBe(true);
  });

  it('OR: fails when no children match', () => {
    const condition: RuleCondition = {
      type: 'or',
      children: [
        { type: 'merchant', pattern: 'target', mode: 'substring' },
        { type: 'merchant', pattern: 'costco', mode: 'substring' },
      ],
    };
    expect(evaluateCondition(tx, condition)).toBe(false);
  });

  it('NOT: inverts a matching child', () => {
    const condition: RuleCondition = {
      type: 'not',
      children: [{ type: 'merchant', pattern: 'whole foods', mode: 'substring' }],
    };
    expect(evaluateCondition(tx, condition)).toBe(false);
  });

  it('NOT: inverts a non-matching child', () => {
    const condition: RuleCondition = {
      type: 'not',
      children: [{ type: 'merchant', pattern: 'target', mode: 'substring' }],
    };
    expect(evaluateCondition(tx, condition)).toBe(true);
  });

  it('nested compound: AND(OR(...), NOT(...))', () => {
    const condition: RuleCondition = {
      type: 'and',
      children: [
        {
          type: 'or',
          children: [
            { type: 'merchant', pattern: 'whole foods', mode: 'substring' },
            { type: 'merchant', pattern: 'trader joe', mode: 'substring' },
          ],
        },
        {
          type: 'not',
          children: [{ type: 'recurring', isRecurring: true }],
        },
      ],
    };
    expect(evaluateCondition(tx, condition)).toBe(true);
  });
});
