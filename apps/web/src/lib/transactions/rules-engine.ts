// SPDX-License-Identifier: BUSL-1.1

/**
 * Transaction rules engine with advanced matching logic.
 *
 * Supports matching by merchant name (exact or substring), amount range,
 * description regex pattern, and category. Rules have a priority for
 * ordering and can be auto-applied to incoming transactions.
 *
 * All monetary values are in integer cents. All functions are pure.
 *
 * References: issue #1572
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The type of condition a rule can match against. */
export type RuleConditionType = 'merchant' | 'amount_range' | 'description_pattern' | 'category';

/** A single condition within a rule. */
export interface RuleCondition {
  /** The field this condition matches against. */
  readonly type: RuleConditionType;
  /**
   * The match value:
   * - merchant: substring match (case-insensitive)
   * - amount_range: "minCents:maxCents" (either side may be empty for open range)
   * - description_pattern: regex pattern string
   * - category: exact category ID
   */
  readonly value: string;
}

/** Action to take when a rule matches. */
export interface RuleAction {
  /** Set the category to this ID. */
  readonly setCategoryId?: string;
  /** Set the merchant display name. */
  readonly setMerchant?: string;
  /** Add these tags to the transaction. */
  readonly addTags?: readonly string[];
  /** Automatically mark as reviewed. */
  readonly autoReview?: boolean;
}

/** A complete transaction rule with conditions, actions, and metadata. */
export interface TransactionRule {
  /** Unique rule identifier. */
  readonly id: string;
  /** Human-readable rule name. */
  readonly name: string;
  /** Priority for ordering — lower numbers run first. */
  readonly priority: number;
  /** Whether the rule is active. */
  readonly enabled: boolean;
  /**
   * Conditions that must ALL be true for the rule to match (AND logic).
   * Must contain at least one condition.
   */
  readonly conditions: readonly RuleCondition[];
  /** Actions to apply when the rule matches. */
  readonly action: RuleAction;
}

/** A transaction to be evaluated against rules. */
export interface RuleTransaction {
  /** Unique transaction identifier. */
  readonly id: string;
  /** Merchant or payee name. */
  readonly merchant: string;
  /** Amount in cents. */
  readonly amountCents: number;
  /** Description or memo. */
  readonly description: string;
  /** Current category ID. */
  readonly categoryId: string;
  /** Current tags. */
  readonly tags: readonly string[];
}

/** Result of applying rules to a transaction. */
export interface RuleApplicationResult {
  /** The original transaction. */
  readonly original: RuleTransaction;
  /** The transaction after rule application. */
  readonly modified: RuleTransaction;
  /** IDs of rules that matched and were applied. */
  readonly appliedRuleIds: readonly string[];
  /** Whether any changes were made. */
  readonly changed: boolean;
}

// ---------------------------------------------------------------------------
// Condition matching
// ---------------------------------------------------------------------------

/**
 * Test whether a single condition matches a transaction.
 *
 * @param condition - The condition to test.
 * @param tx - The transaction to evaluate.
 * @returns True if the condition matches.
 */
export function matchesCondition(condition: RuleCondition, tx: RuleTransaction): boolean {
  switch (condition.type) {
    case 'merchant':
      return tx.merchant.toLowerCase().includes(condition.value.toLowerCase());

    case 'amount_range': {
      const [minStr, maxStr] = condition.value.split(':');
      const min = minStr ? parseInt(minStr, 10) : -Infinity;
      const max = maxStr ? parseInt(maxStr, 10) : Infinity;
      if (isNaN(min) && minStr !== '') return false;
      if (isNaN(max) && maxStr !== '') return false;
      const effectiveMin = minStr === '' ? -Infinity : min;
      const effectiveMax = maxStr === '' ? Infinity : max;
      return tx.amountCents >= effectiveMin && tx.amountCents <= effectiveMax;
    }

    case 'description_pattern': {
      try {
        const regex = new RegExp(condition.value, 'i');
        return regex.test(tx.description);
      } catch {
        // Invalid regex pattern — condition does not match
        return false;
      }
    }

    case 'category':
      return tx.categoryId === condition.value;

    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Rule matching
// ---------------------------------------------------------------------------

/**
 * Test whether all conditions of a rule match a transaction.
 *
 * A rule with no conditions never matches (safety guard).
 *
 * @param rule - The rule to test.
 * @param tx - The transaction to evaluate.
 * @returns True if all conditions match (AND logic).
 */
export function matchesRule(rule: TransactionRule, tx: RuleTransaction): boolean {
  if (rule.conditions.length === 0) return false;
  return rule.conditions.every((cond) => matchesCondition(cond, tx));
}

/**
 * Sort rules by priority (ascending — lower priority number runs first).
 * Rules with equal priority maintain their original relative order.
 *
 * @param rules - The rules to sort.
 * @returns A new sorted array of rules.
 */
export function sortRulesByPriority(rules: readonly TransactionRule[]): TransactionRule[] {
  return [...rules].sort((a, b) => a.priority - b.priority);
}

// ---------------------------------------------------------------------------
// Rule application
// ---------------------------------------------------------------------------

/**
 * Apply a single rule's action to a transaction, producing a new transaction.
 *
 * @param tx - The transaction to modify.
 * @param action - The action to apply.
 * @returns A new transaction with the action applied.
 */
export function applyAction(tx: RuleTransaction, action: RuleAction): RuleTransaction {
  let result = tx;

  if (action.setCategoryId !== undefined) {
    result = { ...result, categoryId: action.setCategoryId };
  }
  if (action.setMerchant !== undefined) {
    result = { ...result, merchant: action.setMerchant };
  }
  if (action.addTags !== undefined && action.addTags.length > 0) {
    const existingTags = new Set(result.tags);
    const newTags = action.addTags.filter((t) => !existingTags.has(t));
    if (newTags.length > 0) {
      result = { ...result, tags: [...result.tags, ...newTags] };
    }
  }

  return result;
}

/**
 * Apply all matching enabled rules to a transaction in priority order.
 *
 * Rules are sorted by priority (ascending) and applied sequentially.
 * Each subsequent rule sees the result of previous rule applications.
 *
 * @param tx - The transaction to process.
 * @param rules - All available rules (will be filtered to enabled only).
 * @returns The application result with original, modified transaction, and applied rule IDs.
 */
export function applyRules(
  tx: RuleTransaction,
  rules: readonly TransactionRule[],
): RuleApplicationResult {
  const enabledRules = sortRulesByPriority(rules.filter((r) => r.enabled));
  const appliedRuleIds: string[] = [];
  let current = tx;

  for (const rule of enabledRules) {
    if (matchesRule(rule, current)) {
      current = applyAction(current, rule.action);
      appliedRuleIds.push(rule.id);
    }
  }

  const changed =
    current.categoryId !== tx.categoryId ||
    current.merchant !== tx.merchant ||
    current.tags.length !== tx.tags.length ||
    current.tags.some((t, i) => t !== tx.tags[i]);

  return { original: tx, modified: current, appliedRuleIds, changed };
}

/**
 * Apply rules to a batch of transactions.
 *
 * @param transactions - The transactions to process.
 * @param rules - All available rules.
 * @returns An array of application results, one per transaction.
 */
export function applyRulesToBatch(
  transactions: readonly RuleTransaction[],
  rules: readonly TransactionRule[],
): RuleApplicationResult[] {
  return transactions.map((tx) => applyRules(tx, rules));
}
