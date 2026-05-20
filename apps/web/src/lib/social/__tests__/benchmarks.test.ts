// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';
import {
  bankersRound,
  buildBenchmarkData,
  compareCategorySpending,
  computeMean,
  computeMedian,
  computePercentile,
  computeSpendingEfficiencyScore,
} from '../benchmarks';
import type { BenchmarkComparison, BenchmarkData, PeerGroup } from '../types';

const testPeerGroup: PeerGroup = {
  ageRange: { min: 25, max: 34 },
  incomeBracket: { minCents: 5_000_000, maxCents: 7_500_000 },
  location: 'US-national',
  householdSize: 2,
};

describe('bankersRound', () => {
  it('rounds 2.5 to 2 (even)', () => {
    expect(bankersRound(2.5)).toBe(2);
  });

  it('rounds 3.5 to 4 (even)', () => {
    expect(bankersRound(3.5)).toBe(4);
  });

  it('rounds 2.4 down', () => {
    expect(bankersRound(2.4)).toBe(2);
  });

  it('rounds 2.6 up', () => {
    expect(bankersRound(2.6)).toBe(3);
  });

  it('handles negative values', () => {
    expect(bankersRound(-1.5)).toBe(-2);
  });

  it('handles zero', () => {
    expect(bankersRound(0)).toBe(0);
  });
});

describe('computePercentile', () => {
  const distribution = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];

  it('returns 0 for value below all in distribution', () => {
    const result = computePercentile(500, distribution);
    expect(result.percentile).toBe(0);
  });

  it('returns 100 for value above all in distribution', () => {
    const result = computePercentile(15000, distribution);
    expect(result.percentile).toBe(100);
  });

  it('returns correct percentile for median value', () => {
    const result = computePercentile(5500, distribution);
    expect(result.percentile).toBe(50);
  });

  it('returns 0 for empty distribution', () => {
    const result = computePercentile(1000, []);
    expect(result.percentile).toBe(0);
  });

  it('preserves the input value in result', () => {
    const result = computePercentile(4200, distribution);
    expect(result.valueCents).toBe(4200);
  });
});

describe('compareCategorySpending', () => {
  const benchmark: BenchmarkData = {
    category: 'food',
    peerGroup: testPeerGroup,
    distributionCents: [10000, 20000, 30000, 40000, 50000],
    medianCents: 30000,
    meanCents: 30000,
  };

  it('computes comparison for user spending above median', () => {
    const result = compareCategorySpending(45000, benchmark);
    expect(result.category).toBe('food');
    expect(result.userSpendCents).toBe(45000);
    expect(result.peerMedianCents).toBe(30000);
    expect(result.differenceFromMedianCents).toBe(15000);
    expect(result.percentile).toBeGreaterThan(50);
  });

  it('computes comparison for user spending below median', () => {
    const result = compareCategorySpending(15000, benchmark);
    expect(result.differenceFromMedianCents).toBe(-15000);
    expect(result.percentile).toBeLessThan(50);
  });
});

describe('computeSpendingEfficiencyScore', () => {
  it('returns 50 for empty comparisons', () => {
    expect(computeSpendingEfficiencyScore([])).toBe(50);
  });

  it('returns weighted average of percentiles', () => {
    const comparisons: BenchmarkComparison[] = [
      {
        category: 'food',
        userSpendCents: 30000,
        peerMedianCents: 30000,
        peerMeanCents: 30000,
        percentile: 50,
        differenceFromMedianCents: 0,
      },
      {
        category: 'housing',
        userSpendCents: 70000,
        peerMedianCents: 50000,
        peerMeanCents: 55000,
        percentile: 80,
        differenceFromMedianCents: 20000,
      },
    ];

    const score = computeSpendingEfficiencyScore(comparisons);
    // Weighted: (50*30000 + 80*70000) / 100000 = (1500000+5600000)/100000 = 71
    expect(score).toBe(71);
  });

  it('returns 50 when total spend is zero', () => {
    const comparisons: BenchmarkComparison[] = [
      {
        category: 'food',
        userSpendCents: 0,
        peerMedianCents: 30000,
        peerMeanCents: 30000,
        percentile: 0,
        differenceFromMedianCents: -30000,
      },
    ];
    expect(computeSpendingEfficiencyScore(comparisons)).toBe(50);
  });
});

describe('computeMedian', () => {
  it('returns 0 for empty array', () => {
    expect(computeMedian([])).toBe(0);
  });

  it('returns middle value for odd-length array', () => {
    expect(computeMedian([1, 2, 3, 4, 5])).toBe(3);
  });

  it('returns average of middle two for even-length array', () => {
    expect(computeMedian([1, 2, 3, 4])).toBe(2); // (2+3)/2 = 2.5 -> bankers round = 2
  });
});

describe('computeMean', () => {
  it('returns 0 for empty array', () => {
    expect(computeMean([])).toBe(0);
  });

  it('returns correct mean', () => {
    expect(computeMean([10, 20, 30])).toBe(20);
  });
});

describe('buildBenchmarkData', () => {
  it('sorts distribution and computes median/mean', () => {
    const result = buildBenchmarkData('food', testPeerGroup, [50000, 10000, 30000, 20000, 40000]);

    expect(result.category).toBe('food');
    expect(result.distributionCents).toEqual([10000, 20000, 30000, 40000, 50000]);
    expect(result.medianCents).toBe(30000);
    expect(result.meanCents).toBe(30000);
  });

  it('handles empty input', () => {
    const result = buildBenchmarkData('housing', testPeerGroup, []);
    expect(result.distributionCents).toEqual([]);
    expect(result.medianCents).toBe(0);
    expect(result.meanCents).toBe(0);
  });
});
