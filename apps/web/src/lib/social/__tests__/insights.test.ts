// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';
import {
  createInsight,
  detectBudgetOnTrack,
  detectCategoryShifts,
  detectGoalProgress,
  detectRecurringTransactions,
  detectSavingsOpportunities,
  detectSpendingSpikes,
  detectUnusualMerchants,
  generateAllInsights,
} from '../insights';
import type {
  BudgetContext,
  CategoryAggregate,
  GoalContext,
  InsightTransaction,
} from '../insights';

describe('createInsight', () => {
  it('creates insight with correct fields', () => {
    const insight = createInsight('spending-spike', 'Test', 'Body', 'warning', 75, '/test');
    expect(insight.type).toBe('spending-spike');
    expect(insight.title).toBe('Test');
    expect(insight.body).toBe('Body');
    expect(insight.severity).toBe('warning');
    expect(insight.relevanceScore).toBe(75);
    expect(insight.actionUrl).toBe('/test');
    expect(insight.id).toBeTruthy();
    expect(insight.generatedAt).toBeTruthy();
  });

  it('clamps relevance score to 0-100', () => {
    expect(createInsight('spending-spike', '', '', 'info', 150).relevanceScore).toBe(100);
    expect(createInsight('spending-spike', '', '', 'info', -10).relevanceScore).toBe(0);
  });
});

describe('detectSpendingSpikes', () => {
  const current: CategoryAggregate[] = [
    {
      categoryId: '1',
      categoryName: 'Food',
      totalCents: 60000,
      transactionCount: 10,
      averageCents: 6000,
    },
  ];
  const historical: CategoryAggregate[] = [
    {
      categoryId: '1',
      categoryName: 'Food',
      totalCents: 30000,
      transactionCount: 10,
      averageCents: 3000,
    },
  ];

  it('detects spike when current > threshold * historical', () => {
    const insights = detectSpendingSpikes(current, historical, 1.5);
    expect(insights).toHaveLength(1);
    expect(insights[0].type).toBe('spending-spike');
  });

  it('does not flag when below threshold', () => {
    const mild: CategoryAggregate[] = [
      {
        categoryId: '1',
        categoryName: 'Food',
        totalCents: 35000,
        transactionCount: 10,
        averageCents: 3500,
      },
    ];
    const baseline: CategoryAggregate[] = [
      {
        categoryId: '1',
        categoryName: 'Food',
        totalCents: 30000,
        transactionCount: 10,
        averageCents: 30000,
      },
    ];
    const insights = detectSpendingSpikes(mild, baseline, 1.5);
    expect(insights).toHaveLength(0);
  });

  it('skips categories without historical data', () => {
    const insights = detectSpendingSpikes(current, [], 1.5);
    expect(insights).toHaveLength(0);
  });
});

describe('detectSavingsOpportunities', () => {
  const budgets: BudgetContext[] = [
    {
      categoryId: '1',
      categoryName: 'Food',
      budgetCents: 50000,
      spentCents: 10000,
      periodLabel: 'Jan',
    },
  ];

  it('detects opportunity when utilization is low', () => {
    const insights = detectSavingsOpportunities(budgets, 0.3);
    expect(insights).toHaveLength(1);
    expect(insights[0].type).toBe('savings-opportunity');
  });

  it('does not flag when utilization is above threshold', () => {
    const insights = detectSavingsOpportunities(
      [
        {
          categoryId: '1',
          categoryName: 'Food',
          budgetCents: 50000,
          spentCents: 40000,
          periodLabel: 'Jan',
        },
      ],
      0.3,
    );
    expect(insights).toHaveLength(0);
  });
});

describe('detectBudgetOnTrack', () => {
  it('detects on-track budget', () => {
    const budgets: BudgetContext[] = [
      {
        categoryId: '1',
        categoryName: 'Food',
        budgetCents: 50000,
        spentCents: 30000,
        periodLabel: 'Jan',
      },
    ];
    const insights = detectBudgetOnTrack(budgets);
    expect(insights).toHaveLength(1);
    expect(insights[0].type).toBe('budget-on-track');
  });

  it('does not flag over-budget categories', () => {
    const budgets: BudgetContext[] = [
      {
        categoryId: '1',
        categoryName: 'Food',
        budgetCents: 50000,
        spentCents: 48000,
        periodLabel: 'Jan',
      },
    ];
    expect(detectBudgetOnTrack(budgets)).toHaveLength(0);
  });
});

