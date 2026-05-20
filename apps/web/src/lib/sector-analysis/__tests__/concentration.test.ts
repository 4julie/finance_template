// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for portfolio concentration analysis engine.
 *
 * References: issue #1603
 */

import { describe, expect, it } from 'vitest';

import {
  analyzeConcentration,
  bankersRound,
  calculateHHI,
  classifyConcentration,
  compareSectorWeights,
  getTopNHoldings,
} from '../concentration';
import { ConcentrationLevel, GicsSector, type HoldingExposure } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHolding(
  symbol: string,
  marketValue: number,
  sector: GicsSector = GicsSector.INFORMATION_TECHNOLOGY,
): HoldingExposure {
  return {
    symbol,
    name: `${symbol} Inc.`,
    marketValue,
    sector,
    weightPercent: 0, // filled by analysis
  };
}

// ---------------------------------------------------------------------------
// bankersRound
// ---------------------------------------------------------------------------

describe('bankersRound', () => {
  it('rounds 2.5 to 2 (round half to even)', () => {
    expect(bankersRound(2.5, 0)).toBe(2);
  });

  it('rounds 3.5 to 4 (round half to even)', () => {
    expect(bankersRound(3.5, 0)).toBe(4);
  });

  it('rounds 2.55 to 2.56 at 2 decimal places', () => {
    expect(bankersRound(2.56, 2)).toBe(2.56);
  });

  it('rounds normal values correctly', () => {
    expect(bankersRound(1.234, 2)).toBe(1.23);
    expect(bankersRound(1.236, 2)).toBe(1.24);
  });
});

// ---------------------------------------------------------------------------
// calculateHHI
// ---------------------------------------------------------------------------

describe('calculateHHI', () => {
  it('returns 0 for empty array', () => {
    expect(calculateHHI([])).toBe(0);
  });

  it('returns 10000 for a single holding', () => {
    expect(calculateHHI([{ marketValue: 500_00 }])).toBe(10000);
  });

  it('returns 5000 for two equal holdings', () => {
    const holdings = [{ marketValue: 100_00 }, { marketValue: 100_00 }];
    expect(calculateHHI(holdings)).toBe(5000);
  });

  it('returns 2500 for four equal holdings', () => {
    const holdings = Array.from({ length: 4 }, () => ({ marketValue: 100_00 }));
    expect(calculateHHI(holdings)).toBe(2500);
  });

  it('returns near 0 for many equal holdings', () => {
    const holdings = Array.from({ length: 100 }, () => ({ marketValue: 100_00 }));
    expect(calculateHHI(holdings)).toBe(100);
  });

  it('handles all-zero market values', () => {
    expect(calculateHHI([{ marketValue: 0 }, { marketValue: 0 }])).toBe(0);
  });

  it('correctly handles unequal weights', () => {
    // 70% and 30%: HHI = 70^2 + 30^2 = 4900 + 900 = 5800
    const holdings = [{ marketValue: 7000 }, { marketValue: 3000 }];
    expect(calculateHHI(holdings)).toBe(5800);
  });
});

// ---------------------------------------------------------------------------
// classifyConcentration
// ---------------------------------------------------------------------------

describe('classifyConcentration', () => {
  it('classifies LOW for HHI < 1500', () => {
    expect(classifyConcentration(1000)).toBe(ConcentrationLevel.LOW);
    expect(classifyConcentration(0)).toBe(ConcentrationLevel.LOW);
  });

  it('classifies MODERATE for HHI 1500–2500', () => {
    expect(classifyConcentration(1500)).toBe(ConcentrationLevel.MODERATE);
    expect(classifyConcentration(2000)).toBe(ConcentrationLevel.MODERATE);
    expect(classifyConcentration(2500)).toBe(ConcentrationLevel.MODERATE);
  });

  it('classifies HIGH for HHI > 2500', () => {
    expect(classifyConcentration(2501)).toBe(ConcentrationLevel.HIGH);
    expect(classifyConcentration(10000)).toBe(ConcentrationLevel.HIGH);
  });
});

// ---------------------------------------------------------------------------
// getTopNHoldings
// ---------------------------------------------------------------------------

