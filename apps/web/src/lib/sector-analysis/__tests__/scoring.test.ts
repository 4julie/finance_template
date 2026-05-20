// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for analyst consensus scoring engine.
 *
 * References: issue #1740
 */

import { describe, expect, it } from 'vitest';

import {
  analyzeConsensus,
  computeAverageTargetPrice,
  computeTargetUpside,
  computeWeightedScore,
  countRatings,
  deriveRating,
} from '../scoring';
import { AnalystRating, type AnalystOpinion } from '../types';

// ---------------------------------------------------------------------------
// deriveRating
// ---------------------------------------------------------------------------

describe('deriveRating', () => {
  it('maps 4.5–5.0 to STRONG_BUY', () => {
    expect(deriveRating(4.5)).toBe(AnalystRating.STRONG_BUY);
    expect(deriveRating(5.0)).toBe(AnalystRating.STRONG_BUY);
  });

  it('maps 3.5–4.49 to BUY', () => {
    expect(deriveRating(3.5)).toBe(AnalystRating.BUY);
    expect(deriveRating(4.0)).toBe(AnalystRating.BUY);
    expect(deriveRating(4.49)).toBe(AnalystRating.BUY);
  });

  it('maps 2.5–3.49 to HOLD', () => {
    expect(deriveRating(2.5)).toBe(AnalystRating.HOLD);
    expect(deriveRating(3.0)).toBe(AnalystRating.HOLD);
    expect(deriveRating(3.49)).toBe(AnalystRating.HOLD);
  });

  it('maps 1.5–2.49 to SELL', () => {
    expect(deriveRating(1.5)).toBe(AnalystRating.SELL);
    expect(deriveRating(2.0)).toBe(AnalystRating.SELL);
  });

  it('maps < 1.5 to STRONG_SELL', () => {
    expect(deriveRating(1.0)).toBe(AnalystRating.STRONG_SELL);
    expect(deriveRating(1.49)).toBe(AnalystRating.STRONG_SELL);
  });
});

// ---------------------------------------------------------------------------
// computeWeightedScore
// ---------------------------------------------------------------------------

