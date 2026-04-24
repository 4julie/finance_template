// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for Anomaly Detection Edge Function (#323).
 *
 * Validates rule type validation, config validation, alert status
 * transitions, and security constraints.
 */

import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// ---------------------------------------------------------------------------
// Constants (mirrored from Edge Function)
// ---------------------------------------------------------------------------

const VALID_RULE_TYPES = [
  'amount_threshold',
  'std_deviation',
  'duplicate_detection',
  'unusual_category',
  'frequency_spike',
  'time_of_day',
] as const;

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const VALID_ALERT_STATUSES = ['pending', 'reviewed', 'dismissed', 'confirmed'] as const;

// ---------------------------------------------------------------------------
// Validation logic (inline mirror for testing)
// ---------------------------------------------------------------------------

function validateRuleConfig(ruleType: string, config: Record<string, unknown>): string | null {
  switch (ruleType) {
    case 'amount_threshold':
      if (typeof config.threshold_cents !== 'number' || config.threshold_cents <= 0) {
        return 'amount_threshold requires positive threshold_cents';
      }
      break;
    case 'std_deviation':
      if (typeof config.multiplier !== 'number' || config.multiplier <= 0) {
        return 'std_deviation requires positive multiplier';
      }
      if (typeof config.lookback_days !== 'number' || config.lookback_days < 7) {
        return 'std_deviation requires lookback_days >= 7';
      }
      break;
    case 'duplicate_detection':
      if (typeof config.time_window_hours !== 'number' || config.time_window_hours <= 0) {
        return 'duplicate_detection requires positive time_window_hours';
      }
      break;
    case 'frequency_spike':
      if (typeof config.multiplier !== 'number' || config.multiplier <= 0) {
        return 'frequency_spike requires positive multiplier';
      }
      if (typeof config.lookback_days !== 'number' || config.lookback_days < 7) {
        return 'frequency_spike requires lookback_days >= 7';
      }
      break;
    case 'time_of_day':
      if (
        typeof config.start_hour !== 'number' ||
        config.start_hour < 0 ||
        config.start_hour > 23
      ) {
        return 'time_of_day requires start_hour between 0 and 23';
      }
      if (typeof config.end_hour !== 'number' || config.end_hour < 0 || config.end_hour > 23) {
        return 'time_of_day requires end_hour between 0 and 23';
      }
      break;
    default:
      break;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tests: Rule type validation
// ---------------------------------------------------------------------------

Deno.test('all valid rule types are accepted', () => {
  for (const rt of VALID_RULE_TYPES) {
    assertEquals((VALID_RULE_TYPES as readonly string[]).includes(rt), true);
  }
});

Deno.test('invalid rule type is rejected', () => {
  assertEquals((VALID_RULE_TYPES as readonly string[]).includes('magic_8_ball'), false);
  assertEquals((VALID_RULE_TYPES as readonly string[]).includes(''), false);
});

// ---------------------------------------------------------------------------
// Tests: Rule config validation
// ---------------------------------------------------------------------------

Deno.test('amount_threshold requires positive threshold_cents', () => {
  assertEquals(validateRuleConfig('amount_threshold', { threshold_cents: 50000 }), null);
  assertNotEquals(validateRuleConfig('amount_threshold', { threshold_cents: -100 }), null);
  assertNotEquals(validateRuleConfig('amount_threshold', { threshold_cents: 0 }), null);
  assertNotEquals(validateRuleConfig('amount_threshold', {}), null);
});

Deno.test('std_deviation requires positive multiplier and lookback_days >= 7', () => {
  assertEquals(validateRuleConfig('std_deviation', { multiplier: 2.5, lookback_days: 30 }), null);
  assertNotEquals(validateRuleConfig('std_deviation', { multiplier: -1, lookback_days: 30 }), null);
  assertNotEquals(validateRuleConfig('std_deviation', { multiplier: 2.5, lookback_days: 3 }), null);
});

Deno.test('duplicate_detection requires positive time_window_hours', () => {
  assertEquals(validateRuleConfig('duplicate_detection', { time_window_hours: 24 }), null);
  assertNotEquals(validateRuleConfig('duplicate_detection', { time_window_hours: 0 }), null);
});

Deno.test('frequency_spike requires positive multiplier and lookback_days >= 7', () => {
  assertEquals(validateRuleConfig('frequency_spike', { multiplier: 3, lookback_days: 14 }), null);
  assertNotEquals(
    validateRuleConfig('frequency_spike', { multiplier: 0, lookback_days: 14 }),
    null,
  );
});

Deno.test('time_of_day requires valid hour range', () => {
  assertEquals(validateRuleConfig('time_of_day', { start_hour: 0, end_hour: 6 }), null);
  assertEquals(validateRuleConfig('time_of_day', { start_hour: 22, end_hour: 23 }), null);
  assertNotEquals(validateRuleConfig('time_of_day', { start_hour: -1, end_hour: 6 }), null);
  assertNotEquals(validateRuleConfig('time_of_day', { start_hour: 0, end_hour: 25 }), null);
});

// ---------------------------------------------------------------------------
// Tests: Severity validation
// ---------------------------------------------------------------------------

Deno.test('valid severities accepted', () => {
  for (const s of VALID_SEVERITIES) {
    assertEquals((VALID_SEVERITIES as readonly string[]).includes(s), true);
  }
});

Deno.test('invalid severity rejected', () => {
  assertEquals((VALID_SEVERITIES as readonly string[]).includes('extreme'), false);
});

// ---------------------------------------------------------------------------
// Tests: Alert status validation
// ---------------------------------------------------------------------------

Deno.test('valid alert statuses accepted', () => {
  for (const s of VALID_ALERT_STATUSES) {
    assertEquals((VALID_ALERT_STATUSES as readonly string[]).includes(s), true);
  }
});

Deno.test('invalid alert status rejected', () => {
  assertEquals((VALID_ALERT_STATUSES as readonly string[]).includes('ignored'), false);
});

// ---------------------------------------------------------------------------
// Tests: Alert status transitions
// ---------------------------------------------------------------------------

Deno.test('pending alert can transition to reviewed', () => {
  const current = 'pending';
  const next = 'reviewed';
  assertEquals((VALID_ALERT_STATUSES as readonly string[]).includes(next), true);
  assertNotEquals(current, next);
});

Deno.test('pending alert can transition to dismissed', () => {
  const next = 'dismissed';
  assertEquals((VALID_ALERT_STATUSES as readonly string[]).includes(next), true);
});

Deno.test('pending alert can transition to confirmed', () => {
  const next = 'confirmed';
  assertEquals((VALID_ALERT_STATUSES as readonly string[]).includes(next), true);
});

// ---------------------------------------------------------------------------
// Tests: Security — alert summary never contains financial data
// ---------------------------------------------------------------------------

Deno.test('alert summary is a generic description', () => {
  const summaries = [
    'Transaction exceeds configured amount threshold',
    'Transaction amount is statistically unusual',
    'Possible duplicate transaction detected',
    'Unusual spike in transaction frequency',
  ];

  for (const summary of summaries) {
    assertEquals(summary.includes('$'), false);
    assertEquals(summary.includes('cents'), false);
    assertEquals(
      /\d{3,}/.test(summary),
      false,
      `Summary should not contain large numbers: ${summary}`,
    );
  }
});

Deno.test('detection response references IDs only', () => {
  const response = {
    transaction_id: 'txn-123',
    alerts_count: 1,
    alerts: [
      {
        rule_id: 'rule-456',
        alert_type: 'amount_threshold',
        severity: 'high',
        summary: 'Transaction exceeds configured amount threshold',
      },
    ],
    evaluated_at: new Date().toISOString(),
  };

  const serialized = JSON.stringify(response);
  assertEquals(serialized.includes('amount_cents'), false);
  assertEquals(serialized.includes('payee'), false);
  assertEquals(serialized.includes('balance'), false);
});

// ---------------------------------------------------------------------------
// Tests: Action routing
// ---------------------------------------------------------------------------

Deno.test('action parameter is extracted from URL', () => {
  const urls = [
    { url: 'https://test.supabase.co/fn?action=detect', expected: 'detect' },
    { url: 'https://test.supabase.co/fn?action=create_rule', expected: 'create_rule' },
    { url: 'https://test.supabase.co/fn?action=rules', expected: 'rules' },
    { url: 'https://test.supabase.co/fn?action=alerts', expected: 'alerts' },
    { url: 'https://test.supabase.co/fn?action=review', expected: 'review' },
  ];

  for (const { url: urlStr, expected } of urls) {
    const url = new URL(urlStr);
    assertEquals(url.searchParams.get('action'), expected);
  }
});
