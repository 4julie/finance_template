// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import {
  matchesCondition,
  matchesRule,
  sortRulesByPriority,
  applyAction,
  applyRules,
  applyRulesToBatch,
} from './rules-engine';
import type { RuleCondition, RuleTransaction, TransactionRule } from './rules-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTx(overrides: Partial<RuleTransaction> = {}): RuleTransaction {
  return {
    id: 'tx-1',
    merchant: 'Coffee Shop',
    amountCents: 450,
    description: 'Morning latte',
    categoryId: 'cat-food',
    tags: [],
    ...overrides,
  };
}

function makeRule(overrides: Partial<TransactionRule> = {}): TransactionRule {
  return {
    id: 'rule-1',
    name: 'Test Rule',
    priority: 10,
    enabled: true,
    conditions: [{ type: 'merchant', value: 'Coffee' }],
    action: { setCategoryId: 'cat-dining' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// matchesCondition
// ---------------------------------------------------------------------------

describe('matchesCondition', () => {
  const tx = makeTx();

  it('matches merchant substring (case-insensitive)', () => {
    expect(matchesCondition({ type: 'merchant', value: 'coffee' }, tx)).toBe(true);
    expect(matchesCondition({ type: 'merchant', value: 'SHOP' }, tx)).toBe(true);
    expect(matchesCondition({ type: 'merchant', value: 'Grocery' }, tx)).toBe(false);
  });

  it('matches amount range — both bounds', () => {
    const cond: RuleCondition = { type: 'amount_range', value: '400:500' };
    expect(matchesCondition(cond, tx)).toBe(true);
  });

  it('matches amount range — lower bound only', () => {
    const cond: RuleCondition = { type: 'amount_range', value: '400:' };
    expect(matchesCondition(cond, tx)).toBe(true);
  });

  it('matches amount range — upper bound only', () => {
    const cond: RuleCondition = { type: 'amount_range', value: ':500' };
    expect(matchesCondition(cond, tx)).toBe(true);
  });

  it('rejects when amount outside range', () => {
    const cond: RuleCondition = { type: 'amount_range', value: '500:1000' };
    expect(matchesCondition(cond, tx)).toBe(false);
  });

  it('matches description pattern (regex)', () => {
    const cond: RuleCondition = { type: 'description_pattern', value: 'latte$' };
    expect(matchesCondition(cond, tx)).toBe(true);
  });

  it('rejects non-matching description pattern', () => {
    const cond: RuleCondition = { type: 'description_pattern', value: '^Evening' };
    expect(matchesCondition(cond, tx)).toBe(false);
  });

  it('handles invalid regex gracefully', () => {
    const cond: RuleCondition = { type: 'description_pattern', value: '[invalid' };
    expect(matchesCondition(cond, tx)).toBe(false);
  });

  it('matches category exactly', () => {
    const cond: RuleCondition = { type: 'category', value: 'cat-food' };
    expect(matchesCondition(cond, tx)).toBe(true);
    expect(matchesCondition({ type: 'category', value: 'cat-other' }, tx)).toBe(false);
  });

  it('returns false for unknown condition type', () => {
    const cond = { type: 'unknown' as RuleCondition['type'], value: 'test' };
    expect(matchesCondition(cond, tx)).toBe(false);
  });

  it('handles zero-amount transaction in range', () => {
    const zeroTx = makeTx({ amountCents: 0 });
    const cond: RuleCondition = { type: 'amount_range', value: '0:0' };
    expect(matchesCondition(cond, zeroTx)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matchesRule
// ---------------------------------------------------------------------------

describe('matchesRule', () => {
  it('matches when all conditions pass (AND logic)', () => {
    const rule = makeRule({
      conditions: [
        { type: 'merchant', value: 'Coffee' },
        { type: 'amount_range', value: '0:1000' },
      ],
    });
    expect(matchesRule(rule, makeTx())).toBe(true);
  });

  it('rejects when one condition fails', () => {
    const rule = makeRule({
      conditions: [
        { type: 'merchant', value: 'Coffee' },
        { type: 'amount_range', value: '1000:2000' },
      ],
    });
    expect(matchesRule(rule, makeTx())).toBe(false);
  });

  it('returns false for rule with no conditions', () => {
    const rule = makeRule({ conditions: [] });
    expect(matchesRule(rule, makeTx())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sortRulesByPriority
// ---------------------------------------------------------------------------

describe('sortRulesByPriority', () => {
  it('sorts by ascending priority', () => {
    const rules = [
      makeRule({ id: 'r3', priority: 30 }),
      makeRule({ id: 'r1', priority: 10 }),
      makeRule({ id: 'r2', priority: 20 }),
    ];
    const sorted = sortRulesByPriority(rules);
    expect(sorted.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('does not mutate the original array', () => {
    const rules = [makeRule({ id: 'r2', priority: 20 }), makeRule({ id: 'r1', priority: 10 })];
    const original = [...rules];
    sortRulesByPriority(rules);
    expect(rules).toEqual(original);
  });

  it('handles empty array', () => {
    expect(sortRulesByPriority([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// applyAction
// ---------------------------------------------------------------------------

describe('applyAction', () => {
  it('sets category', () => {
    const result = applyAction(makeTx(), { setCategoryId: 'cat-new' });
    expect(result.categoryId).toBe('cat-new');
  });

  it('sets merchant', () => {
    const result = applyAction(makeTx(), { setMerchant: 'New Name' });
    expect(result.merchant).toBe('New Name');
  });

  it('adds tags without duplicates', () => {
    const tx = makeTx({ tags: ['existing'] });
    const result = applyAction(tx, { addTags: ['existing', 'new'] });
    expect(result.tags).toEqual(['existing', 'new']);
  });

  it('does not modify when addTags is empty', () => {
    const tx = makeTx({ tags: ['a'] });
    const result = applyAction(tx, { addTags: [] });
    expect(result.tags).toEqual(['a']);
  });

  it('applies multiple actions at once', () => {
    const result = applyAction(makeTx(), {
      setCategoryId: 'cat-new',
      setMerchant: 'New Merchant',
      addTags: ['tagged'],
    });
    expect(result.categoryId).toBe('cat-new');
    expect(result.merchant).toBe('New Merchant');
    expect(result.tags).toEqual(['tagged']);
  });
});

// ---------------------------------------------------------------------------
// applyRules
// ---------------------------------------------------------------------------

describe('applyRules', () => {
  it('applies matching rules in priority order', () => {
    const rules = [
      makeRule({
        id: 'r1',
        priority: 20,
        conditions: [{ type: 'merchant', value: 'Coffee' }],
        action: { addTags: ['tag-from-r1'] },
      }),
      makeRule({
        id: 'r2',
        priority: 10,
        conditions: [{ type: 'merchant', value: 'Coffee' }],
        action: { setCategoryId: 'cat-dining' },
      }),
    ];
    const result = applyRules(makeTx(), rules);
    expect(result.appliedRuleIds).toEqual(['r2', 'r1']);
    expect(result.modified.categoryId).toBe('cat-dining');
    expect(result.modified.tags).toEqual(['tag-from-r1']);
    expect(result.changed).toBe(true);
  });

  it('skips disabled rules', () => {
    const rules = [makeRule({ id: 'r1', enabled: false, action: { setCategoryId: 'nope' } })];
    const result = applyRules(makeTx(), rules);
    expect(result.appliedRuleIds).toHaveLength(0);
    expect(result.changed).toBe(false);
  });

  it('skips non-matching rules', () => {
    const rules = [
      makeRule({
        conditions: [{ type: 'merchant', value: 'Nonexistent' }],
        action: { setCategoryId: 'nope' },
      }),
    ];
    const result = applyRules(makeTx(), rules);
    expect(result.appliedRuleIds).toHaveLength(0);
    expect(result.changed).toBe(false);
  });

  it('handles empty rules array', () => {
    const result = applyRules(makeTx(), []);
    expect(result.appliedRuleIds).toHaveLength(0);
    expect(result.changed).toBe(false);
    expect(result.modified).toEqual(result.original);
  });

  it('preserves original transaction reference', () => {
    const tx = makeTx();
    const result = applyRules(tx, [makeRule()]);
    expect(result.original).toBe(tx);
  });
});

// ---------------------------------------------------------------------------
// applyRulesToBatch
// ---------------------------------------------------------------------------

describe('applyRulesToBatch', () => {
  it('applies rules to each transaction independently', () => {
    const txs = [
      makeTx({ id: 'tx-1', merchant: 'Coffee Shop' }),
      makeTx({ id: 'tx-2', merchant: 'Gas Station' }),
    ];
    const rules = [
      makeRule({
        conditions: [{ type: 'merchant', value: 'Coffee' }],
        action: { setCategoryId: 'cat-dining' },
      }),
    ];
    const results = applyRulesToBatch(txs, rules);
    expect(results).toHaveLength(2);
    expect(results[0].changed).toBe(true);
    expect(results[1].changed).toBe(false);
  });

  it('handles empty transactions array', () => {
    expect(applyRulesToBatch([], [makeRule()])).toHaveLength(0);
  });
});
