// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import {
  formatCurrencyForScreenReader,
  formatPercentForScreenReader,
  getBudgetStatusIndicator,
  getGoalStatusIndicator,
  getStatusIndicator,
} from './a11y';

describe('formatCurrencyForScreenReader', () => {
  it('formats a positive amount', () => {
    expect(formatCurrencyForScreenReader(12345)).toBe('$123.45');
  });

  it('prepends "negative" for negative amounts', () => {
    expect(formatCurrencyForScreenReader(-4250)).toBe('negative $42.50');
  });

  it('appends context when provided', () => {
    expect(formatCurrencyForScreenReader(-4250, 'USD', 'Dining category')).toBe(
      'negative $42.50, Dining category',
    );
  });

  it('handles zero', () => {
    expect(formatCurrencyForScreenReader(0)).toBe('$0.00');
  });

  it('respects different currencies', () => {
    const result = formatCurrencyForScreenReader(10000, 'EUR', 'Savings goal');
    expect(result).toContain('100.00');
    expect(result).toContain('Savings goal');
  });
});

describe('formatPercentForScreenReader', () => {
  it('formats percentage with context', () => {
    expect(formatPercentForScreenReader(75, 'of monthly budget used')).toBe(
      '75 percent of monthly budget used',
    );
  });
});

describe('getStatusIndicator', () => {
  it('returns positive for positive amount', () => {
    const result = getStatusIndicator(500);
    expect(result.tone).toBe('positive');
    expect(result.icon).toBe('↑');
  });

  it('returns negative for negative amount', () => {
    const result = getStatusIndicator(-200);
    expect(result.tone).toBe('negative');
    expect(result.icon).toBe('↓');
  });

  it('returns neutral for zero', () => {
    const result = getStatusIndicator(0);
    expect(result.tone).toBe('neutral');
    expect(result.icon).toBe('→');
  });
});

describe('getGoalStatusIndicator', () => {
  it('returns completed for 100%+', () => {
    expect(getGoalStatusIndicator(100).label).toBe('Goal reached');
    expect(getGoalStatusIndicator(120).label).toBe('Goal reached');
  });

  it('returns in progress for 50-99%', () => {
    expect(getGoalStatusIndicator(60).label).toBe('In progress');
  });

  it('returns getting started for 25-49%', () => {
    expect(getGoalStatusIndicator(30).label).toBe('Getting started');
  });

  it('returns just started for <25%', () => {
    expect(getGoalStatusIndicator(10).label).toBe('Just started');
  });
});

describe('getBudgetStatusIndicator', () => {
  it('returns over limit for >90%', () => {
    expect(getBudgetStatusIndicator(95).tone).toBe('negative');
  });

  it('returns near limit for 76-90%', () => {
    expect(getBudgetStatusIndicator(80).tone).toBe('warning');
  });

  it('returns on track for ≤75%', () => {
    expect(getBudgetStatusIndicator(50).tone).toBe('positive');
  });
});
