// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';

import {
  bankersRound,
  executeCategorize,
  executeAddTag,
  executeSplitTransaction,
  executeMoveToBudget,
  executeFlagForReview,
  executeSendNotification,
  executeAction,
} from '../actions';

import type { Transaction, RuleAction } from '../types';

// ---------------------------------------------------------------------------
// Test fixture
// ---------------------------------------------------------------------------

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    amountCents: -10000, // $100 expense
    categoryId: null,
    categoryName: null,
    merchantName: 'Test Merchant',
    date: '2025-03-15',
    isRecurring: false,
    accountId: 'acct-1',
    accountName: 'Checking',
    tags: ['existing'],
    note: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Banker's rounding
// ---------------------------------------------------------------------------

describe('bankersRound', () => {
  it('rounds 2.5 to 2 (even)', () => {
    expect(bankersRound(2.5)).toBe(2);
  });

  it('rounds 3.5 to 4 (even)', () => {
    expect(bankersRound(3.5)).toBe(4);
  });

  it('rounds 2.4 down', () => {
    expect(bankersRound(2.4)).toBe(2);
  });

  it('rounds 2.6 up', () => {
    expect(bankersRound(2.6)).toBe(3);
  });

  it('rounds 0.5 to 0 (even)', () => {
    expect(bankersRound(0.5)).toBe(0);
  });

  it('rounds 1.5 to 2 (even)', () => {
    expect(bankersRound(1.5)).toBe(2);
  });

  it('handles negative values: -2.5 rounds to -2', () => {
    // Math.floor(-2.5) = -3, decimal = -2.5 - (-3) = 0.5, floor is -3 (odd) -> -3 + 1 = -2
    expect(bankersRound(-2.5)).toBe(-2);
  });
});

// ---------------------------------------------------------------------------
// Categorize action
// ---------------------------------------------------------------------------

describe('executeCategorize', () => {
  it('produces a categorize mutation', () => {
    const result = executeCategorize(
      makeTx(),
      { type: 'categorize', categoryId: 'cat-1', categoryName: 'Food' },
      'rule-1',
    );

    expect(result.sourceActionType).toBe('categorize');
    expect(result.sourceRuleId).toBe('rule-1');
    expect(result.changes.categoryId).toBe('cat-1');
    expect(result.changes.categoryName).toBe('Food');
  });
});

// ---------------------------------------------------------------------------
// Add tag action
// ---------------------------------------------------------------------------

describe('executeAddTag', () => {
  it('adds a new tag to existing tags', () => {
    const result = executeAddTag(makeTx({ tags: ['a'] }), { type: 'add_tag', tag: 'b' }, 'rule-1');

    expect(result.changes.tags).toEqual(['a', 'b']);
  });

  it('does not duplicate an existing tag', () => {
    const result = executeAddTag(
      makeTx({ tags: ['existing'] }),
      { type: 'add_tag', tag: 'existing' },
      'rule-1',
    );

    expect(result.changes.tags).toEqual(['existing']);
  });
});

// ---------------------------------------------------------------------------
// Split transaction action
// ---------------------------------------------------------------------------

