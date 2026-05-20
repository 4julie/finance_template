// SPDX-License-Identifier: BUSL-1.1

/**
 * Contextual financial insight generator.
 *
 * Analyzes transaction history to produce ranked insights such as
 * spending spikes, savings opportunities, and recurring transactions.
 * All monetary values in integer cents. Pure functions, no side effects.
 *
 * References: #1634
 */

import type { Insight, InsightSeverity, InsightType } from './types';

// ---------------------------------------------------------------------------
// Transaction Input Types (minimal — no dependency on KMP bridge)
// ---------------------------------------------------------------------------

/** Minimal transaction data needed for insight generation. */
export interface InsightTransaction {
  readonly id: string;
  readonly amountCents: number;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly merchantName: string | null;
  readonly date: string;
  readonly type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
}

/** Historical spending aggregate for comparison. */
export interface CategoryAggregate {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly totalCents: number;
  readonly transactionCount: number;
  readonly averageCents: number;
}

/** Budget context for on-track detection. */
export interface BudgetContext {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly budgetCents: number;
  readonly spentCents: number;
  readonly periodLabel: string;
}

/** Goal context for progress tracking. */
export interface GoalContext {
  readonly goalId: string;
  readonly goalName: string;
  readonly targetCents: number;
  readonly currentCents: number;
  readonly targetDate: string | null;
}

// ---------------------------------------------------------------------------
// Insight Generation
// ---------------------------------------------------------------------------

let insightCounter = 0;

/**
 * Creates a unique insight ID.
 *
 * @returns A unique string ID for an insight.
 */
function generateInsightId(): string {
  insightCounter++;
  return `insight-${Date.now()}-${insightCounter}`;
}

/**
 * Creates an Insight object with common defaults.
 *
 * @param type - The insight type.
 * @param title - Short title.
 * @param body - Descriptive body text.
 * @param severity - Severity level.
 * @param relevanceScore - Relevance score 0–100.
 * @param actionUrl - Optional deep-link URL.
 * @returns A fully formed Insight.
 */
export function createInsight(
  type: InsightType,
  title: string,
  body: string,
  severity: InsightSeverity,
  relevanceScore: number,
  actionUrl: string | null = null,
): Insight {
  return {
    id: generateInsightId(),
    type,
    title,
    body,
    severity,
    actionUrl,
    generatedAt: new Date().toISOString(),
    relevanceScore: Math.min(100, Math.max(0, relevanceScore)),
  };
}

/**
 * Detects spending spikes — categories where current period spending
 * exceeds the historical average by a significant margin.
 *
 * @param currentAggregates - Current period category aggregates.
 * @param historicalAggregates - Historical average aggregates.
 * @param spikeThreshold - Multiplier threshold (default 1.5 = 50% above average).
 * @returns Array of spending-spike insights.
 */
export function detectSpendingSpikes(
  currentAggregates: readonly CategoryAggregate[],
  historicalAggregates: readonly CategoryAggregate[],
  spikeThreshold: number = 1.5,
): Insight[] {
  const historicalMap = new Map(historicalAggregates.map((a) => [a.categoryId, a]));
  const insights: Insight[] = [];

  for (const current of currentAggregates) {
    const historical = historicalMap.get(current.categoryId);
    if (!historical || historical.averageCents === 0) continue;

    const ratio = current.totalCents / historical.averageCents;
    if (ratio >= spikeThreshold) {
      const overagePercent = Math.round((ratio - 1) * 100);
      insights.push(
        createInsight(
          'spending-spike',
          `${current.categoryName} spending is up`,
          `You've spent ${overagePercent}% more on ${current.categoryName} than your average.`,
          ratio >= 2 ? 'critical' : 'warning',
          Math.min(100, Math.round(ratio * 30)),
          `/categories/${current.categoryId}`,
        ),
      );
    }
  }

  return insights;
}

/**
 * Detects savings opportunities — categories where spending is
 * consistently high relative to peer benchmarks or personal targets.
 *
 * @param budgets - Budget contexts with current spending.
 * @param savingsThreshold - Fraction of budget remaining to trigger (default 0.3 = 30%).
 * @returns Array of savings-opportunity insights.
 */
