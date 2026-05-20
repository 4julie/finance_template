// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import { FilingStatus } from './types';
import {
  getTaxBrackets,
  getStandardDeduction,
  calculateProgressiveTax,
  getMarginalRate,
  calculateFederalTax,
} from './federal-brackets';

describe('federal-brackets', () => {
  describe('getTaxBrackets', () => {
    it('returns single filer brackets', () => {
      const brackets = getTaxBrackets(FilingStatus.SINGLE);
      expect(brackets).toHaveLength(7);
      expect(brackets[0].min).toBe(0);
      expect(brackets[0].rate).toBe(0.1);
    });

    it('returns MFJ brackets', () => {
      const brackets = getTaxBrackets(FilingStatus.MARRIED_FILING_JOINTLY);
      expect(brackets).toHaveLength(7);
      expect(brackets[0].max).toBe(23199_00);
    });

    it('returns HOH brackets', () => {
      const brackets = getTaxBrackets(FilingStatus.HEAD_OF_HOUSEHOLD);
      expect(brackets).toHaveLength(7);
      expect(brackets[0].max).toBe(17449_00);
    });
  });

  describe('getStandardDeduction', () => {
    it('returns $14,600 for single', () => {
      expect(getStandardDeduction(FilingStatus.SINGLE)).toBe(14600_00);
    });

    it('returns $29,200 for MFJ', () => {
      expect(getStandardDeduction(FilingStatus.MARRIED_FILING_JOINTLY)).toBe(29200_00);
    });

    it('returns $21,900 for HOH', () => {
      expect(getStandardDeduction(FilingStatus.HEAD_OF_HOUSEHOLD)).toBe(21900_00);
    });
  });

  describe('calculateProgressiveTax', () => {
    it('calculates tax for $0 income', () => {
      const brackets = getTaxBrackets(FilingStatus.SINGLE);
      const tax = calculateProgressiveTax(0, brackets);
      expect(tax).toBe(0);
    });

    it('calculates tax at 10% bracket', () => {
      const brackets = getTaxBrackets(FilingStatus.SINGLE);
      // $10,000 in 10% bracket = $1,000 tax
      const tax = calculateProgressiveTax(1_000_000, brackets);
      expect(tax).toBe(100_000);
    });

    it('calculates progressive tax crossing brackets', () => {
      const brackets = getTaxBrackets(FilingStatus.SINGLE);
      // $50,000 taxable: 10% on first $11,600, 12% on next $35,550, 22% on $2,850
      const tax = calculateProgressiveTax(5_000_000, brackets);
      expect(tax).toBeGreaterThan(0);
      expect(tax).toBeLessThan(5_000_000);
    });

    it('handles high income with multiple brackets', () => {
      const brackets = getTaxBrackets(FilingStatus.SINGLE);
      // $100,000 taxable income
      const tax = calculateProgressiveTax(10_000_000, brackets);
      expect(tax).toBeGreaterThan(1_000_000); // More than 10%
      expect(tax).toBeLessThan(2_500_000); // Less than 25%
    });
  });

  describe('getMarginalRate', () => {
    it('returns 10% for low income', () => {
      const brackets = getTaxBrackets(FilingStatus.SINGLE);
      const rate = getMarginalRate(500_000, brackets);
      expect(rate).toBe(0.1);
    });

    it('returns 22% for mid income', () => {
      const brackets = getTaxBrackets(FilingStatus.SINGLE);
      const rate = getMarginalRate(5_000_000, brackets);
      expect(rate).toBe(0.22);
    });

    it('returns 37% for high income', () => {
      const brackets = getTaxBrackets(FilingStatus.SINGLE);
      const rate = getMarginalRate(100_000_000, brackets);
      expect(rate).toBe(0.37);
    });
  });

  describe('calculateFederalTax', () => {
    it('test vector: $100,000 single filer', () => {
      // $100,000 income, single
      // Standard deduction: $14,600
      // Taxable income: $85,400
      const result = calculateFederalTax(10_000_000, FilingStatus.SINGLE);

      expect(result.income).toBe(10_000_000);
      expect(result.standardDeduction).toBe(14600_00);
      expect(result.taxableIncome).toBe(8_540_000);
      expect(result.incomeTax).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeCloseTo(result.incomeTax / result.income, 2);
      expect(result.marginalRate).toBe(0.22);
    });

    it('test vector: $50,000 MFJ', () => {
      // $50,000 income, MFJ
      // Standard deduction: $29,200
      // Taxable income: $20,800
      const result = calculateFederalTax(5_000_000, FilingStatus.MARRIED_FILING_JOINTLY);

      expect(result.income).toBe(5_000_000);
      expect(result.standardDeduction).toBe(29200_00);
      expect(result.taxableIncome).toBe(2_080_000);
      expect(result.incomeTax).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeGreaterThan(0);
    });

    it('handles zero income', () => {
      const result = calculateFederalTax(0, FilingStatus.SINGLE);
      expect(result.income).toBe(0);
      expect(result.taxableIncome).toBe(0);
      expect(result.incomeTax).toBe(0);
      expect(result.effectiveRate).toBe(0);
    });

    it('handles income below standard deduction', () => {
      // $10,000 income, single (below $14,600 deduction)
      const result = calculateFederalTax(1_000_000, FilingStatus.SINGLE);
      expect(result.taxableIncome).toBe(0);
      expect(result.incomeTax).toBe(0);
    });
  });
});
