// ---------------------------------------------------------------------------
// Bulk Operations Engine (#1573)
// Pure functions for bulk recategorisation, amount adjustment, and tagging.
// All monetary values in integer cents. Banker's rounding for divisions.
// ---------------------------------------------------------------------------

import type {
  BulkEditAction,
  BulkEditPreviewItem,
  BulkEditRequest,
  BulkEditSummary,
  BulkSelectionCriteria,
  RecategorizationRule,
  Transaction,
} from './types';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Banker's rounding (round-half-to-even) for an arbitrary number.
 * @param n - The number to round.
 * @returns The rounded integer.
 */
export function bankersRound(n: number): number {
  const floor = Math.floor(n);
  const decimal = n - floor;
  if (Math.abs(decimal - 0.5) < Number.EPSILON) {
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return Math.round(n);
}

/**
 * Test whether a single transaction matches the given selection criteria.
 * @param tx - The transaction to test.
 * @param criteria - The selection criteria.
 * @returns `true` when all specified criteria match.
 */
export function matchesCriteria(tx: Transaction, criteria: BulkSelectionCriteria): boolean {
  if (
    criteria.merchantPattern &&
    !tx.merchant.toLowerCase().includes(criteria.merchantPattern.toLowerCase())
  ) {
    return false;
  }
  if (criteria.category && tx.category !== criteria.category) {
    return false;
  }
  if (criteria.dateFrom && tx.date < criteria.dateFrom) {
    return false;
  }
  if (criteria.dateTo && tx.date > criteria.dateTo) {
    return false;
  }
  if (criteria.transactionIds && !criteria.transactionIds.includes(tx.id)) {
    return false;
  }
  if (criteria.minAmountCents !== undefined && tx.amountCents < criteria.minAmountCents) {
    return false;
  }
  if (criteria.maxAmountCents !== undefined && tx.amountCents > criteria.maxAmountCents) {
    return false;
  }
  return true;
}

/**
 * Select transactions matching the given criteria.
 * @param transactions - All transactions.
 * @param criteria - The filter criteria.
 * @returns Matching transactions.
 */
export function selectTransactions(
  transactions: readonly Transaction[],
  criteria: BulkSelectionCriteria,
): readonly Transaction[] {
  return transactions.filter((tx) => matchesCriteria(tx, criteria));
}

// ── Core: apply a single action to one transaction ─────────────────────────

/**
 * Apply a bulk edit action to a single transaction, returning the
 * updated transaction and the preview diff.  Returns `null` when the
 * action produces no change.
 *
 * @param tx - The original transaction.
 * @param action - The edit action to apply.
 * @returns A tuple of [updatedTransaction, previewItem] or `null`.
 */
export function applyAction(
  tx: Transaction,
  action: BulkEditAction,
): [Transaction, BulkEditPreviewItem] | null {
  switch (action.type) {
    case 'recategorize': {
      if (tx.category === action.newCategory) return null;
      return [
        { ...tx, category: action.newCategory },
        {
          transactionId: tx.id,
          fieldChanged: 'category',
          oldValue: tx.category,
          newValue: action.newCategory,
        },
      ];
    }
    case 'adjustAmount': {
      if (action.deltaAmountCents === 0) return null;
      const newAmount = tx.amountCents + action.deltaAmountCents;
      return [
        { ...tx, amountCents: newAmount },
        {
          transactionId: tx.id,
          fieldChanged: 'amountCents',
          oldValue: tx.amountCents,
          newValue: newAmount,
        },
      ];
    }
    case 'applyTag': {
      if (tx.tags.includes(action.tag)) return null;
      const newTags = [...tx.tags, action.tag];
      return [
        { ...tx, tags: newTags },
        {
          transactionId: tx.id,
          fieldChanged: 'tags',
          oldValue: tx.tags,
          newValue: newTags,
        },
      ];
    }
    case 'removeTag': {
      if (!tx.tags.includes(action.tag)) return null;
      const newTags = tx.tags.filter((t) => t !== action.tag);
      return [
        { ...tx, tags: newTags },
        {
          transactionId: tx.id,
          fieldChanged: 'tags',
          oldValue: tx.tags,
          newValue: newTags,
        },
      ];
    }
    case 'applyNote': {
      if (tx.note === action.note) return null;
      return [
        { ...tx, note: action.note },
        {
          transactionId: tx.id,
          fieldChanged: 'note',
          oldValue: tx.note,
          newValue: action.note,
        },
      ];
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Produce a dry-run preview of a bulk edit — shows what **would** change
 * without mutating any data.
 *
 * @param transactions - The full set of transactions to consider.
 * @param request - The bulk edit request (criteria + action).
 * @returns A summary with per-transaction diffs.
 */
export function bulkEditPreview(
  transactions: readonly Transaction[],
  request: BulkEditRequest,
): BulkEditSummary {
  const matched = selectTransactions(transactions, request.criteria);
  const previews: BulkEditPreviewItem[] = [];
  let totalAmountAffectedCents = 0;

  for (const tx of matched) {
    const result = applyAction(tx, request.action);
    if (result) {
      previews.push(result[1]);
      totalAmountAffectedCents += Math.abs(tx.amountCents);
    }
  }

  return {
    matchedCount: matched.length,
    affectedCount: previews.length,
    totalAmountAffectedCents,
    previews,
  };
}

/**
 * Apply a bulk edit, returning the full set of transactions with
 * affected ones updated, plus the operation summary.
 *
 * @param transactions - The full set of transactions.
 * @param request - The bulk edit request.
 * @returns A tuple of [updatedTransactions, summary].
 */
export function bulkEditApply(
  transactions: readonly Transaction[],
  request: BulkEditRequest,
): [readonly Transaction[], BulkEditSummary] {
  const previews: BulkEditPreviewItem[] = [];
  let totalAmountAffectedCents = 0;
  let matchedCount = 0;

  const updated = transactions.map((tx) => {
    if (!matchesCriteria(tx, request.criteria)) return tx;
    matchedCount++;
    const result = applyAction(tx, request.action);
    if (!result) return tx;
    previews.push(result[1]);
    totalAmountAffectedCents += Math.abs(tx.amountCents);
    return result[0];
  });

  return [
    updated,
    {
      matchedCount,
      affectedCount: previews.length,
      totalAmountAffectedCents,
      previews,
    },
  ];
}

/**
 * Apply multiple recategorisation rules in priority order (first match wins).
 *
 * @param transactions - The full set of transactions.
 * @param rules - Ordered recategorisation rules.
 * @returns A tuple of [updatedTransactions, summary].
 */
export function bulkRecategorize(
  transactions: readonly Transaction[],
  rules: readonly RecategorizationRule[],
): [readonly Transaction[], BulkEditSummary] {
  const previews: BulkEditPreviewItem[] = [];
  let totalAmountAffectedCents = 0;
  let matchedCount = 0;

  const updated = transactions.map((tx) => {
    for (const rule of rules) {
      if (matchesCriteria(tx, rule.criteria)) {
        matchedCount++;
        if (tx.category !== rule.newCategory) {
          previews.push({
            transactionId: tx.id,
            fieldChanged: 'category',
            oldValue: tx.category,
            newValue: rule.newCategory,
          });
          totalAmountAffectedCents += Math.abs(tx.amountCents);
          return { ...tx, category: rule.newCategory };
        }
        return tx; // matched but same category
      }
    }
    return tx;
  });

  return [
    updated,
    {
      matchedCount,
      affectedCount: previews.length,
      totalAmountAffectedCents,
      previews,
    },
  ];
}
