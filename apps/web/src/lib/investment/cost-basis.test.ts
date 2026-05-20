// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for the cost-basis calculation engine.
 *
 * Covers lot-level gain/loss, FIFO/LIFO/specific ID/average cost
 * selection, average cost basis computation, and wash sale detection.
 *
 * References: issue #1588
 */

import { describe, expect, it } from 'vitest';
import type { Lot } from '../../types/investment';
import {
  computeAllLotGainLoss,
  computeAverageCostBasis,
  computeLotGainLoss,
  detectWashSales,
  selectLotsForSale,
} from './cost-basis';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeLot(overrides: Partial<Lot> & { id: string; shares: number }): Lot {
  const costPerShare = overrides.costPerShare ?? { amount: 10000 };
  return {
    investmentId: 'inv-1',
    purchaseDate: '2024-01-15',
    totalCost: { amount: Math.round(overrides.shares * costPerShare.amount) },
    costPerShare,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

const lot1 = makeLot({
  id: 'lot-1',
  shares: 10,
  purchaseDate: '2023-01-15',
  costPerShare: { amount: 10000 },
});

const lot2 = makeLot({
  id: 'lot-2',
  shares: 5,
  purchaseDate: '2023-06-15',
  costPerShare: { amount: 12000 },
});

const lot3 = makeLot({
  id: 'lot-3',
  shares: 8,
  purchaseDate: '2024-03-01',
  costPerShare: { amount: 11000 },
});

// ---------------------------------------------------------------------------
// computeLotGainLoss
// ---------------------------------------------------------------------------

describe('computeLotGainLoss', () => {
  it('computes unrealized gain correctly', () => {
    const result = computeLotGainLoss(lot1, 15000, '2025-01-20');

    expect(result.marketValue).toBe(150000); // 10 shares × $150
    expect(result.unrealizedGainLoss).toBe(50000); // 150000 - 100000
    expect(result.unrealizedGainLossPercent).toBe(50);
    expect(result.isLongTerm).toBe(true);
    expect(result.daysHeld).toBeGreaterThan(365);
  });

  it('computes unrealized loss correctly', () => {
    const result = computeLotGainLoss(lot2, 10000, '2025-01-20');

    expect(result.marketValue).toBe(50000); // 5 shares × $100
    expect(result.unrealizedGainLoss).toBe(-10000); // 50000 - 60000
    expect(result.unrealizedGainLossPercent).toBeCloseTo(-16.67, 1);
  });

  it('handles zero cost basis', () => {
    const freeLot = makeLot({
      id: 'free',
      shares: 10,
      costPerShare: { amount: 0 },
    });

    const result = computeLotGainLoss(freeLot, 5000, '2025-01-20');
    expect(result.unrealizedGainLossPercent).toBe(0);
  });

  it('identifies short-term lots correctly', () => {
    const result = computeLotGainLoss(lot3, 15000, '2024-06-01');

    expect(result.isLongTerm).toBe(false);
    expect(result.daysHeld).toBeLessThanOrEqual(365);
  });

  it('returns lot reference in result', () => {
    const result = computeLotGainLoss(lot1, 15000, '2025-01-20');
    expect(result.lot).toBe(lot1);
  });
});

// ---------------------------------------------------------------------------
// computeAllLotGainLoss
// ---------------------------------------------------------------------------

describe('computeAllLotGainLoss', () => {
  it('computes gain/loss for all lots', () => {
    const results = computeAllLotGainLoss([lot1, lot2, lot3], 13000, '2025-01-20');

    expect(results).toHaveLength(3);
    expect(results[0].lot.id).toBe('lot-1');
    expect(results[1].lot.id).toBe('lot-2');
    expect(results[2].lot.id).toBe('lot-3');
  });

  it('returns empty array for no lots', () => {
    const results = computeAllLotGainLoss([], 13000);
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// selectLotsForSale — FIFO
// ---------------------------------------------------------------------------

describe('selectLotsForSale — FIFO', () => {
  it('selects oldest lots first', () => {
    const { selectedLots, totalCostBasis } = selectLotsForSale([lot3, lot1, lot2], 12, 'FIFO');

    // lot1 (10 shares, $100/share) should be first, then lot2 (2 of 5 shares, $120/share)
    expect(selectedLots).toHaveLength(2);
    expect(selectedLots[0].lot.id).toBe('lot-1');
    expect(selectedLots[0].sharesToSell).toBe(10);
    expect(selectedLots[1].lot.id).toBe('lot-2');
    expect(selectedLots[1].sharesToSell).toBe(2);
    expect(totalCostBasis).toBe(124000); // 10×10000 + 2×12000
  });

  it('handles selling fewer shares than one lot', () => {
    const { selectedLots } = selectLotsForSale([lot1, lot2], 3, 'FIFO');

    expect(selectedLots).toHaveLength(1);
    expect(selectedLots[0].lot.id).toBe('lot-1');
    expect(selectedLots[0].sharesToSell).toBe(3);
  });

  it('returns empty for zero shares', () => {
    const { selectedLots, totalCostBasis } = selectLotsForSale([lot1], 0, 'FIFO');
    expect(selectedLots).toHaveLength(0);
    expect(totalCostBasis).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// selectLotsForSale — LIFO
// ---------------------------------------------------------------------------

describe('selectLotsForSale — LIFO', () => {
  it('selects newest lots first', () => {
    const { selectedLots } = selectLotsForSale([lot1, lot2, lot3], 10, 'LIFO');

    // lot3 (2024-03-01, 8 shares) first, then lot2 (2023-06-15, 2 shares)
    expect(selectedLots[0].lot.id).toBe('lot-3');
    expect(selectedLots[0].sharesToSell).toBe(8);
    expect(selectedLots[1].lot.id).toBe('lot-2');
    expect(selectedLots[1].sharesToSell).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectLotsForSale — Specific ID
// ---------------------------------------------------------------------------

describe('selectLotsForSale — SPECIFIC_ID', () => {
  it('selects specified lots in order', () => {
    const { selectedLots } = selectLotsForSale([lot1, lot2, lot3], 13, 'SPECIFIC_ID', [
      'lot-2',
      'lot-3',
    ]);

    expect(selectedLots[0].lot.id).toBe('lot-2');
    expect(selectedLots[0].sharesToSell).toBe(5);
    expect(selectedLots[1].lot.id).toBe('lot-3');
    expect(selectedLots[1].sharesToSell).toBe(8);
  });

  it('returns empty when no lot IDs provided', () => {
    const { selectedLots } = selectLotsForSale([lot1], 5, 'SPECIFIC_ID');
    expect(selectedLots).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// selectLotsForSale — Average Cost
// ---------------------------------------------------------------------------

describe('selectLotsForSale — AVERAGE_COST', () => {
  it('uses weighted average cost basis', () => {
    const { totalCostBasis } = selectLotsForSale([lot1, lot2, lot3], 10, 'AVERAGE_COST');

    // Total cost: 100000 + 60000 + 88000 = 248000
    // Total shares: 10 + 5 + 8 = 23
    // Avg cost/share: 248000/23 ≈ 10782.6
    // 10 shares × 10782.6 ≈ 107826
    expect(totalCostBasis).toBeCloseTo(107826, -1);
  });
});

// ---------------------------------------------------------------------------
// computeAverageCostBasis
// ---------------------------------------------------------------------------

describe('computeAverageCostBasis', () => {
  it('computes weighted average cost', () => {
    const result = computeAverageCostBasis([lot1, lot2, lot3]);

    // Total cost: 100000 + 60000 + 88000 = 248000
    // Total shares: 10 + 5 + 8 = 23
    // Avg: 248000/23 ≈ 10783
    expect(result.amount).toBe(10783);
  });

  it('returns 0 for empty lots', () => {
    const result = computeAverageCostBasis([]);
    expect(result.amount).toBe(0);
  });

  it('handles single lot', () => {
    const result = computeAverageCostBasis([lot1]);
    expect(result.amount).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// detectWashSales
// ---------------------------------------------------------------------------

describe('detectWashSales', () => {
  it('detects a wash sale within 30-day window', () => {
    const soldLots = [{ lotId: 'lot-sold', soldDate: '2024-03-10' as const, realizedLoss: -5000 }];

    const replacementLot = makeLot({
      id: 'lot-replacement',
      shares: 5,
      purchaseDate: '2024-03-15',
    });

    const alerts = detectWashSales(soldLots, [replacementLot], 'AAPL');

    expect(alerts).toHaveLength(1);
    expect(alerts[0].lotId).toBe('lot-sold');
    expect(alerts[0].symbol).toBe('AAPL');
    expect(alerts[0].disallowedLoss).toBe(5000);
  });

  it('does not flag sales with gains', () => {
    const soldLots = [{ lotId: 'lot-sold', soldDate: '2024-03-10' as const, realizedLoss: 5000 }];

    const replacementLot = makeLot({
      id: 'lot-replacement',
      shares: 5,
      purchaseDate: '2024-03-15',
    });

    const alerts = detectWashSales(soldLots, [replacementLot], 'AAPL');
    expect(alerts).toHaveLength(0);
  });

  it('does not flag purchases outside the 30-day window', () => {
    const soldLots = [{ lotId: 'lot-sold', soldDate: '2024-01-10' as const, realizedLoss: -5000 }];

    const distantLot = makeLot({
      id: 'lot-distant',
      shares: 5,
      purchaseDate: '2024-06-15',
    });

    const alerts = detectWashSales(soldLots, [distantLot], 'AAPL');
    expect(alerts).toHaveLength(0);
  });

  it('does not flag the same lot as both sold and replacement', () => {
    const soldLots = [{ lotId: 'lot-1', soldDate: '2024-03-10' as const, realizedLoss: -5000 }];

    // Only lot in the all-lots list is the one that was sold
    const alerts = detectWashSales(soldLots, [lot1], 'AAPL');
    // lot1 has purchaseDate 2023-01-15, far from 2024-03-10
    expect(alerts).toHaveLength(0);
  });

  it('detects wash sale from purchase before the sale', () => {
    const soldLots = [{ lotId: 'lot-sold', soldDate: '2024-03-20' as const, realizedLoss: -3000 }];

    const preSaleLot = makeLot({
      id: 'lot-pre',
      shares: 3,
      purchaseDate: '2024-03-05',
    });

    const alerts = detectWashSales(soldLots, [preSaleLot], 'VTI');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].replacementDate).toBe('2024-03-05');
  });
});
