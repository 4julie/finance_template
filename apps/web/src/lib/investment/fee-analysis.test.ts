// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for the fee analysis and fee-drag calculator.
 *
 * Covers fee summary computation, fee drag projections, comparison
 * scenarios, and the full analysis pipeline.
 *
 * References: issue #1625
 */

import { describe, expect, it } from 'vitest';
import type { FeeHoldingInput } from './fee-analysis';
import {
  analyzeFees,
  computeFeeSummary,
  formatExpenseRatio,
  generateFeeComparisons,
  projectFeeDrag,
  projectFeeDragMultiYear,
} from './fee-analysis';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const holdings: readonly FeeHoldingInput[] = [
  {
    investmentId: 'inv-1',
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market',
    expenseRatioBps: 3, // 0.03%
    marketValue: 500000_00,
  },
  {
    investmentId: 'inv-2',
    symbol: 'VXUS',
    name: 'Vanguard Total International',
    expenseRatioBps: 7, // 0.07%
    marketValue: 300000_00,
  },
  {
    investmentId: 'inv-3',
    symbol: 'BND',
    name: 'Vanguard Total Bond Market',
    expenseRatioBps: 3, // 0.03%
    marketValue: 200000_00,
  },
];

// ---------------------------------------------------------------------------
// computeFeeSummary
// ---------------------------------------------------------------------------