export function detectSavingsOpportunities(
  budgets: readonly BudgetContext[],
  savingsThreshold: number = 0.3,
): Insight[] {
  const insights: Insight[] = [];

  for (const budget of budgets) {
    if (budget.budgetCents === 0) continue;

    const utilization = budget.spentCents / budget.budgetCents;

    if (utilization < savingsThreshold) {
      const savedPercent = Math.round((1 - utilization) * 100);
      insights.push(
        createInsight(
          'savings-opportunity',
          `${budget.categoryName} under budget`,
          `You've only used ${Math.round(utilization * 100)}% of your ${budget.categoryName} budget. ${savedPercent}% could go to savings.`,
          'success',
          40 + Math.round((1 - utilization) * 30),
          `/budgets`,
        ),
      );
    }
  }

  return insights;
}

/**
 * Detects categories that are on track with their budget.
 *
 * @param budgets - Budget contexts with current spending.
 * @param lowerBound - Minimum utilization to be "on track" (default 0.4).
 * @param upperBound - Maximum utilization to be "on track" (default 0.85).
 * @returns Array of budget-on-track insights.
 */
export function detectBudgetOnTrack(
  budgets: readonly BudgetContext[],
  lowerBound: number = 0.4,
  upperBound: number = 0.85,
): Insight[] {
  const insights: Insight[] = [];

  for (const budget of budgets) {
    if (budget.budgetCents === 0) continue;

    const utilization = budget.spentCents / budget.budgetCents;

    if (utilization >= lowerBound && utilization <= upperBound) {
      insights.push(
        createInsight(
          'budget-on-track',
          `${budget.categoryName} is on track`,
          `You've used ${Math.round(utilization * 100)}% of your ${budget.categoryName} budget for ${budget.periodLabel}.`,
          'success',
          20,
          `/budgets`,
        ),
      );
    }
  }

  return insights;
}

/**
 * Detects unusual merchants — merchants appearing for the first time
 * in recent transactions.
 *
 * @param recentTransactions - Recent transactions to check.
 * @param knownMerchants - Set of previously-seen merchant names.
 * @returns Array of unusual-merchant insights.
 */
export function detectUnusualMerchants(
  recentTransactions: readonly InsightTransaction[],
  knownMerchants: ReadonlySet<string>,
): Insight[] {
  const seen = new Set<string>();
  const insights: Insight[] = [];

  for (const txn of recentTransactions) {
    if (!txn.merchantName || knownMerchants.has(txn.merchantName) || seen.has(txn.merchantName)) {
      continue;
    }

    seen.add(txn.merchantName);
    insights.push(
      createInsight(
        'unusual-merchant',
        `New merchant: ${txn.merchantName}`,
        `First transaction with ${txn.merchantName} detected.`,
        'info',
        30,
        `/transactions/${txn.id}`,
      ),
    );
  }

  return insights;
}

/**
 * Detects potentially recurring transactions based on repeated
 * merchant + similar amount patterns.
 *
 * @param transactions - Transaction history (sorted by date descending).
 * @param toleranceCents - Amount tolerance for matching (default 100 = $1).
 * @param minOccurrences - Minimum repeats to flag as recurring (default 3).
 * @returns Array of recurring-detected insights.
 */
export function detectRecurringTransactions(
  transactions: readonly InsightTransaction[],
  toleranceCents: number = 100,
  minOccurrences: number = 3,
): Insight[] {
  const merchantGroups = new Map<string, InsightTransaction[]>();

  for (const txn of transactions) {
    if (!txn.merchantName) continue;
    const key = txn.merchantName.toLowerCase();
    const group = merchantGroups.get(key) ?? [];
    group.push(txn);
    merchantGroups.set(key, group);
  }

  const insights: Insight[] = [];

  for (const [, group] of merchantGroups) {
    if (group.length < minOccurrences) continue;

    // Check if amounts are similar
    const amounts = group.map((t) => t.amountCents);
    const avgAmount = Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length);
    const allSimilar = amounts.every((a) => Math.abs(a - avgAmount) <= toleranceCents);

    if (allSimilar) {
      const merchant = group[0].merchantName!;
      insights.push(
        createInsight(
          'recurring-detected',
          `Recurring: ${merchant}`,
          `${group.length} similar transactions from ${merchant} detected. This may be a subscription.`,
          'info',
          50,
          `/transactions?merchant=${encodeURIComponent(merchant)}`,
        ),
      );
    }
  }

  return insights;
}

/**
 * Detects goal progress milestones.
 *
 * @param goals - Current goal contexts.
 * @returns Array of goal-progress insights.
 */
