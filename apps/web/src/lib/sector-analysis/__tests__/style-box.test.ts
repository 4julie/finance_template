// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for Morningstar-style 3×3 style box classification.
 *
 * References: issue #1603
 */

import { describe, expect, it } from 'vitest';

import {
  aggregateStyleBox,
  classifyHolding,
  classifyMarketCap,
  classifyStyle,
  getAllStyleBoxCells,
  styleBoxKey,
} from '../style-box';
import { InvestmentStyle, MarketCapSize, type StyleBoxPosition } from '../types';

// ---------------------------------------------------------------------------
// classifyMarketCap
// ---------------------------------------------------------------------------

describe('classifyMarketCap', () => {
  it('classifies small cap (<= $2B)', () => {
    expect(classifyMarketCap(100_000_000_00)).toBe(MarketCapSize.SMALL); // $1B
    expect(classifyMarketCap(200_000_000_00)).toBe(MarketCapSize.SMALL); // $2B
  });

  it('classifies mid cap ($2B–$10B)', () => {
    expect(classifyMarketCap(500_000_000_00)).toBe(MarketCapSize.MID); // $5B
  });

  it('classifies large cap (>= $10B)', () => {
    expect(classifyMarketCap(1_000_000_000_00)).toBe(MarketCapSize.LARGE); // $10B
    expect(classifyMarketCap(2_000_000_000_00)).toBe(MarketCapSize.LARGE); // $20B
  });
});

// ---------------------------------------------------------------------------
// classifyStyle
// ---------------------------------------------------------------------------

describe('classifyStyle', () => {
  it('classifies value (P/E <= 15)', () => {
    expect(classifyStyle(10)).toBe(InvestmentStyle.VALUE);
    expect(classifyStyle(15)).toBe(InvestmentStyle.VALUE);
  });

  it('classifies blend (P/E 16–24)', () => {
    expect(classifyStyle(20)).toBe(InvestmentStyle.BLEND);
  });

  it('classifies growth (P/E >= 25)', () => {
    expect(classifyStyle(25)).toBe(InvestmentStyle.GROWTH);
    expect(classifyStyle(50)).toBe(InvestmentStyle.GROWTH);
  });

  it('classifies null P/E as blend', () => {
    expect(classifyStyle(null)).toBe(InvestmentStyle.BLEND);
  });
});

// ---------------------------------------------------------------------------
// classifyHolding
// ---------------------------------------------------------------------------

describe('classifyHolding', () => {
  it('classifies large-cap value', () => {
    const cell = classifyHolding(2_000_000_000_00, 12);
    expect(cell.size).toBe(MarketCapSize.LARGE);
    expect(cell.style).toBe(InvestmentStyle.VALUE);
  });

  it('classifies small-cap growth', () => {
    const cell = classifyHolding(100_000_000_00, 30);
    expect(cell.size).toBe(MarketCapSize.SMALL);
    expect(cell.style).toBe(InvestmentStyle.GROWTH);
  });

  it('classifies mid-cap blend with null P/E', () => {
    const cell = classifyHolding(500_000_000_00, null);
    expect(cell.size).toBe(MarketCapSize.MID);
    expect(cell.style).toBe(InvestmentStyle.BLEND);
  });
});

// ---------------------------------------------------------------------------
// getAllStyleBoxCells & styleBoxKey
// ---------------------------------------------------------------------------

describe('getAllStyleBoxCells', () => {
  it('returns exactly 9 cells', () => {
    expect(getAllStyleBoxCells()).toHaveLength(9);
  });

  it('all cells have unique keys', () => {
    const cells = getAllStyleBoxCells();
    const keys = cells.map(styleBoxKey);
    expect(new Set(keys).size).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// aggregateStyleBox
// ---------------------------------------------------------------------------

describe('aggregateStyleBox', () => {
  it('returns zero weights for empty positions', () => {
    const result = aggregateStyleBox([]);
    expect(result.totalClassifiedValue).toBe(0);
    expect(result.weights.every((w) => w.percent === 0)).toBe(true);
  });

  it('single position gets 100% weight in its cell', () => {
    const positions: StyleBoxPosition[] = [
      {
        symbol: 'AAPL',
        cell: { size: MarketCapSize.LARGE, style: InvestmentStyle.GROWTH },
        marketValue: 1000_00,
      },
    ];

    const result = aggregateStyleBox(positions);
    expect(result.totalClassifiedValue).toBe(1000_00);
    expect(result.dominant.size).toBe(MarketCapSize.LARGE);
    expect(result.dominant.style).toBe(InvestmentStyle.GROWTH);

    const largeGrowth = result.weights.find(
      (w) => w.cell.size === MarketCapSize.LARGE && w.cell.style === InvestmentStyle.GROWTH,
    );
    expect(largeGrowth?.percent).toBe(100);
  });

  it('distributes weights correctly across cells', () => {
    const positions: StyleBoxPosition[] = [
      {
        symbol: 'AAPL',
        cell: { size: MarketCapSize.LARGE, style: InvestmentStyle.GROWTH },
        marketValue: 700_00,
      },
      {
        symbol: 'XOM',
        cell: { size: MarketCapSize.LARGE, style: InvestmentStyle.VALUE },
        marketValue: 300_00,
      },
    ];

    const result = aggregateStyleBox(positions);
    expect(result.dominant.size).toBe(MarketCapSize.LARGE);
    expect(result.dominant.style).toBe(InvestmentStyle.GROWTH);

    const largeGrowth = result.weights.find(
      (w) => w.cell.size === MarketCapSize.LARGE && w.cell.style === InvestmentStyle.GROWTH,
    );
    const largeValue = result.weights.find(
      (w) => w.cell.size === MarketCapSize.LARGE && w.cell.style === InvestmentStyle.VALUE,
    );
    expect(largeGrowth?.percent).toBe(70);
    expect(largeValue?.percent).toBe(30);
  });

  it('always returns 9 cells in the weights array', () => {
    const positions: StyleBoxPosition[] = [
      {
        symbol: 'AAPL',
        cell: { size: MarketCapSize.LARGE, style: InvestmentStyle.BLEND },
        marketValue: 500_00,
      },
    ];

    const result = aggregateStyleBox(positions);
    expect(result.weights).toHaveLength(9);
  });
});
