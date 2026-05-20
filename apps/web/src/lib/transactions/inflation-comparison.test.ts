// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import {
  calculateInflationRate,
  adjustForInflation,
  lookupCpi,
  compareCategoryYoY,
  buildYearOverYearSummary,
} from './inflation-comparison';
import type { CategoryYearSpend, CpiDataPoint } from './inflation-comparison';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cpiData: CpiDataPoint[] = [
  { period: '2022', cpiIndex: 292.655 },
  { period: '2023', cpiIndex: 304.702 },
  { period: '2024', cpiIndex: 314.69 },
];

function makeSpend(
  categoryId: string,
  categoryName: string,
  year: number,
  nominalCents: number,
): CategoryYearSpend {
  return { categoryId, categoryName, year, nominalCents };
}

// ---------------------------------------------------------------------------
// calculateInflationRate
// ---------------------------------------------------------------------------

describe('calculateInflationRate', () => {
  it('calculates inflation rate between two CPI values', () => {
    // (304.702 - 292.655) / 292.655 * 100 = 4.115...
    const rate = calculateInflationRate(292.655, 304.702);
    expect(rate).toBe(4.12);
  });

  it('returns 0 when baseCpi is 0', () => {
    expect(calculateInflationRate(0, 304.702)).toBe(0);
  });

  it('handles equal CPI values (0% inflation)', () => {
    expect(calculateInflationRate(300, 300)).toBe(0);
  });

  it('handles deflation (negative rate)', () => {
    const rate = calculateInflationRate(300, 290);
    expect(rate).toBe(-3.33);
  });
});

// ---------------------------------------------------------------------------
// adjustForInflation
// ---------------------------------------------------------------------------

describe('adjustForInflation', () => {
  it('adjusts amount from base to comparison period', () => {
    // 100000 * 304.702 / 292.655 = 104115.78... => banker's round = 104116
    const adjusted = adjustForInflation(100000, 292.655, 304.702);
    expect(adjusted).toBe(104116);
  });

  it('returns original amount when baseCpi is 0', () => {
    expect(adjustForInflation(100000, 0, 304.702)).toBe(100000);
  });

  it('handles zero amount', () => {
    expect(adjustForInflation(0, 292.655, 304.702)).toBe(0);
  });

  it('handles same CPI (no adjustment)', () => {
    expect(adjustForInflation(50000, 300, 300)).toBe(50000);
  });
});

// ---------------------------------------------------------------------------
// lookupCpi
// ---------------------------------------------------------------------------

