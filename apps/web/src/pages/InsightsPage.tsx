// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { WeeklyDigest } from '../components/insights';
import { EmptyState, ErrorBanner, LoadingSpinner } from '../components/common';
import { useWealthInsights } from '../hooks/useWealthInsights';
import './InsightsPage.css';

function isDigestEmpty(
  netWorth: number,
  spending: number,
  income: number,
  goalCount: number,
): boolean {
  return netWorth === 0 && spending === 0 && income === 0 && goalCount === 0;
}

export const InsightsPage: React.FC = () => {
  const { digest, activePeriod, setActivePeriod, loading, error, refresh } = useWealthInsights();

  if (loading) {
    return (
      <div className="wealth-insights-page__loading">
        <LoadingSpinner label="Loading wealth insights" />
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={refresh} />;
  }

  if (
    !digest ||
    isDigestEmpty(
      digest.netWorth.current,
      digest.spending.totalCurrentSpending,
      digest.savingsRate.currentIncome,
      digest.goals.length,
    )
  ) {
    return (
      <EmptyState
        title="No wealth insights yet"
        description="Add accounts, transactions, budgets, or goals to generate your personalized digest."
      />
    );
  }

  return (
    <div className="wealth-insights-page">
      <WeeklyDigest digest={digest} activePeriod={activePeriod} onPeriodChange={setActivePeriod} />
    </div>
  );
};

export default InsightsPage;
