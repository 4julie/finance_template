// SPDX-License-Identifier: BUSL-1.1

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@fluentui/react-icons', () => ({}));
import {
  useCategories,
  useCoachAlerts,
  useDashboardData,
  useRecommendations,
  useTransactions,
} from '../hooks';
import { DashboardPage } from './DashboardPage';

vi.mock('../hooks', () => ({
  useDashboardData: vi.fn(),
  useCategories: vi.fn(),
  useCoachAlerts: vi.fn(),
  useRecommendations: vi.fn(),
  // DashboardPage now calls useTransactions to feed chart components.
  useTransactions: vi.fn(),
}));

vi.mock('../components/ai/QueryEngine', () => ({
  QueryEngine: () => <div data-testid="ai-query-engine">AI query engine</div>,
}));

vi.mock('../components/coaching', () => ({
  CoachCard: () => <section aria-label="Financial coach">What needs attention now</section>,
  CoachPanel: () => <section aria-label="Coach insights">Coach insights</section>,
}));

vi.mock('../components/common/CurrencyDisplay', () => ({
  CurrencyDisplay: ({ amount }: { amount: number }) => <span>{amount}</span>,
}));
vi.mock('../components/common/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <section>{title}</section>,
}));
vi.mock('../components/common/ErrorBanner', () => ({
  ErrorBanner: ({ message }: { message: string }) => <section>{message}</section>,
}));
vi.mock('../components/common/LoadingSpinner', () => ({
  LoadingSpinner: ({ label }: { label?: string }) => (
    <div role="status" aria-label={label ?? 'Loading'}>
      {label ?? 'Loading'}
    </div>
  ),
}));
vi.mock('../components/common/SyncIndicator', () => ({
  SyncIndicator: () => <span>Synced</span>,
}));
vi.mock('../components/OfflineBanner', () => ({
  OfflineBanner: () => null,
}));
vi.mock('../components/recommendations', () => ({
  RecommendationsFeed: () => (
    <section aria-label="Personalized recommendations">Recommended next moves</section>
  ),
}));

// Chart components depend on Recharts canvas APIs unavailable in jsdom.
// Stub them so the render test stays provider/canvas-free.
vi.mock('../components/charts', () => ({
  TrendLineChart: () => null,
  SpendingBarChart: () => null,
  CategoryPieChart: () => null,
}));

const mockedUseDashboardData = vi.mocked(useDashboardData);
const mockedUseCategories = vi.mocked(useCategories);
const mockedUseCoachAlerts = vi.mocked(useCoachAlerts);
const mockedUseRecommendations = vi.mocked(useRecommendations);
const mockedUseTransactions = vi.mocked(useTransactions);
const syncMetadata = {
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  deletedAt: null,
  syncVersion: 1,
  isSynced: true,
};

