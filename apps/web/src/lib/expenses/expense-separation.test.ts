// ---------------------------------------------------------------------------
// Tests — Expense Separation Engine (#1700)
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';
import type { AllocationConfig, ClassifiedTransaction, Transaction } from './types';
import {
  businessPortion,
  calculateAllocation,
  classifyTransaction,
  generateBusinessExpenseReport,
  personalPortion,
  quarterFromDate,
  quarterlyBusinessSummary,
  taxDeductibleExpenses,
  yearFromDate,
} from './expense-separation';

// ── Fixtures ───────────────────────────────────────────────────────────────

const tx1: Transaction = {
  id: 't1',
  merchant: 'Office Depot',
  category: 'Office Supplies',
  amountCents: 5_000,
  date: '2024-02-15',
  tags: [],
  note: '',
};

const tx2: Transaction = {
  id: 't2',
  merchant: 'Whole Foods',
  category: 'Groceries',
  amountCents: 8_000,
  date: '2024-05-20',
  tags: [],
  note: '',
};

const tx3: Transaction = {
  id: 't3',
  merchant: 'WeWork',
  category: 'Office Rent',
  amountCents: 200_000,
  date: '2024-07-01',
  tags: [],
  note: '',
};

// ── businessPortion / personalPortion ──────────────────────────────────────

describe('businessPortion', () => {
  it('returns full amount for business', () => {
    expect(businessPortion(10_000, 'business')).toBe(10_000);
  });

  it('returns 0 for personal', () => {
    expect(businessPortion(10_000, 'personal')).toBe(0);
  });

  it('returns proportional amount for split', () => {
    expect(
      businessPortion(10_000, 'split', {
        businessPercent: 60,
        personalPercent: 40,
      }),
    ).toBe(6_000);
  });

  it('returns 0 for split with 0 business percent', () => {
    expect(
      businessPortion(10_000, 'split', {
        businessPercent: 0,
        personalPercent: 100,
      }),
    ).toBe(0);
  });

  it('handles banker rounding on split', () => {
    // 33% of 10001 = 3300.33 → bankers rounds to 3300
    expect(
      businessPortion(10_001, 'split', {
        businessPercent: 33,
        personalPercent: 67,
      }),
    ).toBe(3300);
  });
});

describe('personalPortion', () => {
  it('returns full amount for personal', () => {
    expect(personalPortion(10_000, 'personal')).toBe(10_000);
  });

  it('returns 0 for business', () => {
    expect(personalPortion(10_000, 'business')).toBe(0);
  });

  it('returns proportional amount for split', () => {
    expect(
      personalPortion(10_000, 'split', {
        businessPercent: 60,
        personalPercent: 40,
      }),
    ).toBe(4_000);
  });
});

// ── quarterFromDate / yearFromDate ─────────────────────────────────────────

describe('quarterFromDate', () => {
  it.each([
    ['2024-01-15', 'Q1'],
    ['2024-03-31', 'Q1'],
    ['2024-04-01', 'Q2'],
    ['2024-06-30', 'Q2'],
    ['2024-07-01', 'Q3'],
    ['2024-09-30', 'Q3'],
    ['2024-10-01', 'Q4'],
    ['2024-12-31', 'Q4'],
  ] as const)('returns %s for %s', (date, expected) => {
    expect(quarterFromDate(date)).toBe(expected);
  });
});

describe('yearFromDate', () => {
  it('extracts year', () => {
    expect(yearFromDate('2024-07-01')).toBe(2024);
  });
});

// ── classifyTransaction ────────────────────────────────────────────────────

describe('classifyTransaction', () => {
  it('classifies as business', () => {
    const classified = classifyTransaction(tx1, 'business', undefined, true, 'Supplies');
    expect(classified.expenseType).toBe('business');
    expect(classified.isDeductible).toBe(true);
    expect(classified.deductionCategory).toBe('Supplies');
    expect(classified.splitRatio).toBeUndefined();
  });

  it('classifies as personal', () => {
    const classified = classifyTransaction(tx2, 'personal');
    expect(classified.expenseType).toBe('personal');
    expect(classified.isDeductible).toBe(false);
  });

  it('classifies as split with ratio', () => {
    const classified = classifyTransaction(
      tx3,
      'split',
      { businessPercent: 70, personalPercent: 30 },
      true,
    );
    expect(classified.expenseType).toBe('split');
    expect(classified.splitRatio).toEqual({
      businessPercent: 70,
      personalPercent: 30,
    });
  });

  it('throws when split ratio does not sum to 100', () => {
    expect(() =>
      classifyTransaction(tx1, 'split', {
        businessPercent: 60,
        personalPercent: 60,
      }),
    ).toThrow('Split ratio must sum to 100');
  });
});