describe('computeWeightedScore', () => {
  it('returns 0 for empty opinions', () => {
    expect(computeWeightedScore([])).toBe(0);
  });

  it('returns 5 for all STRONG_BUY', () => {
    const opinions: AnalystOpinion[] = [
      { analyst: 'A', rating: AnalystRating.STRONG_BUY, targetPrice: null, date: '2024-01-01' },
      { analyst: 'B', rating: AnalystRating.STRONG_BUY, targetPrice: null, date: '2024-01-02' },
    ];
    expect(computeWeightedScore(opinions)).toBe(5);
  });

  it('returns 1 for all STRONG_SELL', () => {
    const opinions: AnalystOpinion[] = [
      { analyst: 'A', rating: AnalystRating.STRONG_SELL, targetPrice: null, date: '2024-01-01' },
    ];
    expect(computeWeightedScore(opinions)).toBe(1);
  });

  it('computes correct average for mixed ratings', () => {
    const opinions: AnalystOpinion[] = [
      { analyst: 'A', rating: AnalystRating.BUY, targetPrice: null, date: '2024-01-01' }, // 4
      { analyst: 'B', rating: AnalystRating.HOLD, targetPrice: null, date: '2024-01-01' }, // 3
      { analyst: 'C', rating: AnalystRating.SELL, targetPrice: null, date: '2024-01-01' }, // 2
    ];
    // Average: (4 + 3 + 2) / 3 = 3
    expect(computeWeightedScore(opinions)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// countRatings
// ---------------------------------------------------------------------------

describe('countRatings', () => {
  it('counts all zeroes for empty opinions', () => {
    const counts = countRatings([]);
    expect(counts[AnalystRating.STRONG_BUY]).toBe(0);
    expect(counts[AnalystRating.BUY]).toBe(0);
    expect(counts[AnalystRating.HOLD]).toBe(0);
    expect(counts[AnalystRating.SELL]).toBe(0);
    expect(counts[AnalystRating.STRONG_SELL]).toBe(0);
  });

  it('counts ratings correctly', () => {
    const opinions: AnalystOpinion[] = [
      { analyst: 'A', rating: AnalystRating.BUY, targetPrice: null, date: '2024-01-01' },
      { analyst: 'B', rating: AnalystRating.BUY, targetPrice: null, date: '2024-01-01' },
      { analyst: 'C', rating: AnalystRating.HOLD, targetPrice: null, date: '2024-01-01' },
    ];

    const counts = countRatings(opinions);
    expect(counts[AnalystRating.BUY]).toBe(2);
    expect(counts[AnalystRating.HOLD]).toBe(1);
    expect(counts[AnalystRating.SELL]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeAverageTargetPrice
// ---------------------------------------------------------------------------

describe('computeAverageTargetPrice', () => {
  it('returns null for no opinions', () => {
    expect(computeAverageTargetPrice([])).toBeNull();
  });

  it('returns null when no targets are provided', () => {
    const opinions: AnalystOpinion[] = [
      { analyst: 'A', rating: AnalystRating.BUY, targetPrice: null, date: '2024-01-01' },
    ];
    expect(computeAverageTargetPrice(opinions)).toBeNull();
  });

  it('computes average of available targets (skips nulls)', () => {
    const opinions: AnalystOpinion[] = [
      { analyst: 'A', rating: AnalystRating.BUY, targetPrice: 200_00, date: '2024-01-01' },
      { analyst: 'B', rating: AnalystRating.HOLD, targetPrice: null, date: '2024-01-01' },
      { analyst: 'C', rating: AnalystRating.BUY, targetPrice: 300_00, date: '2024-01-01' },
    ];
    // (20000 + 30000) / 2 = 25000
    expect(computeAverageTargetPrice(opinions)).toBe(250_00);
  });
});

// ---------------------------------------------------------------------------
// computeTargetUpside
// ---------------------------------------------------------------------------

describe('computeTargetUpside', () => {
  it('returns null when current price is 0', () => {
    expect(computeTargetUpside(200_00, 0)).toBeNull();
  });

  it('calculates positive upside', () => {
    // Target 200, current 100 → 100% upside
    expect(computeTargetUpside(200_00, 100_00)).toBe(100);
  });

  it('calculates negative downside', () => {
    // Target 50, current 100 → -50% downside
    expect(computeTargetUpside(50_00, 100_00)).toBe(-50);
  });

  it('returns 0 when target equals current', () => {
    expect(computeTargetUpside(100_00, 100_00)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// analyzeConsensus
// ---------------------------------------------------------------------------

describe('analyzeConsensus', () => {
  it('handles empty opinions', () => {
    const result = analyzeConsensus('AAPL', [], 150_00);
    expect(result.totalAnalysts).toBe(0);
    expect(result.weightedScore).toBe(0);
    expect(result.consensusRating).toBe(AnalystRating.HOLD);
    expect(result.averageTargetPrice).toBeNull();
    expect(result.targetUpsidePercent).toBeNull();
  });

  it('computes full consensus correctly', () => {
    const opinions: AnalystOpinion[] = [
      { analyst: 'A', rating: AnalystRating.STRONG_BUY, targetPrice: 200_00, date: '2024-01-01' },
      { analyst: 'B', rating: AnalystRating.BUY, targetPrice: 180_00, date: '2024-01-02' },
      { analyst: 'C', rating: AnalystRating.BUY, targetPrice: 190_00, date: '2024-01-03' },
    ];

    const result = analyzeConsensus('AAPL', opinions, 150_00);

    expect(result.symbol).toBe('AAPL');
    expect(result.totalAnalysts).toBe(3);
    // (5 + 4 + 4) / 3 ≈ 4.33
    expect(result.weightedScore).toBeCloseTo(4.33, 1);
    expect(result.consensusRating).toBe(AnalystRating.BUY);
    // (20000 + 18000 + 19000) / 3 = 19000
    expect(result.averageTargetPrice).toBe(190_00);
    expect(result.currentPrice).toBe(150_00);
    // (19000 - 15000) / 15000 * 100 ≈ 26.67
    expect(result.targetUpsidePercent).toBeCloseTo(26.67, 1);
  });

  it('handles all-sell consensus', () => {
    const opinions: AnalystOpinion[] = [
      { analyst: 'A', rating: AnalystRating.SELL, targetPrice: 80_00, date: '2024-01-01' },
      { analyst: 'B', rating: AnalystRating.STRONG_SELL, targetPrice: 60_00, date: '2024-01-02' },
    ];

    const result = analyzeConsensus('XYZ', opinions, 100_00);
    expect(result.weightedScore).toBe(1.5);
    expect(result.consensusRating).toBe(AnalystRating.SELL);
    expect(result.averageTargetPrice).toBe(70_00);
    expect(result.targetUpsidePercent).toBe(-30);
  });
});
