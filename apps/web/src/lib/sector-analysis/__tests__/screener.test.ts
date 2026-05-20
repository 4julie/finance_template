// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for the investment screener filter evaluation engine.
 *
 * References: issue #1740
 */

import { describe, expect, it } from 'vitest';

import {
  evaluateNumericFilter,
  matchesFilters,
  rankAssets,
  screenAssets,
  sortAssets,
} from '../screener';
import {
  FilterOperator,
  GicsSector,
  InvestmentStyle,
  MarketCapSize,
  type ScreenableAsset,
  SortDirection,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAsset(overrides: Partial<ScreenableAsset> = {}): ScreenableAsset {
  return {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    peRatio: 28,
    marketCap: 3_000_000_000_00, // $30B
    dividendYield: 0.5,
    sector: GicsSector.INFORMATION_TECHNOLOGY,
    styleBox: { size: MarketCapSize.LARGE, style: InvestmentStyle.GROWTH },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// evaluateNumericFilter
// ---------------------------------------------------------------------------

describe('evaluateNumericFilter', () => {
  it('returns false for null values', () => {
    expect(
      evaluateNumericFilter(null, { field: 'pe', operator: FilterOperator.GT, value: 10 }),
    ).toBe(false);
  });

  it('EQ matches exact value', () => {
    expect(evaluateNumericFilter(10, { field: 'pe', operator: FilterOperator.EQ, value: 10 })).toBe(
      true,
    );
    expect(evaluateNumericFilter(11, { field: 'pe', operator: FilterOperator.EQ, value: 10 })).toBe(
      false,
    );
  });

  it('NEQ does not match exact value', () => {
    expect(
      evaluateNumericFilter(11, { field: 'pe', operator: FilterOperator.NEQ, value: 10 }),
    ).toBe(true);
    expect(
      evaluateNumericFilter(10, { field: 'pe', operator: FilterOperator.NEQ, value: 10 }),
    ).toBe(false);
  });

  it('GT / GTE / LT / LTE comparisons', () => {
    expect(evaluateNumericFilter(11, { field: 'pe', operator: FilterOperator.GT, value: 10 })).toBe(
      true,
    );
    expect(evaluateNumericFilter(10, { field: 'pe', operator: FilterOperator.GT, value: 10 })).toBe(
      false,
    );

    expect(
      evaluateNumericFilter(10, { field: 'pe', operator: FilterOperator.GTE, value: 10 }),
    ).toBe(true);
    expect(evaluateNumericFilter(9, { field: 'pe', operator: FilterOperator.GTE, value: 10 })).toBe(
      false,
    );

    expect(evaluateNumericFilter(9, { field: 'pe', operator: FilterOperator.LT, value: 10 })).toBe(
      true,
    );
    expect(evaluateNumericFilter(10, { field: 'pe', operator: FilterOperator.LT, value: 10 })).toBe(
      false,
    );

    expect(
      evaluateNumericFilter(10, { field: 'pe', operator: FilterOperator.LTE, value: 10 }),
    ).toBe(true);
    expect(
      evaluateNumericFilter(11, { field: 'pe', operator: FilterOperator.LTE, value: 10 }),
    ).toBe(false);
  });

  it('BETWEEN is inclusive', () => {
    const filter = {
      field: 'pe',
      operator: FilterOperator.BETWEEN as const,
      value: 10,
      valueTo: 20,
    };
    expect(evaluateNumericFilter(10, filter)).toBe(true);
    expect(evaluateNumericFilter(15, filter)).toBe(true);
    expect(evaluateNumericFilter(20, filter)).toBe(true);
    expect(evaluateNumericFilter(9, filter)).toBe(false);
    expect(evaluateNumericFilter(21, filter)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// matchesFilters
// ---------------------------------------------------------------------------

describe('matchesFilters', () => {
  it('matches everything with empty filters', () => {
    expect(matchesFilters(makeAsset(), {})).toBe(true);
  });

  it('applies P/E filter', () => {
    const asset = makeAsset({ peRatio: 15 });
    expect(
      matchesFilters(asset, {
        peRatio: { field: 'peRatio', operator: FilterOperator.LTE, value: 20 },
      }),
    ).toBe(true);
    expect(
      matchesFilters(asset, {
        peRatio: { field: 'peRatio', operator: FilterOperator.LTE, value: 10 },
      }),
    ).toBe(false);
  });

  it('applies sector filter', () => {
    const asset = makeAsset({ sector: GicsSector.ENERGY });
    expect(matchesFilters(asset, { sectors: [GicsSector.ENERGY, GicsSector.UTILITIES] })).toBe(
      true,
    );
    expect(matchesFilters(asset, { sectors: [GicsSector.FINANCIALS] })).toBe(false);
  });

  it('applies style box filter', () => {
    const asset = makeAsset({
      styleBox: { size: MarketCapSize.LARGE, style: InvestmentStyle.VALUE },
    });
    expect(
      matchesFilters(asset, {
        styles: [{ size: MarketCapSize.LARGE, style: InvestmentStyle.VALUE }],
      }),
    ).toBe(true);
    expect(
      matchesFilters(asset, {
        styles: [{ size: MarketCapSize.SMALL, style: InvestmentStyle.GROWTH }],
      }),
    ).toBe(false);
  });

  it('applies multiple filters with AND logic', () => {
    const asset = makeAsset({
      peRatio: 12,
      sector: GicsSector.ENERGY,
      dividendYield: 3.5,
    });

    // All filters match
    expect(
      matchesFilters(asset, {
        peRatio: { field: 'peRatio', operator: FilterOperator.LTE, value: 20 },
        sectors: [GicsSector.ENERGY],
        dividendYield: { field: 'dividendYield', operator: FilterOperator.GTE, value: 2 },
      }),
    ).toBe(true);

    // One filter fails
    expect(
      matchesFilters(asset, {
        peRatio: { field: 'peRatio', operator: FilterOperator.LTE, value: 20 },
        sectors: [GicsSector.FINANCIALS], // fails
        dividendYield: { field: 'dividendYield', operator: FilterOperator.GTE, value: 2 },
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sortAssets & screenAssets
// ---------------------------------------------------------------------------

describe('sortAssets', () => {
  const assets = [
    makeAsset({ symbol: 'GOOG', peRatio: 25 }),
    makeAsset({ symbol: 'AAPL', peRatio: 28 }),
    makeAsset({ symbol: 'MSFT', peRatio: 30 }),
  ];

  it('sorts by peRatio ascending', () => {
    const sorted = sortAssets(assets, { field: 'peRatio', direction: SortDirection.ASC });
    expect(sorted[0].symbol).toBe('GOOG');
    expect(sorted[2].symbol).toBe('MSFT');
  });

  it('sorts by peRatio descending', () => {
    const sorted = sortAssets(assets, { field: 'peRatio', direction: SortDirection.DESC });
    expect(sorted[0].symbol).toBe('MSFT');
    expect(sorted[2].symbol).toBe('GOOG');
  });

  it('sorts by symbol alphabetically', () => {
    const sorted = sortAssets(assets, { field: 'symbol', direction: SortDirection.ASC });
    expect(sorted[0].symbol).toBe('AAPL');
    expect(sorted[2].symbol).toBe('MSFT');
  });

  it('pushes null values to end', () => {
    const withNull = [
      makeAsset({ symbol: 'A', peRatio: null }),
      makeAsset({ symbol: 'B', peRatio: 10 }),
    ];
    const sorted = sortAssets(withNull, { field: 'peRatio', direction: SortDirection.ASC });
    expect(sorted[0].symbol).toBe('B');
    expect(sorted[1].symbol).toBe('A');
  });
});

describe('screenAssets', () => {
  it('filters and sorts combined', () => {
    const assets = [
      makeAsset({ symbol: 'A', peRatio: 10, sector: GicsSector.ENERGY }),
      makeAsset({ symbol: 'B', peRatio: 20, sector: GicsSector.ENERGY }),
      makeAsset({ symbol: 'C', peRatio: 30, sector: GicsSector.FINANCIALS }),
    ];

    const result = screenAssets(
      assets,
      { sectors: [GicsSector.ENERGY] },
      { field: 'peRatio', direction: SortDirection.DESC },
    );

    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBe('B');
    expect(result[1].symbol).toBe('A');
  });
});

// ---------------------------------------------------------------------------
// rankAssets
// ---------------------------------------------------------------------------

describe('rankAssets', () => {
  it('assigns 1-based ranks', () => {
    const assets = [
      makeAsset({ symbol: 'A', marketCap: 100_00 }),
      makeAsset({ symbol: 'B', marketCap: 300_00 }),
      makeAsset({ symbol: 'C', marketCap: 200_00 }),
    ];

    const ranked = rankAssets(assets, 'marketCap', SortDirection.DESC);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].asset.symbol).toBe('B');
    expect(ranked[1].rank).toBe(2);
    expect(ranked[1].asset.symbol).toBe('C');
    expect(ranked[2].rank).toBe(3);
    expect(ranked[2].asset.symbol).toBe('A');
  });
});
