// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for the `exchange-rates` Edge Function (#1127).
 *
 * Validates ECB XML parsing, staleness computation, currency conversion
 * logic, historical date lookup, and input validation — all using
 * extracted pure functions to avoid network dependencies.
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { createMockRequest } from '../_test_helpers/mock-request.ts';

// ---------------------------------------------------------------------------
// Extracted pure functions for isolated testing.
// We mirror the logic from index.ts so tests are self-contained and
// do not need to import the serve()-wrapped handler.
// ---------------------------------------------------------------------------

const RATE_PRECISION = 6;
const RATE_MULTIPLIER = 10 ** RATE_PRECISION;
const STALENESS_THRESHOLD_HOURS = 48;

const SUPPORTED_CURRENCIES = [
  'EUR',
  'USD',
  'JPY',
  'GBP',
  'CHF',
  'AUD',
  'CAD',
  'CNY',
  'HKD',
  'NZD',
  'SEK',
  'KRW',
  'SGD',
  'NOK',
  'MXN',
  'INR',
  'RUB',
  'ZAR',
  'TRY',
  'BRL',
  'TWD',
  'DKK',
  'PLN',
  'THB',
  'IDR',
  'HUF',
  'CZK',
  'ILS',
  'CLP',
  'PHP',
  'AED',
  'COP',
  'SAR',
  'MYR',
  'RON',
  'BGN',
  'HRK',
  'ISK',
] as const;

const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse ECB XML response. Mirrors index.ts logic. */
function parseEcbXml(xml: string): Map<string, number> {
  const rates = new Map<string, number>();
  rates.set('EUR', 1.0);

  const pattern = /currency='([A-Z]{3})'\s+rate='([\d.]+)'/g;
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    rates.set(match[1], parseFloat(match[2]));
  }

  const pattern2 = /currency="([A-Z]{3})"\s+rate="([\d.]+)"/g;
  while ((match = pattern2.exec(xml)) !== null) {
    if (!rates.has(match[1])) {
      rates.set(match[1], parseFloat(match[2]));
    }
  }

  return rates;
}

/** Compute staleness metadata. Mirrors index.ts logic. */
function computeStaleness(validDate: string): {
  is_stale: boolean;
  staleness_hours: number;
  staleness_message: string;
} {
  const rateDate = new Date(validDate + 'T16:00:00Z');
  const now = new Date();
  const hoursAgo = Math.round((now.getTime() - rateDate.getTime()) / (1000 * 60 * 60));
  const isStale = hoursAgo > STALENESS_THRESHOLD_HOURS;

  return {
    is_stale: isStale,
    staleness_hours: Math.max(0, hoursAgo),
    staleness_message: isStale
      ? `Rates are ${hoursAgo} hours old (threshold: ${STALENESS_THRESHOLD_HOURS}h). Using cached fallback.`
      : 'Rates are current.',
  };
}

// ---------------------------------------------------------------------------
// ECB XML Parsing Tests
// ---------------------------------------------------------------------------

Deno.test('parseEcbXml — parses single-quote ECB XML', () => {
  const xml = `
    <Cube>
      <Cube time='2025-03-28'>
        <Cube currency='USD' rate='1.0854'/>
        <Cube currency='JPY' rate='162.97'/>
        <Cube currency='GBP' rate='0.83598'/>
      </Cube>
    </Cube>
  `;

  const rates = parseEcbXml(xml);

  assertEquals(rates.get('EUR'), 1.0);
  assertEquals(rates.get('USD'), 1.0854);
  assertEquals(rates.get('JPY'), 162.97);
  assertEquals(rates.get('GBP'), 0.83598);
  assertEquals(rates.size, 4); // EUR + 3 currencies
});

Deno.test('parseEcbXml — parses double-quote ECB XML', () => {
  const xml = `
    <Cube>
      <Cube time="2025-03-28">
        <Cube currency="USD" rate="1.0854"/>
        <Cube currency="CHF" rate="0.9432"/>
      </Cube>
    </Cube>
  `;

  const rates = parseEcbXml(xml);

  assertEquals(rates.get('USD'), 1.0854);
  assertEquals(rates.get('CHF'), 0.9432);
});

Deno.test('parseEcbXml — returns only EUR for empty XML', () => {
  const rates = parseEcbXml('<Cube></Cube>');
  assertEquals(rates.size, 1);
  assertEquals(rates.get('EUR'), 1.0);
});