describe('detectUnusualMerchants', () => {
  const transactions: InsightTransaction[] = [
    {
      id: '1',
      amountCents: 5000,
      categoryId: null,
      categoryName: null,
      merchantName: 'NewStore',
      date: '2024-01-01',
      type: 'EXPENSE',
    },
    {
      id: '2',
      amountCents: 3000,
      categoryId: null,
      categoryName: null,
      merchantName: 'OldStore',
      date: '2024-01-02',
      type: 'EXPENSE',
    },
  ];

  it('detects new merchants not in known set', () => {
    const known = new Set(['OldStore']);
    const insights = detectUnusualMerchants(transactions, known);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toContain('NewStore');
  });

  it('deduplicates same merchant appearing multiple times', () => {
    const txns: InsightTransaction[] = [
      {
        id: '1',
        amountCents: 5000,
        categoryId: null,
        categoryName: null,
        merchantName: 'NewStore',
        date: '2024-01-01',
        type: 'EXPENSE',
      },
      {
        id: '2',
        amountCents: 5000,
        categoryId: null,
        categoryName: null,
        merchantName: 'NewStore',
        date: '2024-01-02',
        type: 'EXPENSE',
      },
    ];
    const insights = detectUnusualMerchants(txns, new Set());
    expect(insights).toHaveLength(1);
  });
});

describe('detectRecurringTransactions', () => {
  it('detects recurring transactions with similar amounts', () => {
    const transactions: InsightTransaction[] = Array.from({ length: 4 }, (_, i) => ({
      id: String(i),
      amountCents: 1000,
      categoryId: null,
      categoryName: null,
      merchantName: 'Netflix',
      date: `2024-0${i + 1}-15`,
      type: 'EXPENSE' as const,
    }));

    const insights = detectRecurringTransactions(transactions, 100, 3);
    expect(insights).toHaveLength(1);
    expect(insights[0].type).toBe('recurring-detected');
  });

  it('does not flag transactions with varying amounts', () => {
    const transactions: InsightTransaction[] = [
      {
        id: '1',
        amountCents: 1000,
        categoryId: null,
        categoryName: null,
        merchantName: 'Store',
        date: '2024-01-01',
        type: 'EXPENSE',
      },
      {
        id: '2',
        amountCents: 5000,
        categoryId: null,
        categoryName: null,
        merchantName: 'Store',
        date: '2024-02-01',
        type: 'EXPENSE',
      },
      {
        id: '3',
        amountCents: 9000,
        categoryId: null,
        categoryName: null,
        merchantName: 'Store',
        date: '2024-03-01',
        type: 'EXPENSE',
      },
    ];
    expect(detectRecurringTransactions(transactions, 100, 3)).toHaveLength(0);
  });
});

describe('detectGoalProgress', () => {
  it('detects completed goal', () => {
    const goals: GoalContext[] = [
      {
        goalId: '1',
        goalName: 'Vacation',
        targetCents: 100000,
        currentCents: 100000,
        targetDate: null,
      },
    ];
    const insights = detectGoalProgress(goals);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toContain('reached');
  });

  it('detects 75% milestone', () => {
    const goals: GoalContext[] = [
      {
        goalId: '1',
        goalName: 'Vacation',
        targetCents: 100000,
        currentCents: 80000,
        targetDate: null,
      },
    ];
    const insights = detectGoalProgress(goals);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toContain('80%');
  });

  it('ignores goals below 50%', () => {
    const goals: GoalContext[] = [
      {
        goalId: '1',
        goalName: 'Vacation',
        targetCents: 100000,
        currentCents: 30000,
        targetDate: null,
      },
    ];
    expect(detectGoalProgress(goals)).toHaveLength(0);
  });
});

describe('detectCategoryShifts', () => {
  it('detects significant category share change', () => {
    const current: CategoryAggregate[] = [
      {
        categoryId: '1',
        categoryName: 'Food',
        totalCents: 80000,
        transactionCount: 10,
        averageCents: 8000,
      },
      {
        categoryId: '2',
        categoryName: 'Housing',
        totalCents: 20000,
        transactionCount: 1,
        averageCents: 20000,
      },
    ];
    const previous: CategoryAggregate[] = [
      {
        categoryId: '1',
        categoryName: 'Food',
        totalCents: 40000,
        transactionCount: 10,
        averageCents: 4000,
      },
      {
        categoryId: '2',
        categoryName: 'Housing',
        totalCents: 60000,
        transactionCount: 1,
        averageCents: 60000,
      },
    ];

    const insights = detectCategoryShifts(current, previous, 10);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].type).toBe('category-shift');
  });
});

describe('generateAllInsights', () => {
  it('returns sorted insights from all sources', () => {
    const budgets: BudgetContext[] = [
      {
        categoryId: '1',
        categoryName: 'Food',
        budgetCents: 50000,
        spentCents: 10000,
        periodLabel: 'Jan',
      },
    ];
    const goals: GoalContext[] = [
      {
        goalId: '1',
        goalName: 'Vacation',
        targetCents: 100000,
        currentCents: 100000,
        targetDate: null,
      },
    ];

    const insights = generateAllInsights({ budgets, goals });
    expect(insights.length).toBeGreaterThan(0);

    // Verify sorted by relevance descending
    for (let i = 1; i < insights.length; i++) {
      expect(insights[i - 1].relevanceScore).toBeGreaterThanOrEqual(insights[i].relevanceScore);
    }
  });

  it('returns empty array when no data provided', () => {
    expect(generateAllInsights({})).toEqual([]);
  });
});