export function detectGoalProgress(goals: readonly GoalContext[]): Insight[] {
  const insights: Insight[] = [];

  for (const goal of goals) {
    if (goal.targetCents === 0) continue;

    const progress = goal.currentCents / goal.targetCents;

    if (progress >= 1.0) {
      insights.push(
        createInsight(
          'goal-progress',
          `Goal reached: ${goal.goalName}`,
          `Congratulations! You've reached your ${goal.goalName} goal.`,
          'success',
          90,
          `/goals/${goal.goalId}`,
        ),
      );
    } else if (progress >= 0.75) {
      insights.push(
        createInsight(
          'goal-progress',
          `${goal.goalName}: ${Math.round(progress * 100)}% complete`,
          `You're ${Math.round(progress * 100)}% of the way to your ${goal.goalName} goal!`,
          'info',
          60,
          `/goals/${goal.goalId}`,
        ),
      );
    } else if (progress >= 0.5) {
      insights.push(
        createInsight(
          'goal-progress',
          `${goal.goalName}: halfway there`,
          `You've reached ${Math.round(progress * 100)}% of your ${goal.goalName} goal.`,
          'info',
          40,
          `/goals/${goal.goalId}`,
        ),
      );
    }
  }

  return insights;
}

/**
 * Detects category shifts — significant changes in the proportion
 * of spending across categories between two periods.
 *
 * @param currentAggregates - Current period aggregates.
 * @param previousAggregates - Previous period aggregates.
 * @param shiftThreshold - Minimum absolute percentage-point shift to report (default 10).
 * @returns Array of category-shift insights.
 */
export function detectCategoryShifts(
  currentAggregates: readonly CategoryAggregate[],
  previousAggregates: readonly CategoryAggregate[],
  shiftThreshold: number = 10,
): Insight[] {
  const currentTotal = currentAggregates.reduce((s, a) => s + a.totalCents, 0);
  const previousTotal = previousAggregates.reduce((s, a) => s + a.totalCents, 0);

  if (currentTotal === 0 || previousTotal === 0) return [];

  const previousMap = new Map(previousAggregates.map((a) => [a.categoryId, a]));
  const insights: Insight[] = [];

  for (const current of currentAggregates) {
    const currentPct = (current.totalCents / currentTotal) * 100;
    const previous = previousMap.get(current.categoryId);
    const previousPct = previous ? (previous.totalCents / previousTotal) * 100 : 0;
    const shift = currentPct - previousPct;

    if (Math.abs(shift) >= shiftThreshold) {
      const direction = shift > 0 ? 'increased' : 'decreased';
      insights.push(
        createInsight(
          'category-shift',
          `${current.categoryName} share ${direction}`,
          `${current.categoryName} went from ${Math.round(previousPct)}% to ${Math.round(currentPct)}% of your spending.`,
          'info',
          Math.min(70, Math.round(Math.abs(shift))),
          `/categories/${current.categoryId}`,
        ),
      );
    }
  }

  return insights;
}

/**
 * Generates all insights from available data sources.
 *
 * Runs all detection functions and returns a merged, deduplicated,
 * and relevance-sorted list of insights.
 *
 * @param params - All input data for insight generation.
 * @returns Sorted array of insights (highest relevance first).
 */
export function generateAllInsights(params: {
  readonly currentAggregates?: readonly CategoryAggregate[];
  readonly historicalAggregates?: readonly CategoryAggregate[];
  readonly previousAggregates?: readonly CategoryAggregate[];
  readonly budgets?: readonly BudgetContext[];
  readonly goals?: readonly GoalContext[];
  readonly recentTransactions?: readonly InsightTransaction[];
  readonly allTransactions?: readonly InsightTransaction[];
  readonly knownMerchants?: ReadonlySet<string>;
}): Insight[] {
  const all: Insight[] = [];

  if (params.currentAggregates && params.historicalAggregates) {
    all.push(...detectSpendingSpikes(params.currentAggregates, params.historicalAggregates));
  }

  if (params.budgets) {
    all.push(...detectSavingsOpportunities(params.budgets));
    all.push(...detectBudgetOnTrack(params.budgets));
  }

  if (params.recentTransactions && params.knownMerchants) {
    all.push(...detectUnusualMerchants(params.recentTransactions, params.knownMerchants));
  }

  if (params.allTransactions) {
    all.push(...detectRecurringTransactions(params.allTransactions));
  }

  if (params.goals) {
    all.push(...detectGoalProgress(params.goals));
  }

  if (params.currentAggregates && params.previousAggregates) {
    all.push(...detectCategoryShifts(params.currentAggregates, params.previousAggregates));
  }

  // Sort by relevance score descending
  return all.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
