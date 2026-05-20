// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import {
  calculateSETax,
  calculateAdditionalMedicareTax,
  calculateSETaxWithAdditionalMedicare,
} from './self-employment-tax';

describe('self-employment-tax', () => {
  describe('calculateSETax', () => {
    it('test vector: $80,000 net SE income', () => {
      // $80,000 net SE income
      // Taxable base: $80,000 * 92.35% = $73,880
      // SS tax: $73,880 * 12.4% = $9,161.12
      // Medicare tax: $73,880 * 2.9% = $2,142.52
      // Total SE tax: $11,303.64
      // SE deduction (50%): $5,651.82
      const result = calculateSETax(8_000_000);

      expect(result.netIncome).toBe(8_000_000);
      expect(result.taxableBase).toBe(7_388_000); // $80,000 * 0.9235
      expect(result.ssContribution).toBeGreaterThan(0);
      expect(result.medicareContribution).toBeGreaterThan(0);
      expect(result.seTax).toBeCloseTo(1_130_400, -2); // ~$11,304
      expect(result.seDeduction).toBeCloseTo(565_200, -2); // ~$5,652
    });

    it('calculates correctly for $120,000 net SE income', () => {
      // $120,000 net SE income
      const result = calculateSETax(12_000_000);

      expect(result.netIncome).toBe(12_000_000);
      expect(result.taxableBase).toBe(11_082_000); // $120,000 * 0.9235
      expect(result.seTax).toBeGreaterThan(result.seDeduction);
      // SE deduction should be exactly 50% of SE tax
      expect(result.seDeduction).toBeCloseTo(result.seTax / 2, 1);
    });

    it('handles zero income', () => {
      const result = calculateSETax(0);
      expect(result.netIncome).toBe(0);
      expect(result.seTax).toBe(0);
      expect(result.seDeduction).toBe(0);
      expect(result.taxableBase).toBe(0);
    });

    it('SS contribution is capped at wage base', () => {
      // $200,000 net SE income (well above SS wage base)
      const result = calculateSETax(20_000_000);

      // Taxable base: $200,000 * 0.9235 = $184,700
      // SS is capped at $168,600 wage base
      const ssWageBase = 168_600_00;
      const expectedSSContribution = Math.round(ssWageBase * 0.124);
      expect(result.ssContribution).toBe(expectedSSContribution);
    });

    it('Medicare tax applies to full taxable base', () => {
      // $180,000 net SE income
      const result = calculateSETax(18_000_000);

      // Medicare should be on full taxable base, not capped
      const taxableBase = Math.round(18_000_000 * 0.9235);
      const expectedMedicareTax = Math.round(taxableBase * 0.029);
      expect(result.medicareContribution).toBe(expectedMedicareTax);
    });
  });

  describe('calculateAdditionalMedicareTax', () => {
    it('returns 0 for income below threshold', () => {
      const tax = calculateAdditionalMedicareTax(100_000_00, 50_000_00, false);
      expect(tax).toBe(0);
    });

    it('calculates 0.9% on income over $200,000 threshold', () => {
      // $180,000 wages + $50,000 SE = $230,000
      // Excess over $200,000 = $30,000
      // 0.9% of $30,000 = $270
      const tax = calculateAdditionalMedicareTax(180_000_00, 50_000_00, false);
      expect(tax).toBe(27_000); // $270
    });

    it('uses $125,000 threshold for MFS filers', () => {
      // $100,000 wages + $50,000 SE = $150,000
      // MFS threshold is $125,000
      // Excess: $25,000
      // 0.9% of $25,000 = $225
      const tax = calculateAdditionalMedicareTax(100_000_00, 50_000_00, true);
      expect(tax).toBe(22_500); // $225
    });

    it('handles high earner ($220,000 total)', () => {
      // $200,000 wages + $20,000 SE = $220,000
      // Excess over $200,000 = $20,000
      // 0.9% of $20,000 = $180
      const tax = calculateAdditionalMedicareTax(200_000_00, 20_000_00, false);
      expect(tax).toBe(18_000); // $180
    });
  });

  describe('calculateSETaxWithAdditionalMedicare', () => {
    it('includes additional Medicare on high earners', () => {
      // $200,000 SE income + $50,000 wages = $250,000 total
      const result = calculateSETaxWithAdditionalMedicare(20_000_000, 5_000_000, false);

      expect(result.additionalMedicareTax).toBeGreaterThan(0);
      // 0.9% on $50,000 excess = $450
      expect(result.additionalMedicareTax).toBe(45_000);
      expect(result.seTax).toBeGreaterThan(calculateSETax(20_000_000).seTax);
    });

    it('no additional Medicare when below threshold', () => {
      const result = calculateSETaxWithAdditionalMedicare(8_000_000, 0, false);
      expect(result.additionalMedicareTax).toBe(0);
    });

    it('SE deduction includes additional Medicare tax portion', () => {
      const result = calculateSETaxWithAdditionalMedicare(20_000_000, 5_000_000, false);

      // SE deduction should be 50% of total SE tax (including additional Medicare)
      const expectedDeduction = Math.round(result.seTax * 0.5);
      expect(result.seDeduction).toBe(expectedDeduction);
    });
  });
});