describe('computeFeeSummary', () => {
  it('computes total portfolio value', () => {
    const summary = computeFeeSummary(holdings);
    expect(summary.totalValue).toBe(1000000_00); // $10,000
  });

  it('computes per-fund annual fees', () => {
    const summary = computeFeeSummary(holdings);

    const vtiFee = summary.fundFees.find((f) => f.symbol === 'VTI');
    // 50000000 × 3 / 10000 = 15000
    expect(vtiFee?.annualFee).toBe(15000);

    const vxusFee = summary.fundFees.find((f) => f.symbol === 'VXUS');
    // 30000000 × 7 / 10000 = 21000
    expect(vxusFee?.annualFee).toBe(21000);
  });

  it('computes total annual fees', () => {
    const summary = computeFeeSummary(holdings);
    // 15000 + 21000 + 6000 = 42000
    expect(summary.totalAnnualFees).toBe(42000);
  });

  it('computes weighted average expense ratio', () => {
    const summary = computeFeeSummary(holdings);
    // Weighted: (5000000×3 + 3000000×7 + 2000000×3) / 10000000
    // = (15000000 + 21000000 + 6000000) / 10000000 = 4.2 → rounds to 4
    expect(summary.weightedExpenseRatioBps).toBe(4);
  });

  it('handles empty holdings', () => {
    const summary = computeFeeSummary([]);
    expect(summary.totalValue).toBe(0);
    expect(summary.totalAnnualFees).toBe(0);
    expect(summary.weightedExpenseRatioBps).toBe(0);
    expect(summary.fundFees).toHaveLength(0);
  });

  it('sorts fund fees by annual fee descending', () => {
    const summary = computeFeeSummary(holdings);
    for (let i = 1; i < summary.fundFees.length; i++) {
      expect(summary.fundFees[i - 1].annualFee).toBeGreaterThanOrEqual(
        summary.fundFees[i].annualFee,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// projectFeeDrag
// ---------------------------------------------------------------------------

describe('projectFeeDrag', () => {
  it('projects value without fees using compound growth', () => {
    // $10,000 at 7% for 10 years: 10000 × 1.07^10 ≈ $19,671.51
    const result = projectFeeDrag(1000000, 7, 0, 10);
    expect(result.valueWithoutFees).toBe(1967151);
    expect(result.valueWithFees).toBe(1967151);
    expect(result.totalFeesPaid).toBe(0);
  });

  it('computes fee drag with a non-zero expense ratio', () => {
    // $10,000 at 7% with 100bps (1%) fee for 10 years
    // Without fees: 10000 × 1.07^10
    // With fees: 10000 × 1.06^10
    const result = projectFeeDrag(1000000, 7, 100, 10);

    expect(result.valueWithoutFees).toBe(1967151);
    expect(result.valueWithFees).toBe(1790848);
    expect(result.totalFeesPaid).toBe(176303);
    expect(result.feeDragPercent).toBeGreaterThan(0);
  });

  it('handles zero initial value', () => {
    const result = projectFeeDrag(0, 7, 50, 10);
    expect(result.valueWithoutFees).toBe(0);
    expect(result.valueWithFees).toBe(0);
    expect(result.totalFeesPaid).toBe(0);
  });

  it('handles zero return rate', () => {
    const result = projectFeeDrag(1000000, 0, 50, 10);
    expect(result.valueWithoutFees).toBe(1000000);
    // With fees of 0.5%: 10000 × (1 - 0.005)^10 ≈ 9511
    expect(result.valueWithFees).toBeLessThan(1000000);
  });

  it('fee drag increases over longer time horizons', () => {
    const r10 = projectFeeDrag(1000000, 7, 50, 10);
    const r20 = projectFeeDrag(1000000, 7, 50, 20);
    const r30 = projectFeeDrag(1000000, 7, 50, 30);

    expect(r20.totalFeesPaid).toBeGreaterThan(r10.totalFeesPaid);
    expect(r30.totalFeesPaid).toBeGreaterThan(r20.totalFeesPaid);
  });
});

// ---------------------------------------------------------------------------
// projectFeeDragMultiYear
// ---------------------------------------------------------------------------

describe('projectFeeDragMultiYear', () => {
  it('generates projections for 10, 20, and 30 years', () => {
    const projections = projectFeeDragMultiYear(1000000, 7, 50);

    expect(projections).toHaveLength(3);
    expect(projections[0].years).toBe(10);
    expect(projections[1].years).toBe(20);
    expect(projections[2].years).toBe(30);
  });

  it('shows increasing fee drag over time', () => {
    const projections = projectFeeDragMultiYear(1000000, 7, 100);

    expect(projections[2].feeDragPercent).toBeGreaterThan(projections[0].feeDragPercent);
  });
});

// ---------------------------------------------------------------------------
// generateFeeComparisons
// ---------------------------------------------------------------------------

describe('generateFeeComparisons', () => {
  it('generates comparison scenarios', () => {
    const scenarios = [
      { label: 'Low Cost', expenseRatioBps: 3 },
      { label: 'Medium Cost', expenseRatioBps: 50 },
    ];

    const comparisons = generateFeeComparisons(1000000, 7, scenarios);

    expect(comparisons).toHaveLength(2);
    expect(comparisons[0].label).toBe('Low Cost');
    expect(comparisons[0].expenseRatioBps).toBe(3);
    expect(comparisons[0].projections).toHaveLength(3);
  });

  it('lower fees result in higher ending values', () => {
    const scenarios = [
      { label: 'Low', expenseRatioBps: 3 },
      { label: 'High', expenseRatioBps: 100 },
    ];

    const comparisons = generateFeeComparisons(1000000, 7, scenarios);

    // At 30 years, low-fee should have higher value
    const low30 = comparisons[0].projections[2];
    const high30 = comparisons[1].projections[2];
    expect(low30.valueWithFees).toBeGreaterThan(high30.valueWithFees);
  });
});

// ---------------------------------------------------------------------------
// analyzeFees (full pipeline)
// ---------------------------------------------------------------------------

describe('analyzeFees', () => {
  it('produces complete analysis with summary, projections, and comparisons', () => {
    const analysis = analyzeFees(holdings);

    expect(analysis.summary.totalValue).toBe(1000000_00);
    expect(analysis.projections).toHaveLength(3);
    expect(analysis.comparisons.length).toBeGreaterThan(0);
  });

  it('uses custom annual return rate', () => {
    const analysis10 = analyzeFees(holdings, 10);
    const analysis5 = analyzeFees(holdings, 5);

    // Higher return → higher ending values
    expect(analysis10.projections[2].valueWithoutFees).toBeGreaterThan(
      analysis5.projections[2].valueWithoutFees,
    );
  });

  it('uses custom comparison scenarios', () => {
    const custom = [{ label: 'Free', expenseRatioBps: 0 }];
    const analysis = analyzeFees(holdings, 7, custom);

    expect(analysis.comparisons).toHaveLength(1);
    expect(analysis.comparisons[0].label).toBe('Free');
  });
});

// ---------------------------------------------------------------------------
// formatExpenseRatio
// ---------------------------------------------------------------------------

describe('formatExpenseRatio', () => {
  it('formats basis points as percentage', () => {
    expect(formatExpenseRatio(3)).toBe('0.03%');
    expect(formatExpenseRatio(10)).toBe('0.10%');
    expect(formatExpenseRatio(100)).toBe('1.00%');
    expect(formatExpenseRatio(75)).toBe('0.75%');
  });

  it('handles zero', () => {
    expect(formatExpenseRatio(0)).toBe('0.00%');
  });
});