// ── generateBusinessExpenseReport ──────────────────────────────────────────

describe('generateBusinessExpenseReport', () => {
  const classified: ClassifiedTransaction[] = [
    classifyTransaction(tx1, 'business', undefined, true, 'Supplies'),
    classifyTransaction(tx2, 'personal'),
    classifyTransaction(tx3, 'split', { businessPercent: 50, personalPercent: 50 }, true),
  ];

  it('includes only business and split in range', () => {
    const report = generateBusinessExpenseReport(classified, '2024-01-01', '2024-12-31');
    expect(report.transactions).toHaveLength(2);
    expect(report.totalBusinessCents).toBe(5_000 + 100_000);
    expect(report.totalDeductibleCents).toBe(5_000 + 100_000);
    expect(report.totalSplitBusinessPortionCents).toBe(100_000);
  });

  it('respects date range', () => {
    const report = generateBusinessExpenseReport(classified, '2024-01-01', '2024-06-30');
    expect(report.transactions).toHaveLength(1);
    expect(report.totalBusinessCents).toBe(5_000);
  });

  it('populates category breakdown', () => {
    const report = generateBusinessExpenseReport(classified, '2024-01-01', '2024-12-31');
    expect(report.categoryBreakdown.get('Office Supplies')).toBe(5_000);
    expect(report.categoryBreakdown.get('Office Rent')).toBe(100_000);
  });
});

// ── taxDeductibleExpenses ──────────────────────────────────────────────────

describe('taxDeductibleExpenses', () => {
  it('returns only deductible non-personal transactions', () => {
    const classified: ClassifiedTransaction[] = [
      classifyTransaction(tx1, 'business', undefined, true),
      classifyTransaction(tx2, 'personal', undefined, true), // personal deductible ignored
      classifyTransaction(tx3, 'business', undefined, false),
    ];
    const result = taxDeductibleExpenses(classified);
    expect(result).toHaveLength(1);
    expect(result[0].transaction.id).toBe('t1');
  });
});

// ── quarterlyBusinessSummary ───────────────────────────────────────────────

describe('quarterlyBusinessSummary', () => {
  const classified: ClassifiedTransaction[] = [
    classifyTransaction(tx1, 'business', undefined, true), // Q1
    classifyTransaction(tx3, 'business', undefined, false), // Q3
  ];

  it('returns 4 quarters', () => {
    const summaries = quarterlyBusinessSummary(classified, 2024);
    expect(summaries).toHaveLength(4);
  });

  it('Q1 has tx1 amount', () => {
    const summaries = quarterlyBusinessSummary(classified, 2024);
    const q1 = summaries.find((s) => s.quarter === 'Q1')!;
    expect(q1.totalBusinessCents).toBe(5_000);
    expect(q1.totalDeductibleCents).toBe(5_000);
  });

  it('Q3 has tx3 amount', () => {
    const summaries = quarterlyBusinessSummary(classified, 2024);
    const q3 = summaries.find((s) => s.quarter === 'Q3')!;
    expect(q3.totalBusinessCents).toBe(200_000);
    expect(q3.totalDeductibleCents).toBe(0);
  });

  it('Q2 and Q4 are empty', () => {
    const summaries = quarterlyBusinessSummary(classified, 2024);
    expect(summaries.find((s) => s.quarter === 'Q2')!.totalBusinessCents).toBe(0);
    expect(summaries.find((s) => s.quarter === 'Q4')!.totalBusinessCents).toBe(0);
  });
});

// ── calculateAllocation ────────────────────────────────────────────────────

describe('calculateAllocation', () => {
  it('calculates mileage deduction', () => {
    // 67 cents/mile × 1000 miles = $670
    const config: AllocationConfig = {
      type: 'mileage',
      rateOrPercent: 67,
      quantity: 1000,
    };
    expect(calculateAllocation(config)).toBe(67_000);
  });

  it('calculates home-office deduction', () => {
    // 25% of $2,000 total = $500
    const config: AllocationConfig = {
      type: 'home-office',
      rateOrPercent: 25,
      quantity: 200_000,
    };
    expect(calculateAllocation(config)).toBe(50_000);
  });

  it('returns 0 for zero quantity', () => {
    expect(calculateAllocation({ type: 'mileage', rateOrPercent: 67, quantity: 0 })).toBe(0);
  });

  it('returns 0 for zero rate', () => {
    expect(calculateAllocation({ type: 'home-office', rateOrPercent: 0, quantity: 100_000 })).toBe(
      0,
    );
  });
});
