// SPDX-License-Identifier: BUSL-1.1

/**
 * Action executor for the financial automation rule engine.
 *
 * Each action type has a pure function that takes a {@link Transaction} and a
 * {@link RuleAction} and returns a {@link TransactionMutation} — a proposed
 * change, never a side effect. Actions are composable: the engine calls each
 * executor in order and collects the resulting mutations.
 *
 * All monetary arithmetic uses integer cents with Banker's rounding
 * (round-half-to-even) to eliminate floating-point bias.
 *
 * Reference: issue #1614
 */

import type {
  AddTagAction,
  CategorizeAction,
  FlagForReviewAction,
  MoveToBudgetAction,
  RuleAction,
  SendNotificationAction,
  SplitChild,
  SplitTransactionAction,
  Transaction,
  TransactionMutation,
} from './types';

// ---------------------------------------------------------------------------
// Banker's rounding
// ---------------------------------------------------------------------------

/**
 * Round a number to the nearest integer using Banker's rounding
 * (round-half-to-even). This avoids the systematic upward bias of the
 * standard "round half up" method, which is important for financial
 * calculations involving many divisions.
 *
 * @param n - The number to round.
 * @returns The rounded integer.
 */
export function bankersRound(n: number): number {
  const floor = Math.floor(n);
  const decimal = n - floor;

  // Not exactly at .5 — use normal rounding.
  if (Math.abs(decimal - 0.5) > 1e-9) {
    return Math.round(n);
  }

  // Exactly at .5 — round to even.
  return floor % 2 === 0 ? floor : floor + 1;
}

// ---------------------------------------------------------------------------
// Individual action executors
// ---------------------------------------------------------------------------

/**
 * Produce a mutation that sets the transaction's category.
 *
 * @param tx     - The transaction being processed.
 * @param action - The categorize action.
 * @param ruleId - Identifier of the rule that triggered this action.
 * @returns A mutation proposing the category change.
 */
export function executeCategorize(
  _tx: Transaction,
  action: CategorizeAction,
  ruleId: string,
): TransactionMutation {
  return {
    sourceActionType: 'categorize',
    sourceRuleId: ruleId,
    changes: {
      categoryId: action.categoryId,
      categoryName: action.categoryName,
    },
  };
}

/**
 * Produce a mutation that adds a tag to the transaction.
 *
 * @param tx     - The transaction being processed.
 * @param action - The add-tag action.
 * @param ruleId - Identifier of the rule that triggered this action.
 * @returns A mutation proposing the tag addition.
 */
export function executeAddTag(
  tx: Transaction,
  action: AddTagAction,
  ruleId: string,
): TransactionMutation {
  const existingTags = tx.tags ?? [];
  const newTags = existingTags.includes(action.tag)
    ? [...existingTags]
    : [...existingTags, action.tag];

  return {
    sourceActionType: 'add_tag',
    sourceRuleId: ruleId,
    changes: {
      tags: newTags,
    },
  };
}

/**
 * Produce a mutation that splits the transaction into child records.
 *
 * Splitting follows these rules:
 * 1. Fixed-cents parts are allocated first.
 * 2. The remainder is distributed among ratio-based parts using integer
 *    division with Banker's rounding.
 * 3. Any leftover cents from rounding are distributed one-at-a-time to
 *    the earliest parts to ensure the split sums exactly to the original.
 *
 * @param tx     - The transaction being split.
 * @param action - The split action with part definitions.
 * @param ruleId - Identifier of the rule that triggered this action.
 * @returns A mutation containing the child records.
 */
