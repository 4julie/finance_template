// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    const result = formatDate('2023-12-24');
    // The exact format depends on the test locale, but it should contain "2023" and "24"
    expect(result).toContain('2023');
    expect(result).toContain('24');
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date(2023, 11, 24)); // Dec 24, 2023
    expect(result).toContain('2023');
    expect(result).toContain('24');
  });

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns raw string for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('accepts custom Intl options', () => {
    const result = formatDate('2023-12-24', { year: 'numeric', month: 'long', day: 'numeric' });
    expect(result).toContain('2023');
  });
});
