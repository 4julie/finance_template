// SPDX-License-Identifier: BUSL-1.1

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { InsightsPage } from './InsightsPage';
import type { UseWealthInsightsResult } from '../hooks/useWealthInsights';

vi.mock('../hooks/useWealthInsights', () => ({
  useWealthInsights: vi.fn(),
}));

import { useWealthInsights } from '../hooks/useWealthInsights';
const mockedUseWealthInsights = vi.mocked(useWealthInsights);

function makeDigest(): NonNullable<UseWealthInsightsResult['digest']> {
  return {
    period: 'weekly',
    currencyCode: 'USD',
    generatedAt: '2025-01-20T12:00:00.000Z',
    netWorth: {
      current: 250_000,
      previous: 225_000,
      assets: 300_000,
      liabilities: 50_000,
      change: { amount: 25_000, percent: 11.1, direction: 'up' },
      history: [
        {
          label: 'Jan 13',
          startDate: '2025-01-07',
          endDate: '2025-01-13',
          netWorth: 225_000,
          income: 80_000,
          spending: 40_000,
          savingsRate: 50,
        },
        {
          label: 'Jan 20',
          startDate: '2025-01-14',
          endDate: '2025-01-20',
          netWorth: 250_000,
          income: 90_000,
          spending: 45_000,
          savingsRate: 50,
        },
      ],
    },
    spending: {
      totalCurrentSpending: 60_000,
      totalPreviousSpending: 50_000,
      change: { amount: 10_000, percent: 20, direction: 'up' },
      topCategories: [
        {
          categoryId: 'food',
          categoryName: 'Food',
          currentAmount: 25_000,
          previousAmount: 18_000,
          shareOfSpending: 42,
          change: { amount: 7_000, percent: 38.9, direction: 'up' },
        },
      ],
    },
    savingsRate: {
      currentRate: 22,
      previousRate: 18,
      rateChangePoints: 4,
      change: { amount: 4, percent: 22.2, direction: 'up' },
      currentIncome: 120_000,
      currentSpending: 60_000,
      currentSavings: 60_000,
      history: [],
    },
    goals: [
      {
        id: 'goal-1',
        name: 'Emergency fund',
        status: 'ACTIVE',
        progressPercent: 68,
        targetAmount: 200_000,
        currentAmount: 136_000,
        remainingAmount: 64_000,
        targetDate: '2025-06-01',
        pace: 'on-track',
        monthlyContributionNeeded: 16_000,
      },
    ],
    healthScore: {
      score: 82,
      label: 'Strong',
      breakdown: {
        savingsRate: 25,
        budgetAdherence: 20,
        emergencyFund: 17.5,
        debtToIncome: 20,
      },
      metrics: {
        savingsRate: 22,
        onTrackBudgetRatio: 0.8,
        monthsOfExpensesSaved: 3.5,
        debtToIncomeRatio: 19,
      },
    },
    highlights: [
      {
        id: 'net-worth-growth',
        title: 'Your net worth moved in the right direction',
        description:
          '11.1% week-over-week growth suggests your current habits are compounding well.',
        tone: 'success',
        icon: 'trending-up',
        actionLabel: 'View net worth',
        actionHref: '/net-worth',
      },
    ],
  };
}

describe('InsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockedUseWealthInsights.mockReturnValue({
      digest: null,
      digests: {},
      activePeriod: 'weekly',
      setActivePeriod: vi.fn(),
      loading: true,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <InsightsPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Loading wealth insights')).toBeTruthy();
  });

  it('renders error state', () => {
    mockedUseWealthInsights.mockReturnValue({
      digest: null,
      digests: {},
      activePeriod: 'weekly',
      setActivePeriod: vi.fn(),
      loading: false,
      error: 'Failed to compute digest',
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <InsightsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Failed to compute digest')).toBeTruthy();
  });

  it('renders empty state when digest has no meaningful data', () => {
    const digest = makeDigest();
    mockedUseWealthInsights.mockReturnValue({
      digest: {
        ...digest,
        netWorth: { ...digest.netWorth, current: 0 },
        spending: { ...digest.spending, totalCurrentSpending: 0, topCategories: [] },
        savingsRate: { ...digest.savingsRate, currentIncome: 0 },
        goals: [],
      },
      digests: {},
      activePeriod: 'weekly',
      setActivePeriod: vi.fn(),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <InsightsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No wealth insights yet')).toBeTruthy();
  });

  it('renders the wealth digest experience', () => {
    const digest = makeDigest();
    mockedUseWealthInsights.mockReturnValue({
      digest,
      digests: { weekly: digest },
      activePeriod: 'weekly',
      setActivePeriod: vi.fn(),
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <InsightsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Weekly digest')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Weekly' })).toBeTruthy();
    expect(screen.getByText('Current net worth')).toBeTruthy();
    expect(screen.getByText('Top spending categories')).toBeTruthy();
    expect(screen.getByText('Goal progress updates')).toBeTruthy();
    expect(screen.getByText('Did you know?')).toBeTruthy();
    expect(screen.getByText('Your net worth moved in the right direction')).toBeTruthy();
  });
});