describe('lookupCpi', () => {
  it('finds CPI for a known year', () => {
    expect(lookupCpi(cpiData, 2023)).toBe(304.702);
  });

  it('returns null for unknown year', () => {
    expect(lookupCpi(cpiData, 2020)).toBeNull();
  });

  it('returns null for empty dataset', () => {
    expect(lookupCpi([], 2023)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// compareCategoryYoY
// ---------------------------------------------------------------------------

describe('compareCategoryYoY', () => {
  it('compares a category between two years with inflation adjustment', () => {
    const base = makeSpend('cat-food', 'Food', 2022, 120000);
    const comp = makeSpend('cat-food', 'Food', 2023, 130000);
    const result = compareCategoryYoY(base, comp, 292.655, 304.702);

    expect(result.categoryId).toBe('cat-food');
    expect(result.baseYear).toBe(2022);
    expect(result.comparisonYear).toBe(2023);
    expect(result.baseNominalCents).toBe(120000);
    expect(result.comparisonNominalCents).toBe(130000);
    // baseAdjusted = 120000 * 304.702 / 292.655 = 124939.57 → banker's round = 124940
    expect(result.baseAdjustedCents).toBe(124940);
    // nominalChange = 130000 - 120000 = 10000
    expect(result.nominalChangeCents).toBe(10000);
    // realChange = 130000 - 124940 = 5060
    expect(result.realChangeCents).toBe(5060);
    expect(result.inflationRatePercent).toBe(4.12);
  });

  it('handles zero base spending', () => {
    const base = makeSpend('cat-new', 'New Category', 2022, 0);
    const comp = makeSpend('cat-new', 'New Category', 2023, 5000);
    const result = compareCategoryYoY(base, comp, 292.655, 304.702);

    expect(result.nominalChangeCents).toBe(5000);
    expect(result.nominalChangePercent).toBe(0);
    expect(result.realChangePercent).toBe(0);
  });

  it('handles zero comparison spending', () => {
    const base = makeSpend('cat-old', 'Old Category', 2022, 10000);
    const comp = makeSpend('cat-old', 'Old Category', 2023, 0);
    const result = compareCategoryYoY(base, comp, 292.655, 304.702);

    expect(result.nominalChangeCents).toBe(-10000);
    expect(result.comparisonNominalCents).toBe(0);
  });

  it('handles both zero spending', () => {
    const base = makeSpend('cat-x', 'X', 2022, 0);
    const comp = makeSpend('cat-x', 'X', 2023, 0);
    const result = compareCategoryYoY(base, comp, 292.655, 304.702);

    expect(result.nominalChangeCents).toBe(0);
    expect(result.realChangeCents).toBe(0);
    expect(result.nominalChangePercent).toBe(0);
    expect(result.realChangePercent).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildYearOverYearSummary
// ---------------------------------------------------------------------------

describe('buildYearOverYearSummary', () => {
  it('builds a complete summary across categories', () => {
    const spends: CategoryYearSpend[] = [
      makeSpend('cat-food', 'Food', 2022, 120000),
      makeSpend('cat-food', 'Food', 2023, 130000),
      makeSpend('cat-transport', 'Transport', 2022, 60000),
      makeSpend('cat-transport', 'Transport', 2023, 65000),
    ];
    const result = buildYearOverYearSummary(spends, 2022, 2023, 292.655, 304.702);

    expect(result.baseYear).toBe(2022);
    expect(result.comparisonYear).toBe(2023);
    expect(result.categories).toHaveLength(2);
    expect(result.totalBaseNominalCents).toBe(180000);
    expect(result.totalComparisonNominalCents).toBe(195000);
    expect(result.inflationRatePercent).toBe(4.12);
  });

  it('handles categories present in only one year', () => {
    const spends: CategoryYearSpend[] = [
      makeSpend('cat-food', 'Food', 2022, 120000),
      makeSpend('cat-new', 'New', 2023, 50000),
    ];
    const result = buildYearOverYearSummary(spends, 2022, 2023, 292.655, 304.702);

    expect(result.categories).toHaveLength(2);
    const food = result.categories.find((c) => c.categoryId === 'cat-food')!;
    expect(food.comparisonNominalCents).toBe(0);
    const newCat = result.categories.find((c) => c.categoryId === 'cat-new')!;
    expect(newCat.baseNominalCents).toBe(0);
  });

  it('handles empty spends', () => {
    const result = buildYearOverYearSummary([], 2022, 2023, 292.655, 304.702);
    expect(result.categories).toHaveLength(0);
    expect(result.totalBaseNominalCents).toBe(0);
    expect(result.totalComparisonNominalCents).toBe(0);
    expect(result.totalRealChangeCents).toBe(0);
  });

  it('ignores spends from years not being compared', () => {
    const spends: CategoryYearSpend[] = [
      makeSpend('cat-food', 'Food', 2021, 100000),
      makeSpend('cat-food', 'Food', 2022, 120000),
      makeSpend('cat-food', 'Food', 2023, 130000),
    ];
    const result = buildYearOverYearSummary(spends, 2022, 2023, 292.655, 304.702);
    expect(result.categories).toHaveLength(1);
    expect(result.totalBaseNominalCents).toBe(120000);
  });

  it('handles single category', () => {
    const spends = [
      makeSpend('cat-a', 'Category A', 2022, 50000),
      makeSpend('cat-a', 'Category A', 2023, 55000),
    ];
    const result = buildYearOverYearSummary(spends, 2022, 2023, 300, 309);
    expect(result.categories).toHaveLength(1);
    expect(result.inflationRatePercent).toBe(3);
  });
});