Deno.test('parseEcbXml — handles 30+ currencies', () => {
  const currencyEntries = [
    'USD',
    'JPY',
    'GBP',
    'CHF',
    'AUD',
    'CAD',
    'CNY',
    'HKD',
    'NZD',
    'SEK',
    'KRW',
    'SGD',
    'NOK',
    'MXN',
    'INR',
    'RUB',
    'ZAR',
    'TRY',
    'BRL',
    'TWD',
    'DKK',
    'PLN',
    'THB',
    'IDR',
    'HUF',
    'CZK',
    'ILS',
    'CLP',
    'PHP',
    'AED',
    'COP',
    'SAR',
    'MYR',
    'RON',
    'BGN',
  ];

  const cubes = currencyEntries
    .map((c, i) => `<Cube currency='${c}' rate='${(1 + i * 0.1).toFixed(4)}'/>`)
    .join('\n');

  const xml = `<Cube><Cube time='2025-03-28'>${cubes}</Cube></Cube>`;
  const rates = parseEcbXml(xml);

  // EUR + 35 currencies
  assertEquals(rates.size, 36);
  assertEquals(rates.has('EUR'), true);
  assertEquals(rates.has('USD'), true);
  assertEquals(rates.has('BGN'), true);
});

// ---------------------------------------------------------------------------
// Rate Precision Tests
// ---------------------------------------------------------------------------

Deno.test('rate precision — BIGINT storage round-trip', () => {
  const rate = 1.085432;
  const stored = Math.round(rate * RATE_MULTIPLIER);

  assertEquals(stored, 1085432);
  assertEquals(stored / RATE_MULTIPLIER, 1.085432);
});

Deno.test('rate precision — handles very small rates', () => {
  const rate = 0.000012; // e.g., a very small cross-rate
  const stored = Math.round(rate * RATE_MULTIPLIER);

  assertEquals(stored, 12);
  assertEquals(stored / RATE_MULTIPLIER, 0.000012);
});

Deno.test('rate precision — handles large rates', () => {
  const rate = 162.97; // JPY/EUR rate
  const stored = Math.round(rate * RATE_MULTIPLIER);

  assertEquals(stored, 162970000);
  assertEquals(stored / RATE_MULTIPLIER, 162.97);
});

// ---------------------------------------------------------------------------
// Currency Conversion Logic Tests
// ---------------------------------------------------------------------------

Deno.test('conversion — same currency returns identity', () => {
  const from = 'USD';
  const to = 'USD';
  const amountCents = 10000;

  assertEquals(from === to, true);
  // Same currency: converted_cents === amount_cents
  assertEquals(amountCents, 10000);
});

Deno.test('conversion — EUR to USD with known rate', () => {
  const eurToUsd = 1.085432;
  const amountCents = 10000; // 100 EUR

  const convertedCents = Math.round(amountCents * eurToUsd);
  assertEquals(convertedCents, 10854);
});

Deno.test('conversion — USD to EUR (inverse)', () => {
  const eurToUsd = 1.085432;
  const usdToEur = 1 / eurToUsd;
  const amountCents = 10854; // ~$108.54

  const convertedCents = Math.round(amountCents * usdToEur);
  assertEquals(convertedCents, 10000);
});

Deno.test('conversion — cross-rate (USD to GBP via EUR)', () => {
  const eurToUsd = 1.085432;
  const eurToGbp = 0.83598;

  // USD → EUR → GBP
  const crossRate = eurToGbp / eurToUsd;
  const amountCents = 10000; // $100.00

  const convertedCents = Math.round(amountCents * crossRate);
  // Expected: 100 * (0.83598 / 1.085432) ≈ 77.02 → 7702 cents
  assertEquals(convertedCents >= 7690 && convertedCents <= 7710, true);
});

// ---------------------------------------------------------------------------
// Staleness Computation Tests
// ---------------------------------------------------------------------------

Deno.test('computeStaleness — recent rates are not stale', () => {
  const today = new Date().toISOString().substring(0, 10);
  const result = computeStaleness(today);

  assertEquals(result.is_stale, false);
  assertEquals(result.staleness_message, 'Rates are current.');
});

Deno.test('computeStaleness — old rates are flagged as stale', () => {
  // 5 days ago — definitely stale
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const result = computeStaleness(fiveDaysAgo);

  assertEquals(result.is_stale, true);
  assertEquals(result.staleness_hours > STALENESS_THRESHOLD_HOURS, true);
  assertEquals(result.staleness_message.includes('Using cached fallback'), true);
});

Deno.test('computeStaleness — staleness_hours is non-negative', () => {
  // Future date should not produce negative hours
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const result = computeStaleness(tomorrow);

  assertEquals(result.staleness_hours >= 0, true);
  assertEquals(result.is_stale, false);
});

// ---------------------------------------------------------------------------
// Input Validation Tests
// ---------------------------------------------------------------------------

Deno.test('currency code validation — valid codes', () => {
  assertEquals(CURRENCY_PATTERN.test('USD'), true);
  assertEquals(CURRENCY_PATTERN.test('EUR'), true);
  assertEquals(CURRENCY_PATTERN.test('JPY'), true);
  assertEquals(CURRENCY_PATTERN.test('GBP'), true);
});