describe('DashboardPage', () => {
  beforeEach(() => {
    mockedUseDashboardData.mockReturnValue({
      data: {
        netWorth: 2475000,
        spentThisMonth: 234050,
        incomeThisMonth: 450000,
        monthlyBudget: 350000,
        budgetSpent: 234050,
        recentTransactions: [
          {
            id: '1',
            householdId: 'household-1',
            accountId: 'account-1',
            categoryId: 'category-food',
            type: 'EXPENSE',
            status: 'CLEARED',
            amount: { amount: 6742 },
            currency: { code: 'USD', decimalPlaces: 2 },
            payee: 'Grocery Store',
            note: null,
            date: '2025-03-06',
            transferAccountId: null,
            transferTransactionId: null,
            isRecurring: false,
            recurringRuleId: null,
            tags: [],
            merchantAddress: null,
            merchantCity: null,
            merchantState: null,
            merchantZip: null,
            merchantCountry: null,
            externalReferenceId: null,
            statementDescription: null,
            customFields: null,
            extraNotes: null,
            counterpartyName: null,
            counterpartyAccountId: null,
            ...syncMetadata,
          },
          {
            id: '2',
            householdId: 'household-1',
            accountId: 'account-1',
            categoryId: 'category-income',
            type: 'INCOME',
            status: 'CLEARED',
            amount: { amount: 450000 },
            currency: { code: 'USD', decimalPlaces: 2 },
            payee: 'Monthly Salary',
            note: null,
            date: '2025-03-06',
            transferAccountId: null,
            transferTransactionId: null,
            isRecurring: false,
            recurringRuleId: null,
            tags: [],
            merchantAddress: null,
            merchantCity: null,
            merchantState: null,
            merchantZip: null,
            merchantCountry: null,
            externalReferenceId: null,
            statementDescription: null,
            customFields: null,
            extraNotes: null,
            counterpartyName: null,
            counterpartyAccountId: null,
            ...syncMetadata,
          },
        ],
        accountSummary: [{ type: 'CHECKING', total: 2475000 }],
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    mockedUseCoachAlerts.mockReturnValue({
      analysis: {
        velocities: [],
        cashFlow: {
          currentBalanceCents: 2475000,
          projectedRecurringIncomeCents: 450000,
          projectedRecurringExpenseCents: 90000,
          projectedDiscretionaryExpenseCents: 125000,
          projectedEndBalanceCents: 2710000,
          daysRemaining: 10,
          willOverdraft: false,
          balanceSnapshots: [],
          recurringItems: [],
        },
        anomalies: [],
        alerts: [
          {
            id: 'alert:budget:food',
            severity: 'warning',
            type: 'budget-velocity',
            title: 'Food is ahead of budget pace',
            message: 'Food is tracking above the monthly plan.',
            actionLabel: 'Review budgets',
            actionRoute: '/budgets',
            sortValue: 100,
          },
        ],
        suggestions: [
          {
            id: 'suggestion:food',
            severity: 'warning',
            title: 'Slow Food spending pace',
            description: 'Trim daily Food spending for the rest of the month.',
            actionLabel: 'Review budgets',
            actionRoute: '/budgets',
          },
        ],
      },
      alerts: [
        {
          id: 'alert:budget:food',
          severity: 'warning',
          type: 'budget-velocity',
          title: 'Food is ahead of budget pace',
          message: 'Food is tracking above the monthly plan.',
          actionLabel: 'Review budgets',
          actionRoute: '/budgets',
          sortValue: 100,
        },
      ],
      topAlerts: [
        {
          id: 'alert:budget:food',
          severity: 'warning',
          type: 'budget-velocity',
          title: 'Food is ahead of budget pace',
          message: 'Food is tracking above the monthly plan.',
          actionLabel: 'Review budgets',
          actionRoute: '/budgets',
          sortValue: 100,
        },
      ],
      loading: false,
      error: null,
      dismissAlert: vi.fn(),
      clearDismissedAlerts: vi.fn(),
      dismissedAlertIds: new Set(),
    });
    mockedUseCategories.mockReturnValue({
      categories: [
        {
          id: 'category-food',
          householdId: 'household-1',
          name: 'Food',
          icon: 'utensils',
          color: '#16A34A',
          parentId: null,
          isIncome: false,
          isSystem: false,
          sortOrder: 1,
          ...syncMetadata,
        },
        {
          id: 'category-income',
          householdId: 'household-1',
          name: 'Income',
          icon: 'wallet',
          color: '#059669',
          parentId: null,
          isIncome: true,
          isSystem: true,
          sortOrder: 2,
          ...syncMetadata,
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
    });
    mockedUseRecommendations.mockReturnValue({
      recommendations: [
        {
          id: 'rec-1',
          title: 'You spent 40% more on Food this month',
          summary: "Returning to last month's pace could save about $200 this month.",
          explanation: 'Food is currently your biggest variable expense.',
          category: 'spending',
          priority: 'high',
          score: 88,
          currencyCode: 'USD',
          icon: 'chart-bar',
          tags: ['Food'],
          actionLabel: 'Review transactions',
          actionHref: '/transactions',
          actionSteps: [],
          evidence: ['This month: $400'],
          impact: { monthlySavingsCents: 20000, annualSavingsCents: 240000 },
        },
      ],
      summary: {
        totalCount: 1,
        criticalCount: 0,
        highCount: 1,
        estimatedMonthlySavingsCents: 20000,
        lastAnalyzedAt: '2025-03-06T00:00:00Z',
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    // useTransactions is called by DashboardPage to supply chart data.
    // Return an empty list — charts are stubbed, so no data is needed.
    mockedUseTransactions.mockReturnValue({
      transactions: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      createTransaction: vi.fn(),
      updateTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
    });
  });

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays financial summary cards', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Net Worth')).toBeInTheDocument();
    expect(screen.getByText('Spent This Month')).toBeInTheDocument();
    expect(screen.getByText('Budget Health')).toBeInTheDocument();
    expect(screen.getByText('What needs attention now')).toBeInTheDocument();
  });

  it('displays recent transactions section', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    expect(screen.getByText('Grocery Store')).toBeInTheDocument();
    expect(screen.getByText('Monthly Salary')).toBeInTheDocument();
  });

  it('has accessible landmarks', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('region', { name: /financial summary/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /mood and spending journal/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /recent transactions/i })).toBeInTheDocument();
  });

  it('renders the mood journal section', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Emotional Spending Journal')).toBeInTheDocument();
    expect(screen.getByText('Quick mood check-in')).toBeInTheDocument();
    expect(screen.getByText('Journal feed')).toBeInTheDocument();
  });

  it('includes the AI query engine entry point', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('ai-query-engine')).toBeInTheDocument();
  });
});
