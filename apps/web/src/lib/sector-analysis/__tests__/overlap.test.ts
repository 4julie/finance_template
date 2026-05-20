// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for portfolio overlap detection engine.
 *
 * References: issue #1603
 */

import { describe, expect, it } from 'vitest';

import { analyzeOverlap } from '../overlap';
import type { PortfolioHolding } from '../types';

// ---------------------------------------------------------------------------
// analyzeOverlap
// ---------------------------------------------------------------------------

describe('analyzeOverlap', () => {
  it('returns zeroes for two empty portfolios', () => {
    const result = analyzeOverlap([], []);
    expect(result.overlapPercentA).toBe(0);
    expect(result.overlapPercentB).toBe(0);
    expect(result.overlapPercentAvg).toBe(0);
    expect(result.sharedSymbols).toEqual([]);
    expect(result.uniqueToA).toBe(0);
    expect(result.uniqueToB).toBe(0);
    expect(result.correlationEstimate).toBe(0);
  });

  it('returns 100% overlap for identical portfolios', () => {
    const portfolio: PortfolioHolding[] = [
      { symbol: 'AAPL', marketValue: 500_00 },
      { symbol: 'GOOG', marketValue: 300_00 },
      { symbol: 'MSFT', marketValue: 200_00 },
    ];

    const result = analyzeOverlap(portfolio, portfolio);
    expect(result.overlapPercentA).toBe(100);
    expect(result.overlapPercentB).toBe(100);
    expect(result.overlapPercentAvg).toBe(100);
    expect(result.sharedSymbols).toEqual(['AAPL', 'GOOG', 'MSFT']);
    expect(result.uniqueToA).toBe(0);
    expect(result.uniqueToB).toBe(0);
  });

  it('returns 0% overlap for completely different portfolios', () => {
    const portfolioA: PortfolioHolding[] = [
      { symbol: 'AAPL', marketValue: 500_00 },
      { symbol: 'GOOG', marketValue: 500_00 },
    ];
    const portfolioB: PortfolioHolding[] = [
      { symbol: 'MSFT', marketValue: 500_00 },
      { symbol: 'AMZN', marketValue: 500_00 },
    ];

    const result = analyzeOverlap(portfolioA, portfolioB);
    expect(result.overlapPercentA).toBe(0);
    expect(result.overlapPercentB).toBe(0);
    expect(result.overlapPercentAvg).toBe(0);
    expect(result.sharedSymbols).toEqual([]);
    expect(result.uniqueToA).toBe(2);
    expect(result.uniqueToB).toBe(2);
    expect(result.correlationEstimate).toBe(0);
  });

  it('calculates partial overlap correctly', () => {
    const portfolioA: PortfolioHolding[] = [
      { symbol: 'AAPL', marketValue: 600_00 },
      { symbol: 'GOOG', marketValue: 400_00 },
    ];
    const portfolioB: PortfolioHolding[] = [
      { symbol: 'AAPL', marketValue: 300_00 },
      { symbol: 'MSFT', marketValue: 700_00 },
    ];

    const result = analyzeOverlap(portfolioA, portfolioB);
    // A: AAPL is 600 out of 1000 = 60% overlap
    expect(result.overlapPercentA).toBe(60);
    // B: AAPL is 300 out of 1000 = 30% overlap
    expect(result.overlapPercentB).toBe(30);
    expect(result.overlapPercentAvg).toBe(45);
    expect(result.sharedSymbols).toEqual(['AAPL']);
    expect(result.uniqueToA).toBe(1);
    expect(result.uniqueToB).toBe(1);
  });

  it('estimates correlation near 1 for identical portfolios', () => {
    const portfolio: PortfolioHolding[] = [
      { symbol: 'AAPL', marketValue: 500_00 },
      { symbol: 'GOOG', marketValue: 500_00 },
    ];

    const result = analyzeOverlap(portfolio, portfolio);
    expect(result.correlationEstimate).toBe(1);
  });

  it('handles one empty portfolio', () => {
    const portfolioA: PortfolioHolding[] = [{ symbol: 'AAPL', marketValue: 500_00 }];

    const result = analyzeOverlap(portfolioA, []);
    expect(result.overlapPercentA).toBe(0);
    expect(result.overlapPercentB).toBe(0);
    expect(result.sharedSymbols).toEqual([]);
    expect(result.uniqueToA).toBe(1);
    expect(result.uniqueToB).toBe(0);
  });

  it('shared symbols are sorted alphabetically', () => {
    const portfolioA: PortfolioHolding[] = [
      { symbol: 'MSFT', marketValue: 100_00 },
      { symbol: 'AAPL', marketValue: 100_00 },
      { symbol: 'GOOG', marketValue: 100_00 },
    ];
    const portfolioB: PortfolioHolding[] = [
      { symbol: 'GOOG', marketValue: 100_00 },
      { symbol: 'AAPL', marketValue: 100_00 },
      { symbol: 'MSFT', marketValue: 100_00 },
    ];

    const result = analyzeOverlap(portfolioA, portfolioB);
    expect(result.sharedSymbols).toEqual(['AAPL', 'GOOG', 'MSFT']);
  });
});
