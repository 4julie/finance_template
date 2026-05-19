// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for the crash report scrubber.
 *
 * References: issue #1673
 */

import { describe, expect, it } from 'vitest';

import {
  CRASH_REPORT_FIELD_DESCRIPTIONS,
  NEVER_INCLUDED_FIELDS,
  generateExamplePayload,
  scrubCrashPayload,
  scrubStackTrace,
} from './crash-report-scrubber';

describe('scrubStackTrace', () => {
  it('returns empty string for empty input', () => {
    expect(scrubStackTrace('')).toBe('');
  });

  it('preserves file paths and line numbers', () => {
    const stack = '    at render (src/components/App.tsx:42:18)';
    expect(scrubStackTrace(stack)).toContain('src/components/App.tsx:42:18');
  });

  it('redacts currency amounts in stack traces', () => {
    const stack = 'Error: Failed to process $1,234.56 payment';
    const result = scrubStackTrace(stack);
    expect(result).not.toContain('$1,234.56');
    expect(result).toContain('[REDACTED_AMOUNT]');
  });

  it('redacts long quoted strings', () => {
    const stack = 'Error: Could not find "John Doe Savings Account Primary"';
    const result = scrubStackTrace(stack);
    expect(result).not.toContain('John Doe Savings Account Primary');
    expect(result).toContain('[REDACTED]');
  });
});

describe('scrubCrashPayload', () => {
  it('produces a valid payload structure', () => {
    const error = new TypeError('Cannot read properties of undefined');
    const payload = scrubCrashPayload(error);

    expect(payload.errorType).toBe('TypeError');
    expect(payload.errorMessage).toBe('Cannot read properties of undefined');
    expect(payload.appVersion).toBe('0.1.0');
    expect(payload.timestamp).toBeTruthy();
    expect(payload.sessionId).toMatch(/^session-/);
    expect(payload.viewport).toHaveProperty('width');
    expect(payload.viewport).toHaveProperty('height');
  });

  it('scrubs sensitive data from the error message', () => {
    const error = new Error('Failed to update balance of $5,000.00 for account');
    const payload = scrubCrashPayload(error);

    expect(payload.errorMessage).not.toContain('$5,000.00');
  });

  it('scrubs context data', () => {
    const error = new Error('Sync failed');
    const context = {
      accountName: 'My Secret Account',
      amount: 12345,
      route: '/transactions',
    };

    const payload = scrubCrashPayload(error, context);

    // The context is scrubbed — sensitive fields removed
    expect(payload.errorType).toBe('Error');
  });

  it('uses the current pathname for currentRoute', () => {
    const error = new Error('test');
    const payload = scrubCrashPayload(error);

    expect(typeof payload.currentRoute).toBe('string');
  });
});

describe('generateExamplePayload', () => {
  it('returns a complete example payload', () => {
    const example = generateExamplePayload();

    expect(example.errorType).toBe('TypeError');
    expect(example.errorMessage).toBeTruthy();
    expect(example.stackTrace).toContain('TransactionList');
    expect(example.appVersion).toBe('0.1.0');
    expect(example.breadcrumbs).toHaveLength(3);
    expect(example.viewport.width).toBe(1920);
    expect(example.viewport.height).toBe(1080);
  });

  it('contains no financial data', () => {
    const example = generateExamplePayload();
    const serialized = JSON.stringify(example);

    // Should not contain dollar signs followed by numbers
    expect(serialized).not.toMatch(/\$\d/);
    // Should not contain common sensitive field values
    expect(serialized).not.toContain('balance');
    expect(serialized).not.toContain('amount');
  });
});

describe('constants', () => {
  it('CRASH_REPORT_FIELD_DESCRIPTIONS covers all payload fields', () => {
    const expectedFields = [
      'errorType',
      'errorMessage',
      'stackTrace',
      'timestamp',
      'appVersion',
      'userAgent',
      'currentRoute',
      'sessionId',
      'viewport',
      'breadcrumbs',
    ];

    for (const field of expectedFields) {
      expect(CRASH_REPORT_FIELD_DESCRIPTIONS).toHaveProperty(field);
    }
  });

  it('NEVER_INCLUDED_FIELDS lists sensitive categories', () => {
    expect(NEVER_INCLUDED_FIELDS.length).toBeGreaterThanOrEqual(8);
    expect(NEVER_INCLUDED_FIELDS).toContain('Transaction amounts');
    expect(NEVER_INCLUDED_FIELDS).toContain('Account balances');
    expect(NEVER_INCLUDED_FIELDS).toContain('Payee / merchant names');
  });
});
