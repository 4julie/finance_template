// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';

import { runEngine, evaluateRule, sortByPriority } from '../engine';

import type { Rule, Transaction } from '../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    amountCents: -5000,
    categoryId: null,
    categoryName: null,
    merchantName: 'Whole Foods Market',
    date: '2025-03-15',
    isRecurring: false,
    accountId: 'acct-1',
    accountName: 'Checking',
    tags: [],
    note: null,
    ...overrides,
  };
}

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'rule-1',
    name: 'Test Rule',
    enabled: true,
    trigger: 'on_import',
    priority: 100,
    condition: { type: 'merchant', pattern: 'whole foods', mode: 'substring' },
    actions: [{ type: 'categorize', categoryId: 'cat-1', categoryName: 'Groceries' }],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// sortByPriority
// ---------------------------------------------------------------------------

describe('sortByPriority', () => {
  it('sorts rules by priority ascending', () => {
    const rules = [
      makeRule({ id: 'r-c', priority: 300 }),
      makeRule({ id: 'r-a', priority: 100 }),
      makeRule({ id: 'r-b', priority: 200 }),
    ];
    const sorted = sortByPriority(rules);
    expect(sorted.map((r) => r.id)).toEqual(['r-a', 'r-b', 'r-c']);
  });

  it('preserves original order for equal priorities', () => {
    const rules = [makeRule({ id: 'r-x', priority: 100 }), makeRule({ id: 'r-y', priority: 100 })];
    const sorted = sortByPriority(rules);
    expect(sorted.map((r) => r.id)).toEqual(['r-x', 'r-y']);
  });
});

// ---------------------------------------------------------------------------
// evaluateRule
// ---------------------------------------------------------------------------

describe('evaluateRule', () => {
  it('returns matched=true and mutations when condition matches', () => {
    const result = evaluateRule(makeRule(), makeTx());
    expect(result.matched).toBe(true);
    expect(result.mutations).toHaveLength(1);
    expect(result.mutations[0].changes.categoryId).toBe('cat-1');
  });

  it('returns matched=false when condition does not match', () => {
    const result = evaluateRule(makeRule(), makeTx({ merchantName: 'Target' }));
    expect(result.matched).toBe(false);
    expect(result.mutations).toHaveLength(0);
  });

  it('returns matched=false when rule is disabled', () => {
    const result = evaluateRule(makeRule({ enabled: false }), makeTx());
    expect(result.matched).toBe(false);
    expect(result.mutations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// runEngine
// ---------------------------------------------------------------------------

describe('runEngine', () => {
  it('returns empty mutations when no rules match', () => {
    const result = runEngine([makeRule()], makeTx({ merchantName: 'Target' }));
    expect(result.mutations).toHaveLength(0);
  });

  it('returns mutations for a single matching rule', () => {
    const result = runEngine([makeRule()], makeTx());
    expect(result.mutations).toHaveLength(1);
    expect(result.mutations[0].sourceRuleId).toBe('rule-1');
  });

  it('evaluates all rules in priority_ordered mode', () => {
    const rules = [
      makeRule({
        id: 'r-tag',
        priority: 200,
        actions: [{ type: 'add_tag', tag: 'grocery' }],
      }),
      makeRule({
        id: 'r-cat',
        priority: 100,
        actions: [
          {
            type: 'categorize',
            categoryId: 'cat-1',
            categoryName: 'Groceries',
          },
        ],
      }),
    ];

    const result = runEngine(rules, makeTx(), {
      conflictResolution: 'priority_ordered',
    });

    // Both rules match; priority 100 executes first.
    expect(result.mutations).toHaveLength(2);
    expect(result.mutations[0].sourceRuleId).toBe('r-cat');
    expect(result.mutations[1].sourceRuleId).toBe('r-tag');
  });

  it('stops after first match in first_match mode', () => {
    const rules = [
      makeRule({
        id: 'r-1',
        priority: 100,
        actions: [
          {
            type: 'categorize',
            categoryId: 'cat-1',
            categoryName: 'Groceries',
          },
        ],
      }),
      makeRule({
        id: 'r-2',
        priority: 200,
        actions: [{ type: 'add_tag', tag: 'grocery' }],
      }),
    ];

    const result = runEngine(rules, makeTx(), {
      conflictResolution: 'first_match',
    });

    // Only the first matching rule produces mutations.
    expect(result.mutations).toHaveLength(1);
    expect(result.mutations[0].sourceRuleId).toBe('r-1');
  });

  it('collects mutations from all matching rules in all_matching mode', () => {
    const rules = [
      makeRule({
        id: 'r-1',
        actions: [
          {
            type: 'categorize',
            categoryId: 'cat-1',
            categoryName: 'Groceries',
          },
        ],
      }),
      makeRule({
        id: 'r-2',
        actions: [{ type: 'add_tag', tag: 'grocery' }],
      }),
    ];

    const result = runEngine(rules, makeTx(), {
      conflictResolution: 'all_matching',
    });

    expect(result.mutations).toHaveLength(2);
  });

  it('reports dryRun=true when option is set', () => {
    const result = runEngine([makeRule()], makeTx(), { dryRun: true });
    expect(result.dryRun).toBe(true);
    // Mutations are still produced — dryRun is just a flag.
    expect(result.mutations).toHaveLength(1);
  });

  it('reports dryRun=false by default', () => {
    const result = runEngine([makeRule()], makeTx());
    expect(result.dryRun).toBe(false);
  });

  it('handles multiple actions per rule', () => {
    const rule = makeRule({
      actions: [
        { type: 'categorize', categoryId: 'c-1', categoryName: 'Food' },
        { type: 'add_tag', tag: 'auto' },
        { type: 'flag_for_review', reason: 'New merchant' },
      ],
    });

    const result = runEngine([rule], makeTx());
    expect(result.mutations).toHaveLength(3);
  });

  it('skips disabled rules', () => {
    const rules = [
      makeRule({ id: 'r-disabled', enabled: false }),
      makeRule({ id: 'r-enabled', enabled: true }),
    ];

    const result = runEngine(rules, makeTx());
    expect(result.mutations).toHaveLength(1);
    expect(result.mutations[0].sourceRuleId).toBe('r-enabled');
  });

  it('includes all evaluated rules in the result', () => {
    const rules = [
      makeRule({ id: 'r-match' }),
      makeRule({
        id: 'r-no-match',
        condition: { type: 'merchant', pattern: 'target', mode: 'exact' },
      }),
    ];

    const result = runEngine(rules, makeTx());
    expect(result.evaluatedRules).toHaveLength(2);
    expect(result.evaluatedRules[0].matched).toBe(true);
    expect(result.evaluatedRules[1].matched).toBe(false);
  });
});