describe('executeSplitTransaction', () => {
  it('splits evenly with two equal ratios', () => {
    const tx = makeTx({ amountCents: -10000 }); // $100
    const result = executeSplitTransaction(
      tx,
      {
        type: 'split_transaction',
        splits: [
          { label: 'Alice', ratio: 1 },
          { label: 'Bob', ratio: 1 },
        ],
      },
      'rule-1',
    );

    const children = result.changes.splitChildren!;
    expect(children).toHaveLength(2);
    expect(children[0].amountCents).toBe(-5000);
    expect(children[1].amountCents).toBe(-5000);
    expect(children[0].amountCents + children[1].amountCents).toBe(-10000);
  });

  it('splits with uneven ratios and sums to original', () => {
    const tx = makeTx({ amountCents: -10000 }); // $100
    const result = executeSplitTransaction(
      tx,
      {
        type: 'split_transaction',
        splits: [
          { label: 'A', ratio: 1 },
          { label: 'B', ratio: 2 },
        ],
      },
      'rule-1',
    );

    const children = result.changes.splitChildren!;
    expect(children).toHaveLength(2);

    const totalAbs = Math.abs(children[0].amountCents) + Math.abs(children[1].amountCents);
    expect(totalAbs).toBe(10000);
  });

  it('handles a three-way split that requires rounding', () => {
    const tx = makeTx({ amountCents: -10000 }); // $100 / 3 = 33.33...
    const result = executeSplitTransaction(
      tx,
      {
        type: 'split_transaction',
        splits: [
          { label: 'A', ratio: 1 },
          { label: 'B', ratio: 1 },
          { label: 'C', ratio: 1 },
        ],
      },
      'rule-1',
    );

    const children = result.changes.splitChildren!;
    expect(children).toHaveLength(3);

    const totalAbs = children.reduce((sum, c) => sum + Math.abs(c.amountCents), 0);
    expect(totalAbs).toBe(10000);
  });

  it('handles fixed-cents parts', () => {
    const tx = makeTx({ amountCents: -10000 });
    const result = executeSplitTransaction(
      tx,
      {
        type: 'split_transaction',
        splits: [
          { label: 'Fixed', fixedCents: 3000 },
          { label: 'Remainder', ratio: 1 },
        ],
      },
      'rule-1',
    );

    const children = result.changes.splitChildren!;
    expect(children).toHaveLength(2);
    expect(children[0].amountCents).toBe(-3000); // fixed
    expect(children[1].amountCents).toBe(-7000); // remainder
  });

  it('preserves sign for positive (income) transactions', () => {
    const tx = makeTx({ amountCents: 10000 }); // $100 income
    const result = executeSplitTransaction(
      tx,
      {
        type: 'split_transaction',
        splits: [
          { label: 'A', ratio: 1 },
          { label: 'B', ratio: 1 },
        ],
      },
      'rule-1',
    );

    const children = result.changes.splitChildren!;
    expect(children[0].amountCents).toBe(5000);
    expect(children[1].amountCents).toBe(5000);
  });

  it('passes through categoryId on split parts', () => {
    const result = executeSplitTransaction(
      makeTx({ amountCents: -10000 }),
      {
        type: 'split_transaction',
        splits: [
          { label: 'A', ratio: 1, categoryId: 'cat-a' },
          { label: 'B', ratio: 1, categoryId: 'cat-b' },
        ],
      },
      'rule-1',
    );

    const children = result.changes.splitChildren!;
    expect(children[0].categoryId).toBe('cat-a');
    expect(children[1].categoryId).toBe('cat-b');
  });
});

// ---------------------------------------------------------------------------
// Move to budget action
// ---------------------------------------------------------------------------

describe('executeMoveToBudget', () => {
  it('produces a budget mutation', () => {
    const result = executeMoveToBudget(
      makeTx(),
      { type: 'move_to_budget', budgetId: 'b-1', budgetName: 'Food Budget' },
      'rule-1',
    );

    expect(result.changes.budgetId).toBe('b-1');
    expect(result.changes.budgetName).toBe('Food Budget');
  });
});

// ---------------------------------------------------------------------------
// Flag for review action
// ---------------------------------------------------------------------------

describe('executeFlagForReview', () => {
  it('produces a flag mutation', () => {
    const result = executeFlagForReview(
      makeTx(),
      { type: 'flag_for_review', reason: 'Suspicious amount' },
      'rule-1',
    );

    expect(result.changes.flaggedForReview).toBe(true);
    expect(result.changes.flagReason).toBe('Suspicious amount');
  });
});

// ---------------------------------------------------------------------------
// Send notification action
// ---------------------------------------------------------------------------

describe('executeSendNotification', () => {
  it('produces a notification mutation', () => {
    const result = executeSendNotification(
      makeTx(),
      { type: 'send_notification', title: 'Alert', body: 'Check this' },
      'rule-1',
    );

    expect(result.changes.notification).toEqual({
      title: 'Alert',
      body: 'Check this',
    });
  });
});

// ---------------------------------------------------------------------------
// Action dispatcher
// ---------------------------------------------------------------------------

describe('executeAction', () => {
  it('dispatches categorize action', () => {
    const action: RuleAction = {
      type: 'categorize',
      categoryId: 'c-1',
      categoryName: 'Test',
    };
    const result = executeAction(makeTx(), action, 'r-1');
    expect(result.sourceActionType).toBe('categorize');
  });

  it('dispatches add_tag action', () => {
    const action: RuleAction = { type: 'add_tag', tag: 'test' };
    const result = executeAction(makeTx(), action, 'r-1');
    expect(result.sourceActionType).toBe('add_tag');
  });

  it('dispatches flag_for_review action', () => {
    const action: RuleAction = {
      type: 'flag_for_review',
      reason: 'test',
    };
    const result = executeAction(makeTx(), action, 'r-1');
    expect(result.sourceActionType).toBe('flag_for_review');
  });
});