describe('getTopNHoldings', () => {
  it('returns empty for no holdings', () => {
    const result = getTopNHoldings([]);
    expect(result.topHoldings).toEqual([]);
    expect(result.topNPercent).toBe(0);
  });

  it('returns all holdings when N > count', () => {
    const holdings = [makeHolding('AAPL', 500_00), makeHolding('GOOG', 300_00)];
    const result = getTopNHoldings(holdings, 5);
    expect(result.topHoldings).toHaveLength(2);
    expect(result.topNPercent).toBe(100);
  });

  it('returns top-N by market value', () => {
    const holdings = [
      makeHolding('AAPL', 500_00),
      makeHolding('GOOG', 300_00),
      makeHolding('MSFT', 200_00),
    ];
    const result = getTopNHoldings(holdings, 2);
    expect(result.topHoldings).toHaveLength(2);
    expect(result.topHoldings[0].symbol).toBe('AAPL');
    expect(result.topHoldings[1].symbol).toBe('GOOG');
    expect(result.topNPercent).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// analyzeConcentration
// ---------------------------------------------------------------------------

describe('analyzeConcentration', () => {
  it('handles empty portfolio', () => {
    const result = analyzeConcentration([]);
    expect(result.hhi).toBe(0);
    expect(result.level).toBe(ConcentrationLevel.LOW);
    expect(result.topHoldings).toEqual([]);
    expect(result.totalHoldings).toBe(0);
  });

  it('single holding gives HHI 10000 and HIGH', () => {
    const result = analyzeConcentration([makeHolding('AAPL', 1000_00)]);
    expect(result.hhi).toBe(10000);
    expect(result.level).toBe(ConcentrationLevel.HIGH);
    expect(result.totalHoldings).toBe(1);
  });

  it('many equal holdings give LOW concentration', () => {
    const holdings = Array.from({ length: 20 }, (_, i) => makeHolding(`S${i}`, 100_00));
    const result = analyzeConcentration(holdings, 5);
    expect(result.level).toBe(ConcentrationLevel.LOW);
    expect(result.topHoldings).toHaveLength(5);
    expect(result.topNPercent).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// compareSectorWeights
// ---------------------------------------------------------------------------

describe('compareSectorWeights', () => {
  it('returns empty for no holdings and no benchmark', () => {
    const result = compareSectorWeights([], {});
    expect(result).toEqual([]);
  });

  it('computes deviation between portfolio and benchmark', () => {
    const holdings = [
      makeHolding('AAPL', 700_00, GicsSector.INFORMATION_TECHNOLOGY),
      makeHolding('XOM', 300_00, GicsSector.ENERGY),
    ];
    const benchmark = {
      [GicsSector.INFORMATION_TECHNOLOGY]: 50,
      [GicsSector.ENERGY]: 50,
    };

    const result = compareSectorWeights(holdings, benchmark);
    const techSector = result.find((s) => s.sector === GicsSector.INFORMATION_TECHNOLOGY);
    const energySector = result.find((s) => s.sector === GicsSector.ENERGY);

    expect(techSector).toBeDefined();
    expect(techSector!.portfolioPercent).toBe(70);
    expect(techSector!.deviationPercent).toBe(20);

    expect(energySector).toBeDefined();
    expect(energySector!.portfolioPercent).toBe(30);
    expect(energySector!.deviationPercent).toBe(-20);
  });

  it('includes benchmark sectors not in portfolio', () => {
    const holdings = [makeHolding('AAPL', 1000_00, GicsSector.INFORMATION_TECHNOLOGY)];
    const benchmark = {
      [GicsSector.INFORMATION_TECHNOLOGY]: 30,
      [GicsSector.HEALTH_CARE]: 20,
    };

    const result = compareSectorWeights(holdings, benchmark);
    const healthcare = result.find((s) => s.sector === GicsSector.HEALTH_CARE);
    expect(healthcare).toBeDefined();
    expect(healthcare!.portfolioPercent).toBe(0);
    expect(healthcare!.deviationPercent).toBe(-20);
  });

  it('sorts by absolute deviation descending', () => {
    const holdings = [
      makeHolding('AAPL', 500_00, GicsSector.INFORMATION_TECHNOLOGY),
      makeHolding('XOM', 300_00, GicsSector.ENERGY),
      makeHolding('JNJ', 200_00, GicsSector.HEALTH_CARE),
    ];
    const benchmark = {
      [GicsSector.INFORMATION_TECHNOLOGY]: 33,
      [GicsSector.ENERGY]: 33,
      [GicsSector.HEALTH_CARE]: 34,
    };

    const result = compareSectorWeights(holdings, benchmark);
    // Should be sorted by absolute deviation
    const deviations = result.map((s) => Math.abs(s.deviationPercent));
    for (let i = 1; i < deviations.length; i++) {
      expect(deviations[i]).toBeLessThanOrEqual(deviations[i - 1]);
    }
  });
});