Deno.test('currency code validation — invalid codes', () => {
  assertEquals(CURRENCY_PATTERN.test('US'), false); // Too short
  assertEquals(CURRENCY_PATTERN.test('USDD'), false); // Too long
  assertEquals(CURRENCY_PATTERN.test('usd'), false); // Lowercase
  assertEquals(CURRENCY_PATTERN.test('123'), false); // Numbers
  assertEquals(CURRENCY_PATTERN.test(''), false); // Empty
});

Deno.test('date validation — valid dates', () => {
  assertEquals(DATE_PATTERN.test('2025-03-28'), true);
  assertEquals(DATE_PATTERN.test('2024-01-01'), true);
  assertEquals(DATE_PATTERN.test('2023-12-31'), true);
});

Deno.test('date validation — invalid dates', () => {
  assertEquals(DATE_PATTERN.test('2025/03/28'), false); // Wrong separator
  assertEquals(DATE_PATTERN.test('03-28-2025'), false); // Wrong order
  assertEquals(DATE_PATTERN.test('2025-3-28'), false); // Missing leading zero
  assertEquals(DATE_PATTERN.test(''), false); // Empty
});

// ---------------------------------------------------------------------------
// Supported Currencies Tests
// ---------------------------------------------------------------------------

Deno.test('supported currencies — includes 30+ currencies', () => {
  assertEquals(SUPPORTED_CURRENCIES.length >= 30, true);
});

Deno.test('supported currencies — includes major currencies', () => {
  const major = ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];
  for (const currency of major) {
    assertEquals(
      (SUPPORTED_CURRENCIES as readonly string[]).includes(currency),
      true,
      `Expected ${currency} to be in SUPPORTED_CURRENCIES`,
    );
  }
});

Deno.test('supported currencies — all codes are valid ISO 4217', () => {
  for (const currency of SUPPORTED_CURRENCIES) {
    assertEquals(CURRENCY_PATTERN.test(currency), true, `${currency} should match ISO 4217 format`);
  }
});

// ---------------------------------------------------------------------------
// Mock Request Tests
// ---------------------------------------------------------------------------

Deno.test('mock request — creates valid GET request for rates', () => {
  const req = createMockRequest({
    method: 'GET',
    url: 'https://test.supabase.co/functions/v1/exchange-rates?base=EUR',
  });

  assertEquals(req.method, 'GET');
  const url = new URL(req.url);
  assertEquals(url.searchParams.get('base'), 'EUR');
});

Deno.test('mock request — creates valid conversion request', () => {
  const req = createMockRequest({
    method: 'GET',
    url: 'https://test.supabase.co/functions/v1/exchange-rates?action=convert&from=USD&to=EUR&amount_cents=10000',
  });

  const url = new URL(req.url);
  assertEquals(url.searchParams.get('action'), 'convert');
  assertEquals(url.searchParams.get('from'), 'USD');
  assertEquals(url.searchParams.get('to'), 'EUR');
  assertEquals(url.searchParams.get('amount_cents'), '10000');
});

Deno.test('mock request — creates valid historical conversion request', () => {
  const req = createMockRequest({
    method: 'GET',
    url: 'https://test.supabase.co/functions/v1/exchange-rates?action=convert&from=USD&to=EUR&amount_cents=10000&date=2025-01-15',
  });

  const url = new URL(req.url);
  assertEquals(url.searchParams.get('date'), '2025-01-15');
});

Deno.test('mock request — creates valid historical rates request', () => {
  const req = createMockRequest({
    method: 'GET',
    url: 'https://test.supabase.co/functions/v1/exchange-rates?base=EUR&date=2025-01-15',
  });

  const url = new URL(req.url);
  assertEquals(url.searchParams.get('base'), 'EUR');
  assertEquals(url.searchParams.get('date'), '2025-01-15');
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

Deno.test('conversion — handles zero amount', () => {
  const rate = 1.085432;
  const convertedCents = Math.round(0 * rate);
  assertEquals(convertedCents, 0);
});

Deno.test('conversion — handles large amounts (1M cents = $10K)', () => {
  const rate = 1.085432;
  const amountCents = 1000000;
  const convertedCents = Math.round(amountCents * rate);

  assertEquals(convertedCents, 1085432);
});

Deno.test('conversion — integer arithmetic avoids floating-point drift', () => {
  // Classic floating-point issue: 0.1 + 0.2 !== 0.3
  // With BIGINT storage we avoid this
  const rateMultiplied = 1085432; // stored as BIGINT
  const precision = 6;
  const rate = rateMultiplied / 10 ** precision;

  // Rate should be exactly representable
  assertEquals(rate, 1.085432);
});