export function executeSplitTransaction(
  tx: Transaction,
  action: SplitTransactionAction,
  ruleId: string,
): TransactionMutation {
  const totalCents = Math.abs(tx.amountCents);
  const sign = tx.amountCents >= 0 ? 1 : -1;
  const splits = action.splits;

  // 1. Allocate fixed parts.
  let fixedTotal = 0;
  const children: SplitChild[] = [];

  for (const part of splits) {
    if (part.fixedCents !== undefined) {
      fixedTotal += part.fixedCents;
      children.push({
        label: part.label,
        amountCents: part.fixedCents * sign,
        categoryId: part.categoryId,
      });
    }
  }

  // 2. Distribute remainder among ratio-based parts.
  const remainder = totalCents - fixedTotal;
  const ratioParts = splits.filter((p) => p.fixedCents === undefined);
  const totalRatio = ratioParts.reduce((sum, p) => sum + (p.ratio ?? 1), 0);

  if (totalRatio > 0 && ratioParts.length > 0) {
    const ratioChildren: SplitChild[] = [];
    let allocated = 0;

    for (const part of ratioParts) {
      const ratio = part.ratio ?? 1;
      const share = bankersRound((remainder * ratio) / totalRatio);
      ratioChildren.push({
        label: part.label,
        amountCents: share * sign,
        categoryId: part.categoryId,
      });
      allocated += share;
    }

    // 3. Distribute rounding remainder.
    let diff = remainder - allocated;
    let idx = 0;
    while (diff !== 0) {
      const adjustment = diff > 0 ? 1 : -1;
      ratioChildren[idx % ratioChildren.length] = {
        ...ratioChildren[idx % ratioChildren.length],
        amountCents: ratioChildren[idx % ratioChildren.length].amountCents + adjustment * sign,
      };
      diff -= adjustment;
      idx++;
    }

    children.push(...ratioChildren);
  }

  return {
    sourceActionType: 'split_transaction',
    sourceRuleId: ruleId,
    changes: {
      splitChildren: children,
    },
  };
}

/**
 * Produce a mutation that assigns the transaction to a budget envelope.
 *
 * @param tx     - The transaction being processed.
 * @param action - The move-to-budget action.
 * @param ruleId - Identifier of the rule that triggered this action.
 * @returns A mutation proposing the budget assignment.
 */
export function executeMoveToBudget(
  _tx: Transaction,
  action: MoveToBudgetAction,
  ruleId: string,
): TransactionMutation {
  return {
    sourceActionType: 'move_to_budget',
    sourceRuleId: ruleId,
    changes: {
      budgetId: action.budgetId,
      budgetName: action.budgetName,
    },
  };
}

/**
 * Produce a mutation that flags the transaction for review.
 *
 * @param tx     - The transaction being processed.
 * @param action - The flag-for-review action.
 * @param ruleId - Identifier of the rule that triggered this action.
 * @returns A mutation proposing the review flag.
 */
export function executeFlagForReview(
  _tx: Transaction,
  action: FlagForReviewAction,
  ruleId: string,
): TransactionMutation {
  return {
    sourceActionType: 'flag_for_review',
    sourceRuleId: ruleId,
    changes: {
      flaggedForReview: true,
      flagReason: action.reason,
    },
  };
}

/**
 * Produce a mutation that queues a notification for the user.
 *
 * @param tx     - The transaction being processed.
 * @param action - The send-notification action.
 * @param ruleId - Identifier of the rule that triggered this action.
 * @returns A mutation proposing the notification.
 */
export function executeSendNotification(
  _tx: Transaction,
  action: SendNotificationAction,
  ruleId: string,
): TransactionMutation {
  return {
    sourceActionType: 'send_notification',
    sourceRuleId: ruleId,
    changes: {
      notification: { title: action.title, body: action.body },
    },
  };
}

// ---------------------------------------------------------------------------
// Action dispatcher
// ---------------------------------------------------------------------------

/**
 * Execute a single {@link RuleAction} against a transaction and return the
 * resulting {@link TransactionMutation}.
 *
 * @param tx     - The transaction being processed.
 * @param action - The action to execute.
 * @param ruleId - Identifier of the rule that triggered this action.
 * @returns A mutation describing the proposed change.
 */
export function executeAction(
  tx: Transaction,
  action: RuleAction,
  ruleId: string,
): TransactionMutation {
  switch (action.type) {
    case 'categorize':
      return executeCategorize(tx, action, ruleId);
    case 'add_tag':
      return executeAddTag(tx, action, ruleId);
    case 'split_transaction':
      return executeSplitTransaction(tx, action, ruleId);
    case 'move_to_budget':
      return executeMoveToBudget(tx, action, ruleId);
    case 'flag_for_review':
      return executeFlagForReview(tx, action, ruleId);
    case 'send_notification':
      return executeSendNotification(tx, action, ruleId);
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
