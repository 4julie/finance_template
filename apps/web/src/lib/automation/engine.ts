// SPDX-License-Identifier: BUSL-1.1

/**
 * Rule evaluation engine for the financial automation system.
 *
 * Takes a list of {@link Rule}s and a {@link Transaction}, evaluates
 * conditions, determines matching rules, resolves conflicts according to
 * the chosen {@link ConflictResolution} strategy, and returns an ordered
 * list of {@link TransactionMutation}s to apply.
 *
 * Supports a dry-run mode that describes what *would* change without
 * actually applying anything (the engine never applies mutations itself —
 * it only produces them).
 *
 * Reference: issue #1614
 */

import type {
  ConflictResolution,
  Rule,
  RuleEvaluationResult,
  RuleExecutionResult,
  Transaction,
  TransactionMutation,
} from './types';
import { evaluateCondition } from './conditions';
import { executeAction } from './actions';

// ---------------------------------------------------------------------------
// Engine options
// ---------------------------------------------------------------------------

/** Options controlling engine behavior. */
export interface EngineOptions {
  /**
   * Strategy for resolving multiple matching rules.
   *
   * - `first_match`      — only the first matching rule's actions fire.
   * - `all_matching`     — all matching rules fire, in the order they match.
   * - `priority_ordered` — all matching rules fire, sorted by priority
   *                        (lowest number first).
   *
   * @default 'priority_ordered'
   */
  readonly conflictResolution?: ConflictResolution;

  /**
   * When `true`, the result is flagged as a dry run. The engine always
   * returns mutations without side effects regardless of this flag, but
   * callers can inspect `RuleExecutionResult.dryRun` to decide whether
   * to apply the mutations.
   *
   * @default false
   */
  readonly dryRun?: boolean;
}

// ---------------------------------------------------------------------------
// Sorting helpers
// ---------------------------------------------------------------------------

/**
 * Sort rules by priority (ascending — lower numbers run first).
 * Rules with equal priority retain their original order (stable sort).
 *
 * @param rules - The rules to sort.
 * @returns A new array sorted by priority.
 */
export function sortByPriority(rules: readonly Rule[]): Rule[] {
  return [...rules].sort((a, b) => a.priority - b.priority);
}

// ---------------------------------------------------------------------------
// Single-rule evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single rule against a transaction.
 *
 * If the rule is disabled (`enabled === false`) it is treated as
 * non-matching. When the condition tree matches, all of the rule's
 * actions are executed in order and their mutations collected.
 *
 * @param rule - The rule to evaluate.
 * @param tx   - The transaction to test.
 * @returns An evaluation result with `matched` flag and mutations.
 */
export function evaluateRule(rule: Rule, tx: Transaction): RuleEvaluationResult {
  if (!rule.enabled) {
    return { rule, matched: false, mutations: [] };
  }

  const matched = evaluateCondition(tx, rule.condition);
  if (!matched) {
    return { rule, matched: false, mutations: [] };
  }

  const mutations: TransactionMutation[] = rule.actions.map((action) =>
    executeAction(tx, action, rule.id),
  );

  return { rule, matched: true, mutations };
}

// ---------------------------------------------------------------------------
// Full engine
// ---------------------------------------------------------------------------

/**
 * Run the rule engine: evaluate all rules against a transaction and
 * return an execution result with the collected mutations.
 *
 * @param rules   - The rule set to evaluate.
 * @param tx      - The transaction to process.
 * @param options - Engine options (conflict resolution, dry-run flag).
 * @returns The execution result including matched rules and mutations.
 */
export function runEngine(
  rules: readonly Rule[],
  tx: Transaction,
  options: EngineOptions = {},
): RuleExecutionResult {
  const { conflictResolution = 'priority_ordered', dryRun = false } = options;

  // Determine evaluation order.
  const ordered = conflictResolution === 'priority_ordered' ? sortByPriority(rules) : [...rules];

  // Evaluate each rule.
  const evaluatedRules: RuleEvaluationResult[] = [];
  const mutations: TransactionMutation[] = [];

  for (const rule of ordered) {
    const result = evaluateRule(rule, tx);
    evaluatedRules.push(result);

    if (result.matched) {
      mutations.push(...result.mutations);

      // In first-match mode, stop after the first match.
      if (conflictResolution === 'first_match') {
        // Still evaluate remaining rules for reporting, but don't collect
        // their mutations.
        for (let i = ordered.indexOf(rule) + 1; i < ordered.length; i++) {
          const remaining = evaluateRule(ordered[i], tx);
          evaluatedRules.push({
            ...remaining,
            // Mark as not producing mutations in first-match mode
            mutations: [],
          });
        }
        break;
      }
    }
  }

  return {
    transaction: tx,
    evaluatedRules,
    mutations,
    dryRun,
  };
}
