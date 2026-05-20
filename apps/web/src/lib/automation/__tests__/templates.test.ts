// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect, beforeEach } from 'vitest';

import {
  autoCategorizeGroceries,
  flagLargePurchases,
  splitRent5050,
  tagSubscriptionPayments,
  roundUpSavings,
  resetTemplateCounter,
} from '../templates';

import { validateRule } from '../validation';

// ---------------------------------------------------------------------------
// Reset counter between tests for deterministic IDs
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetTemplateCounter();
});

// ---------------------------------------------------------------------------
// autoCategorizeGroceries
// ---------------------------------------------------------------------------

describe('autoCategorizeGroceries', () => {
  it('creates a valid rule with a categorize action', () => {
    const rule = autoCategorizeGroceries('cat-1', 'Groceries');
    expect(rule.name).toBe('Auto-categorize Groceries');
    expect(rule.enabled).toBe(true);
    expect(rule.trigger).toBe('on_import');
    expect(rule.actions).toHaveLength(1);
    expect(rule.actions[0].type).toBe('categorize');

    const result = validateRule(rule);
    expect(result.valid).toBe(true);
  });

  it('uses OR condition with multiple merchant patterns', () => {
    const rule = autoCategorizeGroceries('cat-1', 'Groceries');
    expect(rule.condition.type).toBe('or');
    if (rule.condition.type === 'or') {
      expect(rule.condition.children.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('supports overrides', () => {
    const rule = autoCategorizeGroceries('cat-1', 'Groceries', {
      priority: 1,
      enabled: false,
    });
    expect(rule.priority).toBe(1);
    expect(rule.enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// flagLargePurchases
// ---------------------------------------------------------------------------

describe('flagLargePurchases', () => {
  it('creates a valid rule that flags and notifies', () => {
    const rule = flagLargePurchases(50000); // $500
    expect(rule.name).toContain('Flag Large Purchases');
    expect(rule.actions).toHaveLength(2);
    expect(rule.actions[0].type).toBe('flag_for_review');
    expect(rule.actions[1].type).toBe('send_notification');

    const result = validateRule(rule);
    expect(result.valid).toBe(true);
  });

  it('uses an amount greater_than condition', () => {
    const rule = flagLargePurchases(50000);
    expect(rule.condition.type).toBe('amount');
    if (rule.condition.type === 'amount') {
      expect(rule.condition.operator).toBe('greater_than');
      expect(rule.condition.valueCents).toBe(50000);
    }
  });
});

// ---------------------------------------------------------------------------
// splitRent5050
// ---------------------------------------------------------------------------

describe('splitRent5050', () => {
  it('creates a valid rule with a split action', () => {
    const rule = splitRent5050('Alice', 'Bob', 'Property Management');
    expect(rule.actions).toHaveLength(1);
    expect(rule.actions[0].type).toBe('split_transaction');

    const result = validateRule(rule);
    expect(result.valid).toBe(true);
  });

  it('has two equal-ratio splits', () => {
    const rule = splitRent5050('Alice', 'Bob', 'Property Management');
    const action = rule.actions[0];
    if (action.type === 'split_transaction') {
      expect(action.splits).toHaveLength(2);
      expect(action.splits[0].ratio).toBe(1);
      expect(action.splits[1].ratio).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// tagSubscriptionPayments
// ---------------------------------------------------------------------------

describe('tagSubscriptionPayments', () => {
  it('creates a valid rule that tags recurring transactions', () => {
    const rule = tagSubscriptionPayments();
    expect(rule.condition.type).toBe('recurring');
    expect(rule.actions).toHaveLength(1);
    expect(rule.actions[0].type).toBe('add_tag');

    const result = validateRule(rule);
    expect(result.valid).toBe(true);
  });

  it('uses custom tag name', () => {
    const rule = tagSubscriptionPayments('monthly');
    const action = rule.actions[0];
    if (action.type === 'add_tag') {
      expect(action.tag).toBe('monthly');
    }
  });
});

// ---------------------------------------------------------------------------
// roundUpSavings
// ---------------------------------------------------------------------------

describe('roundUpSavings', () => {
  it('creates a valid rule with budget and tag actions', () => {
    const rule = roundUpSavings('b-savings', 'Savings');
    expect(rule.actions).toHaveLength(2);
    expect(rule.actions[0].type).toBe('move_to_budget');
    expect(rule.actions[1].type).toBe('add_tag');

    const result = validateRule(rule);
    expect(result.valid).toBe(true);
  });

  it('matches any transaction with amount >= 1 cent', () => {
    const rule = roundUpSavings('b-savings', 'Savings');
    expect(rule.condition.type).toBe('amount');
    if (rule.condition.type === 'amount') {
      expect(rule.condition.operator).toBe('greater_or_equal');
      expect(rule.condition.valueCents).toBe(1);
    }
  });
});
