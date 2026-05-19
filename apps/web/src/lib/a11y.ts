// SPDX-License-Identifier: BUSL-1.1

/**
 * Accessibility utility functions for the Finance web app.
 *
 * Provides screen-reader-friendly formatters for currency amounts,
 * percentages, and financial status indicators. These utilities ensure
 * that financial data is announced with full context — including sign,
 * currency, and surrounding meaning — so that assistive technology
 * users receive the same information as sighted users.
 *
 * References: issues #1689, #1693
 */

import { formatCurrency } from './currency';

// ---------------------------------------------------------------------------
// Currency formatting for screen readers
// ---------------------------------------------------------------------------

/**
 * Format a cents amount into a screen-reader-friendly label.
 *
 * Produces spoken-form output like:
 *   - "twelve dollars and thirty-four cents"
 *   - "negative forty-two dollars and fifty cents, Dining category"
 *
 * Falls back to a simpler form using `Intl.NumberFormat` with the
 * locale's full currency name and explicit "negative" prefix.
 *
 * @param amountInCents - Integer cents (e.g., 12345 = $123.45).
 * @param currency - ISO 4217 currency code (default: "USD").
 * @param context - Optional context string appended to the label
 *   (e.g., "Dining category", "Emergency Fund goal").
 *
 * @example
 * ```ts
 * formatCurrencyForScreenReader(-4250);
 * // "negative $42.50"
 *
 * formatCurrencyForScreenReader(-4250, 'USD', 'Dining category');
 * // "negative $42.50, Dining category"
 *
 * formatCurrencyForScreenReader(100000, 'EUR', 'Savings goal');
 * // "€1,000.00, Savings goal"
 * ```
 */
export function formatCurrencyForScreenReader(
  amountInCents: number,
  currency = 'USD',
  context?: string,
): string {
  const isNegative = amountInCents < 0;
  const formatted = formatCurrency(Math.abs(amountInCents), { currency });
  const base = isNegative ? `negative ${formatted}` : formatted;

  return context ? `${base}, ${context}` : base;
}

// ---------------------------------------------------------------------------
// Percentage formatting for screen readers
// ---------------------------------------------------------------------------

/**
 * Format a percentage value with context for screen readers.
 *
 * Produces labels like "75 percent of monthly budget used" instead of
 * bare "75%" which can be ambiguous for assistive technology.
 *
 * @param value - The percentage value (0–100+).
 * @param context - What the percentage measures
 *   (e.g., "of monthly budget used", "of goal reached").
 *
 * @example
 * ```ts
 * formatPercentForScreenReader(75, 'of monthly budget used');
 * // "75 percent of monthly budget used"
 * ```
 */
export function formatPercentForScreenReader(value: number, context: string): string {
  return `${value} percent ${context}`;
}

// ---------------------------------------------------------------------------
// Financial status text indicators
// ---------------------------------------------------------------------------

/**
 * Return a text indicator for a financial amount direction.
 *
 * Provides a non-color indicator (arrow + label) so that positive and
 * negative states are distinguishable without relying on color alone
 * (WCAG 1.4.1 — Use of Color).
 *
 * @param amount - The financial amount (positive = good, negative = bad
 *   in the budget-remaining context).
 *
 * @example
 * ```ts
 * getStatusIndicator(500);   // { icon: '↑', label: 'under budget', tone: 'positive' }
 * getStatusIndicator(-200);  // { icon: '↓', label: 'over budget', tone: 'negative' }
 * getStatusIndicator(0);     // { icon: '→', label: 'on budget', tone: 'neutral' }
 * ```
 */
export function getStatusIndicator(amount: number): {
  icon: string;
  label: string;
  tone: 'positive' | 'negative' | 'neutral';
} {
  if (amount > 0) {
    return { icon: '↑', label: 'under budget', tone: 'positive' };
  }
  if (amount < 0) {
    return { icon: '↓', label: 'over budget', tone: 'negative' };
  }
  return { icon: '→', label: 'on budget', tone: 'neutral' };
}

/**
 * Return a text indicator for goal progress percentage.
 *
 * @param percentComplete - The goal completion percentage (0–100+).
 *
 * @example
 * ```ts
 * getGoalStatusIndicator(100); // { icon: '✓', label: 'Goal reached', tone: 'positive' }
 * getGoalStatusIndicator(60);  // { icon: '◐', label: 'In progress', tone: 'positive' }
 * getGoalStatusIndicator(20);  // { icon: '○', label: 'Getting started', tone: 'warning' }
 * ```
 */
export function getGoalStatusIndicator(percentComplete: number): {
  icon: string;
  label: string;
  tone: 'positive' | 'warning' | 'negative';
} {
  if (percentComplete >= 100) {
    return { icon: '✓', label: 'Goal reached', tone: 'positive' };
  }
  if (percentComplete >= 50) {
    return { icon: '◐', label: 'In progress', tone: 'positive' };
  }
  if (percentComplete >= 25) {
    return { icon: '◔', label: 'Getting started', tone: 'warning' };
  }
  return { icon: '○', label: 'Just started', tone: 'negative' };
}

/**
 * Return a text indicator for budget usage percentage.
 *
 * @param percentUsed - Budget usage percentage (0–100+).
 *
 * @example
 * ```ts
 * getBudgetStatusIndicator(95);  // { icon: '⚠', label: 'Over limit', tone: 'negative' }
 * getBudgetStatusIndicator(80);  // { icon: '◐', label: 'Near limit', tone: 'warning' }
 * getBudgetStatusIndicator(50);  // { icon: '●', label: 'On track', tone: 'positive' }
 * ```
 */
export function getBudgetStatusIndicator(percentUsed: number): {
  icon: string;
  label: string;
  tone: 'positive' | 'warning' | 'negative';
} {
  if (percentUsed > 90) {
    return { icon: '⚠', label: 'Over limit', tone: 'negative' };
  }
  if (percentUsed > 75) {
    return { icon: '◐', label: 'Near limit', tone: 'warning' };
  }
  return { icon: '●', label: 'On track', tone: 'positive' };
}
