// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';
import { formatAmount, formatRange, MaskingMode } from '../masking';

describe('formatAmount', () => {
  const edgeValues = [-123456, 0, 9876543210];
  const locales = [
    { locale: 'en-US', currency: 'USD' },
    { locale: 'de-DE', currency: 'EUR' },
  ];

  it.each(edgeValues.flatMap((value) => locales.map((entry) => ({ value, ...entry }))))(
    'formats visible $value in $locale',
    ({ value, locale, currency }) => {
      expect(formatAmount(value, MaskingMode.Visible, locale, { currency })).toContain(
        value < 0 ? '-' : '',
      );
      expect(formatAmount(value, MaskingMode.Visible, locale, { currency })).not.toBe('•••');
    },
  );

  it('formats bucketed rounded ranges', () => {
    expect(formatAmount(250_000, MaskingMode.Bucketed, 'en-US', { currency: 'USD' })).toBe(
      '$1K–$5K',
    );
    expect(formatAmount(-250_000, MaskingMode.Bucketed, 'en-US', { currency: 'USD' })).toBe(
      '-$1K–$5K',
    );
    expect(formatAmount(0, MaskingMode.Bucketed, 'en-US', { currency: 'USD' })).toBe('$0');
  });

  it('formats progress-only percent mode', () => {
    expect(formatAmount(2_500, MaskingMode.Percent, 'en-US', { percentOfCents: 10_000 })).toBe(
      '25%',
    );
    expect(formatAmount(2_500, MaskingMode.Percent, 'en-US')).toBe('Progress only');
  });

  it('formats dots mode without digits', () => {
    for (const value of edgeValues) {
      expect(formatAmount(value, MaskingMode.Dots, 'en-US')).toBe('•••');
    }
  });
});

describe('formatRange', () => {
  it('formats visible and masked ranges', () => {
    expect(formatRange(100_00, 500_00, MaskingMode.Visible, 'en-US')).toBe('$100.00–$500.00');
    expect(formatRange(100_00, 500_00, MaskingMode.Dots, 'en-US')).toBe('•••');
    expect(formatRange(100_00, 500_00, MaskingMode.Percent, 'en-US')).toBe('Progress only');
  });
});
