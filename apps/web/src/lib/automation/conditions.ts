// SPDX-License-Identifier: BUSL-1.1

/**
 * Condition evaluator for the financial automation rule engine.
 *
 * Every condition type has a pure function that takes a {@link Transaction}
 * and returns a boolean. Compound conditions (AND / OR / NOT) compose leaf
 * evaluators into arbitrarily deep trees.
 *
 * Reference: issue #1614
 */

import type {
  AccountCondition,
  AmountCondition,
  CategoryCondition,
  CompoundCondition,
  DateRangeCondition,
  LeafCondition,
  MerchantCondition,
  PatternMode,
  RecurringCondition,
  RuleCondition,
  Transaction,
} from './types';

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

/**
 * Test whether `input` matches `pattern` using the given {@link PatternMode}.
 *
 * All comparisons are case-insensitive except `regex`, which uses the
 * pattern's own flags (the `i` flag is **not** injected automatically so
 * rule authors retain full control).
 *
 * @param input   - The string to test (e.g. merchant name).
 * @param pattern - The pattern to match against.
 * @param mode    - One of `substring`, `regex`, `starts_with`, `exact`.
 * @returns `true` when the input matches the pattern.
 */
export function matchesPattern(input: string, pattern: string, mode: PatternMode): boolean {
  switch (mode) {
    case 'substring':
      return input.toLowerCase().includes(pattern.toLowerCase());
    case 'starts_with':
      return input.toLowerCase().startsWith(pattern.toLowerCase());
    case 'exact':
      return input.toLowerCase() === pattern.toLowerCase();
    case 'regex': {
      try {
        const re = new RegExp(pattern);
        return re.test(input);
      } catch {
        // Invalid regex never matches.
        return false;
      }
    }
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

// ---------------------------------------------------------------------------
// Leaf evaluators
// ---------------------------------------------------------------------------

/**
 * Evaluate an {@link AmountCondition} against a transaction.
 *
 * Comparisons use the **absolute value** of the transaction amount so that
 * rules like "flag purchases over $500" work regardless of sign convention.
 *
 * @param tx        - The transaction to evaluate.
 * @param condition - The amount condition.
 * @returns `true` when the condition is satisfied.
 */
export function evaluateAmountCondition(tx: Transaction, condition: AmountCondition): boolean {
  const abs = Math.abs(tx.amountCents);
  const value = condition.valueCents;

  switch (condition.operator) {
    case 'greater_than':
      return abs > value;
    case 'less_than':
      return abs < value;
    case 'equal':
      return abs === value;
    case 'greater_or_equal':
      return abs >= value;
    case 'less_or_equal':
      return abs <= value;
    case 'between': {
      const upper = condition.upperBoundCents ?? value;
      return abs >= value && abs <= upper;
    }
    default: {
      const _exhaustive: never = condition.operator;
      return _exhaustive;
    }
  }
}

/**
 * Evaluate a {@link CategoryCondition} against a transaction.
 *
 * Returns `false` when the transaction has no category assigned.
 */
export function evaluateCategoryCondition(tx: Transaction, condition: CategoryCondition): boolean {
  if (tx.categoryName === null && tx.categoryId === null) return false;
  const target = tx.categoryName ?? tx.categoryId ?? '';
  return matchesPattern(target, condition.pattern, condition.mode);
}

/**
 * Evaluate a {@link MerchantCondition} against a transaction.
 *
 * Returns `false` when the transaction has no merchant name.
 */
export function evaluateMerchantCondition(tx: Transaction, condition: MerchantCondition): boolean {
  if (tx.merchantName === null) return false;
  return matchesPattern(tx.merchantName, condition.pattern, condition.mode);
}

/**
 * Evaluate a {@link DateRangeCondition} against a transaction.
 *
 * Both bounds are inclusive. Comparison uses ISO 8601 date strings
 * (lexicographic ordering is correct for YYYY-MM-DD).
 */
export function evaluateDateRangeCondition(
  tx: Transaction,
  condition: DateRangeCondition,
): boolean {
  return tx.date >= condition.startDate && tx.date <= condition.endDate;
}

/**
 * Evaluate a {@link RecurringCondition} against a transaction.
 */
export function evaluateRecurringCondition(
  tx: Transaction,
  condition: RecurringCondition,
): boolean {
  return tx.isRecurring === condition.isRecurring;
}

/**
 * Evaluate an {@link AccountCondition} against a transaction.
 *
 * Matches against `accountName` first, falling back to `accountId`.
 */
export function evaluateAccountCondition(tx: Transaction, condition: AccountCondition): boolean {
  const target = tx.accountName ?? tx.accountId;
  return matchesPattern(target, condition.pattern, condition.mode);
}

// ---------------------------------------------------------------------------
// Leaf dispatcher
// ---------------------------------------------------------------------------

/**
 * Evaluate a single leaf condition against a transaction.
 *
 * @param tx        - The transaction to test.
 * @param condition - A leaf (non-compound) condition.
 * @returns `true` when the condition is satisfied.
 */
export function evaluateLeafCondition(tx: Transaction, condition: LeafCondition): boolean {
  switch (condition.type) {
    case 'amount':
      return evaluateAmountCondition(tx, condition);
    case 'category':
      return evaluateCategoryCondition(tx, condition);
    case 'merchant':
      return evaluateMerchantCondition(tx, condition);
    case 'date_range':
      return evaluateDateRangeCondition(tx, condition);
    case 'recurring':
      return evaluateRecurringCondition(tx, condition);
    case 'account':
      return evaluateAccountCondition(tx, condition);
    default: {
      const _exhaustive: never = condition;
      return _exhaustive;
    }
  }
}

// ---------------------------------------------------------------------------
// Compound evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluate a compound (AND / OR / NOT) condition against a transaction.
 *
 * - **AND**: all children must match (short-circuits on first `false`).
 * - **OR**: at least one child must match (short-circuits on first `true`).
 * - **NOT**: exactly one child is expected; the result is inverted.
 *   If more than one child is provided, all must be false (equivalent to
 *   `NOT(AND(children))`).
 *
 * @param tx        - The transaction to test.
 * @param condition - A compound condition with children.
 * @returns `true` when the compound condition is satisfied.
 */
export function evaluateCompoundCondition(tx: Transaction, condition: CompoundCondition): boolean {
  switch (condition.type) {
    case 'and':
      return condition.children.every((child) => evaluateCondition(tx, child));
    case 'or':
      return condition.children.some((child) => evaluateCondition(tx, child));
    case 'not':
      return !condition.children.every((child) => evaluateCondition(tx, child));
    default: {
      const _exhaustive: never = condition.type;
      return _exhaustive;
    }
  }
}

// ---------------------------------------------------------------------------
// Top-level evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluate any {@link RuleCondition} against a transaction.
 *
 * Dispatches to the appropriate leaf or compound evaluator based on the
 * condition's `type` discriminator.
 *
 * @param tx        - The transaction to test.
 * @param condition - Any rule condition (leaf or compound).
 * @returns `true` when the condition tree is satisfied.
 */
export function evaluateCondition(tx: Transaction, condition: RuleCondition): boolean {
  if (isCompoundCondition(condition)) {
    return evaluateCompoundCondition(tx, condition);
  }
  return evaluateLeafCondition(tx, condition as LeafCondition);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Type guard: returns `true` when a condition is a compound (AND / OR / NOT).
 */
function isCompoundCondition(condition: RuleCondition): condition is CompoundCondition {
  return condition.type === 'and' || condition.type === 'or' || condition.type === 'not';
}
