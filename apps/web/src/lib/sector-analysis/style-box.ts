// SPDX-License-Identifier: BUSL-1.1

/**
 * Morningstar-style 3×3 style box classification engine.
 *
 * Classifies holdings into a 3×3 grid of market-cap size (small/mid/large)
 * and investment style (value/blend/growth). Aggregates portfolio-level
 * style characteristics.
 *
 * All monetary values are integer cents.
 * Uses Banker's rounding (HALF_EVEN) for financial divisions.
 *
 * References: issue #1603
 */

import { bankersRound } from './concentration';
import {
  InvestmentStyle,
  MarketCapSize,
  type StyleBoxAggregate,
  type StyleBoxCell,
  type StyleBoxPosition,
} from './types';

// ---------------------------------------------------------------------------
// Classification thresholds
// ---------------------------------------------------------------------------

/** Market cap thresholds in cents. */
const SMALL_CAP_MAX = 200_000_000_00; // $2B in cents
const LARGE_CAP_MIN = 1_000_000_000_00; // $10B in cents

/** P/E ratio thresholds for style classification. */
const VALUE_PE_MAX = 15;
const GROWTH_PE_MIN = 25;

// ---------------------------------------------------------------------------
// Classification functions
// ---------------------------------------------------------------------------

/**
 * Classify market-cap size based on market capitalization.
 *
 * @param marketCap - Market capitalization in cents.
 * @returns The market-cap size classification.
 */
export function classifyMarketCap(marketCap: number): MarketCapSize {
  if (marketCap <= SMALL_CAP_MAX) return MarketCapSize.SMALL;
  if (marketCap >= LARGE_CAP_MIN) return MarketCapSize.LARGE;
  return MarketCapSize.MID;
}

/**
 * Classify investment style based on P/E ratio.
 *
 * @param peRatio - Price-to-earnings ratio. Null treated as BLEND.
 * @returns The investment style classification.
 */
export function classifyStyle(peRatio: number | null): InvestmentStyle {
  if (peRatio === null) return InvestmentStyle.BLEND;
  if (peRatio <= VALUE_PE_MAX) return InvestmentStyle.VALUE;
  if (peRatio >= GROWTH_PE_MIN) return InvestmentStyle.GROWTH;
  return InvestmentStyle.BLEND;
}

/**
 * Classify a single holding into a style box cell.
 *
 * @param marketCap - Market capitalization in cents.
 * @param peRatio - Price-to-earnings ratio. Null defaults to BLEND style.
 * @returns The style box cell for this holding.
 */
export function classifyHolding(marketCap: number, peRatio: number | null): StyleBoxCell {
  return {
    size: classifyMarketCap(marketCap),
    style: classifyStyle(peRatio),
  };
}

// ---------------------------------------------------------------------------
// Style box key helpers
// ---------------------------------------------------------------------------

/**
 * Generate a unique string key for a style box cell.
 *
 * @param cell - The style box cell.
 * @returns A string key like "LARGE_GROWTH".
 */
export function styleBoxKey(cell: StyleBoxCell): string {
  return `${cell.size}_${cell.style}`;
}

/**
 * Get all 9 cells of the 3×3 style box grid.
 *
 * @returns Array of all style box cells in row-major order
 *          (Large-Value through Small-Growth).
 */
export function getAllStyleBoxCells(): readonly StyleBoxCell[] {
  const sizes = [MarketCapSize.LARGE, MarketCapSize.MID, MarketCapSize.SMALL] as const;
  const styles = [InvestmentStyle.VALUE, InvestmentStyle.BLEND, InvestmentStyle.GROWTH] as const;

  const cells: StyleBoxCell[] = [];
  for (const size of sizes) {
    for (const style of styles) {
      cells.push({ size, style });
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Portfolio-level aggregate
// ---------------------------------------------------------------------------

/**
 * Aggregate style box positions into a portfolio-level style box summary.
 *
 * @param positions - Array of holdings with their style box positions and market values.
 * @returns Aggregate style box with weights per cell and dominant style.
 */
export function aggregateStyleBox(positions: readonly StyleBoxPosition[]): StyleBoxAggregate {
  if (positions.length === 0) {
    const defaultCell: StyleBoxCell = {
      size: MarketCapSize.LARGE,
      style: InvestmentStyle.BLEND,
    };
    return {
      weights: getAllStyleBoxCells().map((cell) => ({ cell, percent: 0 })),
      dominant: defaultCell,
      totalClassifiedValue: 0,
    };
  }

  const totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0);

  // Accumulate values by cell
  const cellValues = new Map<string, number>();
  const cellMap = new Map<string, StyleBoxCell>();

  for (const pos of positions) {
    const key = styleBoxKey(pos.cell);
    cellValues.set(key, (cellValues.get(key) ?? 0) + pos.marketValue);
    cellMap.set(key, pos.cell);
  }

  // Ensure all 9 cells are represented
  const allCells = getAllStyleBoxCells();
  for (const cell of allCells) {
    const key = styleBoxKey(cell);
    if (!cellValues.has(key)) {
      cellValues.set(key, 0);
      cellMap.set(key, cell);
    }
  }

  // Build weights array
  const weights = allCells.map((cell) => {
    const key = styleBoxKey(cell);
    const value = cellValues.get(key) ?? 0;
    const percent = totalValue > 0 ? bankersRound((value / totalValue) * 100, 2) : 0;
    return { cell, percent };
  });

  // Find dominant cell
  let maxPercent = -1;
  let dominant: StyleBoxCell = allCells[0];
  for (const w of weights) {
    if (w.percent > maxPercent) {
      maxPercent = w.percent;
      dominant = w.cell;
    }
  }

  return {
    weights,
    dominant,
    totalClassifiedValue: totalValue,
  };
}
