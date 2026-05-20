// SPDX-License-Identifier: BUSL-1.1

/**
 * Pre-built rule templates for common financial automation scenarios.
 *
 * Each template is a factory function that returns a complete {@link Rule}
 * with sensible defaults. Callers can override any field via the optional
 * `overrides` parameter.
 *
 * All monetary values are in integer cents.
 *
 * Reference: issue #1614
 */

import type { Rule, RuleCondition, RuleAction } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _templateCounter = 0;

/**
 * Generate a deterministic template ID.
 *
 * @param prefix - Short prefix for the template kind.
 * @returns A unique-ish identifier suitable for default rule IDs.
 */
function templateId(prefix: string): string {
  _templateCounter += 1;
  return `template-${prefix}-${_templateCounter}`;
}

/**
 * Return the current ISO 8601 datetime string.
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Merge rule overrides into a base rule.
 *
 * @param base      - The default rule produced by the template.
 * @param overrides - Caller-supplied partial overrides.
 * @returns The merged rule.
 */
function applyOverrides(base: Rule, overrides?: Partial<Rule>): Rule {
  if (!overrides) return base;
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * Create a rule that auto-categorizes transactions from grocery merchants.
 *
 * Matches merchant names containing any of the well-known grocery keywords
 * and sets the category to the provided `categoryId` / `categoryName`.
 *
 * @param categoryId   - Target category identifier.
 * @param categoryName - Target category display name.
 * @param overrides    - Optional rule overrides.
 * @returns A complete {@link Rule}.
 */
export function autoCategorizeGroceries(
  categoryId: string,
  categoryName: string,
  overrides?: Partial<Rule>,
): Rule {
  const condition: RuleCondition = {
    type: 'or',
    children: [
      { type: 'merchant', pattern: 'grocery', mode: 'substring' },
      { type: 'merchant', pattern: 'supermarket', mode: 'substring' },
      { type: 'merchant', pattern: 'whole foods', mode: 'substring' },
      { type: 'merchant', pattern: 'trader joe', mode: 'substring' },
      { type: 'merchant', pattern: 'kroger', mode: 'substring' },
      { type: 'merchant', pattern: 'aldi', mode: 'substring' },
      { type: 'merchant', pattern: 'safeway', mode: 'substring' },
    ],
  };

  const actions: RuleAction[] = [{ type: 'categorize', categoryId, categoryName }];

  const ts = now();

  return applyOverrides(
    {
      id: templateId('groceries'),
      name: 'Auto-categorize Groceries',
      description:
        'Automatically assigns the grocery category to transactions from common grocery merchants.',
      enabled: true,
      trigger: 'on_import',
      priority: 100,
      condition,
      actions,
      createdAt: ts,
      updatedAt: ts,
    },
    overrides,
  );
}

/**
 * Create a rule that flags purchases exceeding a dollar threshold.
 *
 * @param thresholdCents - The threshold in cents (e.g. 50000 for $500).
 * @param overrides      - Optional rule overrides.
 * @returns A complete {@link Rule}.
 */
export function flagLargePurchases(thresholdCents: number, overrides?: Partial<Rule>): Rule {
  const condition: RuleCondition = {
    type: 'amount',
    operator: 'greater_than',
    valueCents: thresholdCents,
  };

  const dollars = (thresholdCents / 100).toFixed(2);
  const actions: RuleAction[] = [
    {
      type: 'flag_for_review',
      reason: `Purchase exceeds $${dollars} threshold`,
    },
    {
      type: 'send_notification',
      title: 'Large purchase detected',
      body: `A transaction over $${dollars} was recorded.`,
    },
  ];

  const ts = now();

  return applyOverrides(
    {
      id: templateId('large'),
      name: `Flag Large Purchases (>$${dollars})`,
      description: `Flags transactions exceeding $${dollars} for manual review and sends a notification.`,
      enabled: true,
      trigger: 'on_save',
      priority: 50,
      condition,
      actions,
      createdAt: ts,
      updatedAt: ts,
    },
    overrides,
  );
}

/**
 * Create a rule that splits a transaction 50/50 (e.g. shared rent).
 *
 * @param labelA    - Label for the first half (e.g. "Rent — Alice").
 * @param labelB    - Label for the second half (e.g. "Rent — Bob").
 * @param merchant  - Merchant name pattern to match.
 * @param overrides - Optional rule overrides.
 * @returns A complete {@link Rule}.
 */
export function splitRent5050(
  labelA: string,
  labelB: string,
  merchant: string,
  overrides?: Partial<Rule>,
): Rule {
  const condition: RuleCondition = {
    type: 'merchant',
    pattern: merchant,
    mode: 'substring',
  };

  const actions: RuleAction[] = [
    {
      type: 'split_transaction',
      splits: [
        { label: labelA, ratio: 1 },
        { label: labelB, ratio: 1 },
      ],
    },
  ];

  const ts = now();

  return applyOverrides(
    {
      id: templateId('split'),
      name: 'Split Rent 50/50',
      description: `Splits transactions from "${merchant}" evenly between two people.`,
      enabled: true,
      trigger: 'on_import',
      priority: 75,
      condition,
      actions,
      createdAt: ts,
      updatedAt: ts,
    },
    overrides,
  );
}

/**
 * Create a rule that tags recurring transactions as subscriptions.
 *
 * @param tag       - The tag to apply (defaults to "subscription").
 * @param overrides - Optional rule overrides.
 * @returns A complete {@link Rule}.
 */
export function tagSubscriptionPayments(
  tag: string = 'subscription',
  overrides?: Partial<Rule>,
): Rule {
  const condition: RuleCondition = {
    type: 'recurring',
    isRecurring: true,
  };

  const actions: RuleAction[] = [{ type: 'add_tag', tag }];

  const ts = now();

  return applyOverrides(
    {
      id: templateId('subscription'),
      name: 'Tag Subscription Payments',
      description: 'Adds a tag to all recurring transactions so they can be filtered easily.',
      enabled: true,
      trigger: 'on_import',
      priority: 200,
      condition,
      actions,
      createdAt: ts,
      updatedAt: ts,
    },
    overrides,
  );
}

/**
 * Create a rule that rounds up transaction amounts and assigns the
 * round-up difference to a savings budget.
 *
 * This template uses a flag-for-review action with metadata since
 * the actual round-up transfer would be a side effect outside the
 * engine's scope.
 *
 * @param savingsBudgetId   - Target savings budget identifier.
 * @param savingsBudgetName - Target savings budget display name.
 * @param overrides         - Optional rule overrides.
 * @returns A complete {@link Rule}.
 */
export function roundUpSavings(
  savingsBudgetId: string,
  savingsBudgetName: string,
  overrides?: Partial<Rule>,
): Rule {
  // Match any transaction (always true via an amount >= 1 cent condition).
  const condition: RuleCondition = {
    type: 'amount',
    operator: 'greater_or_equal',
    valueCents: 1,
  };

  const actions: RuleAction[] = [
    {
      type: 'move_to_budget',
      budgetId: savingsBudgetId,
      budgetName: savingsBudgetName,
    },
    {
      type: 'add_tag',
      tag: 'round-up',
    },
  ];

  const ts = now();

  return applyOverrides(
    {
      id: templateId('roundup'),
      name: 'Round-Up Savings',
      description: 'Tags transactions for round-up savings and assigns them to the savings budget.',
      enabled: true,
      trigger: 'on_save',
      priority: 300,
      condition,
      actions,
      createdAt: ts,
      updatedAt: ts,
    },
    overrides,
  );
}

/**
 * Reset the internal template counter. Useful in tests to get
 * deterministic IDs.
 */
export function resetTemplateCounter(): void {
  _templateCounter = 0;
}
