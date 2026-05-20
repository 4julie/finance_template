// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';

import {
  validateRule,
  validateRuleSet,
  validateConditionTree,
  detectConflictingActions,
  detectCircularDependencies,
  countLeafConditions,
} from '../validation';

import type { Rule, RuleCondition, RuleAction } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'rule-1',
    name: 'Test Rule',
    enabled: true,
    trigger: 'on_import',
    priority: 100,
    condition: { type: 'merchant', pattern: 'test', mode: 'substring' },
    actions: [{ type: 'categorize', categoryId: 'cat-1', categoryName: 'Test' }],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// countLeafConditions
// ---------------------------------------------------------------------------

describe('countLeafConditions', () => {
  it('returns 1 for a leaf condition', () => {
    expect(countLeafConditions({ type: 'merchant', pattern: 'x', mode: 'exact' })).toBe(1);
  });

  it('counts leaves in nested compounds', () => {
    const condition: RuleCondition = {
      type: 'and',
      children: [
        { type: 'merchant', pattern: 'x', mode: 'exact' },
        {
          type: 'or',
          children: [
            { type: 'amount', operator: 'equal', valueCents: 100 },
            { type: 'recurring', isRecurring: true },
          ],
        },
      ],
    };
    expect(countLeafConditions(condition)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// validateConditionTree
// ---------------------------------------------------------------------------

describe('validateConditionTree', () => {
  it('reports error for empty AND children', () => {
    const condition: RuleCondition = { type: 'and', children: [] };
    const diags = validateConditionTree(condition, 'r-1');
    expect(diags.some((d) => d.code === 'EMPTY_CONDITION_SET')).toBe(true);
  });

  it('reports error for empty NOT children', () => {
    const condition: RuleCondition = { type: 'not', children: [] };
    const diags = validateConditionTree(condition, 'r-1');
    expect(diags.some((d) => d.code === 'UNREACHABLE_CONDITION')).toBe(true);
  });

  it('reports info for single-child AND', () => {
    const condition: RuleCondition = {
      type: 'and',
      children: [{ type: 'merchant', pattern: 'x', mode: 'exact' }],
    };
    const diags = validateConditionTree(condition, 'r-1');
    expect(diags.some((d) => d.code === 'SIMPLIFIABLE_CONDITION')).toBe(true);
  });

  it('reports info for single-child OR', () => {
    const condition: RuleCondition = {
      type: 'or',
      children: [{ type: 'merchant', pattern: 'x', mode: 'exact' }],
    };
    const diags = validateConditionTree(condition, 'r-1');
    expect(diags.some((d) => d.code === 'SIMPLIFIABLE_CONDITION')).toBe(true);
  });

  it('returns empty for valid leaf condition', () => {
    const condition: RuleCondition = {
      type: 'merchant',
      pattern: 'test',
      mode: 'substring',
    };
    const diags = validateConditionTree(condition, 'r-1');
    expect(diags).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// detectConflictingActions
// ---------------------------------------------------------------------------

describe('detectConflictingActions', () => {
  it('detects multiple categorize actions', () => {
    const actions: RuleAction[] = [
      { type: 'categorize', categoryId: 'a', categoryName: 'A' },
      { type: 'categorize', categoryId: 'b', categoryName: 'B' },
    ];
    const diags = detectConflictingActions(actions, 'r-1');
    expect(diags.some((d) => d.code === 'CONFLICTING_ACTIONS' && d.severity === 'error')).toBe(
      true,
    );
  });

  it('detects multiple split actions', () => {
    const actions: RuleAction[] = [
      {
        type: 'split_transaction',
        splits: [{ label: 'A', ratio: 1 }],
      },
      {
        type: 'split_transaction',
        splits: [{ label: 'B', ratio: 1 }],
      },
    ];
    const diags = detectConflictingActions(actions, 'r-1');
    expect(diags.some((d) => d.code === 'CONFLICTING_ACTIONS' && d.severity === 'error')).toBe(
      true,
    );
  });

  it('warns when split and categorize coexist', () => {
    const actions: RuleAction[] = [
      { type: 'categorize', categoryId: 'a', categoryName: 'A' },
      {
        type: 'split_transaction',
        splits: [{ label: 'X', ratio: 1 }],
      },
    ];
    const diags = detectConflictingActions(actions, 'r-1');
    expect(diags.some((d) => d.code === 'CONFLICTING_ACTIONS' && d.severity === 'warning')).toBe(
      true,
    );
  });

  it('returns empty for non-conflicting actions', () => {
    const actions: RuleAction[] = [
      { type: 'add_tag', tag: 'a' },
      { type: 'flag_for_review', reason: 'check' },
    ];
    const diags = detectConflictingActions(actions, 'r-1');
    expect(diags).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// detectCircularDependencies
// ---------------------------------------------------------------------------

describe('detectCircularDependencies', () => {
  it('detects circular dependency between two rules', () => {
    // Rule A: reads category, writes tag
    // Rule B: reads tag(?), writes category
    // Since our input fingerprinting maps 'add_tag' -> 'tag' output,
    // and there's no 'tag' leaf condition, we need to use fields that exist.

    // Rule A: condition reads 'category', action writes 'category' via categorize
    // Rule B: condition reads 'category', action writes 'category' via categorize
    // This is not circular since they read/write the same field.

    // A true cycle: Rule A reads 'merchant', writes 'category'.
    //               Rule B reads 'category', writes ... hmm, no action writes 'merchant'.
    // Let's use: A reads category, writes tag. B reads... no tag condition type.

    // Actually, the circular detector works on field overlap:
    // A outputs: category (categorize action). A inputs: merchant.
    // B outputs: (flag). B inputs: category.
    // A's output (category) overlaps B's input (category) ✓
    // B's output (flag) overlaps A's input (merchant) ✗
    // Not circular.

    // To trigger: both rules must output something the other reads.
    // A: condition=category, action=categorize → inputs={category}, outputs={category}
    // B: condition=category, action=categorize → inputs={category}, outputs={category}
    // A's outputs ∩ B's inputs = {category} → ✓
    // B's outputs ∩ A's inputs = {category} → ✓
    // CIRCULAR!

    const ruleA = makeRule({
      id: 'rule-a',
      name: 'Rule A',
      condition: { type: 'category', pattern: 'food', mode: 'substring' },
      actions: [{ type: 'categorize', categoryId: 'c-1', categoryName: 'Dining' }],
    });

    const ruleB = makeRule({
      id: 'rule-b',
      name: 'Rule B',
      condition: { type: 'category', pattern: 'dining', mode: 'substring' },
      actions: [{ type: 'categorize', categoryId: 'c-2', categoryName: 'Food' }],
    });

    const diags = detectCircularDependencies([ruleA, ruleB]);
    expect(diags.some((d) => d.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
  });

  it('returns empty when no circular dependencies exist', () => {
    const ruleA = makeRule({
      id: 'rule-a',
      condition: { type: 'merchant', pattern: 'test', mode: 'substring' },
      actions: [{ type: 'add_tag', tag: 'auto' }],
    });

    const ruleB = makeRule({
      id: 'rule-b',
      condition: { type: 'amount', operator: 'greater_than', valueCents: 100 },
      actions: [{ type: 'flag_for_review', reason: 'large' }],
    });

    const diags = detectCircularDependencies([ruleA, ruleB]);
    expect(diags).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// validateRule
// ---------------------------------------------------------------------------

describe('validateRule', () => {
  it('returns valid for a well-formed rule', () => {
    const result = validateRule(makeRule());
    expect(result.valid).toBe(true);
  });

  it('warns when a rule has no actions', () => {
    const result = validateRule(makeRule({ actions: [] }));
    expect(result.diagnostics.some((d) => d.code === 'NO_ACTIONS')).toBe(true);
    // NO_ACTIONS is a warning, not an error — rule is still "valid".
    expect(result.valid).toBe(true);
  });

  it('returns invalid when condition tree has errors', () => {
    const result = validateRule(makeRule({ condition: { type: 'and', children: [] } }));
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateRuleSet
// ---------------------------------------------------------------------------

describe('validateRuleSet', () => {
  it('validates individual rules and checks cross-rule issues', () => {
    const ruleA = makeRule({
      id: 'rule-a',
      name: 'Rule A',
      condition: { type: 'category', pattern: 'food', mode: 'substring' },
      actions: [{ type: 'categorize', categoryId: 'c-1', categoryName: 'Dining' }],
    });

    const ruleB = makeRule({
      id: 'rule-b',
      name: 'Rule B',
      condition: { type: 'category', pattern: 'dining', mode: 'substring' },
      actions: [{ type: 'categorize', categoryId: 'c-2', categoryName: 'Food' }],
    });

    const result = validateRuleSet([ruleA, ruleB]);
    expect(result.diagnostics.some((d) => d.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
  });

  it('returns valid for a clean rule set', () => {
    const result = validateRuleSet([makeRule()]);
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });
});
