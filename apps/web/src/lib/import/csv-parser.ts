// SPDX-License-Identifier: BUSL-1.1

/**
 * Financial CSV parser with flexible column mapping, date format detection,
 * and amount sign convention handling.
 *
 * Builds on top of the generic CSV parser (`../csv-parser.ts`) and maps
 * rows into `ParsedTransaction` objects suitable for import.
 *
 * All monetary values are returned as integer cents.
 * Pure functions — no side effects, no database access.
 */

import { parseCsv } from '../csv-parser';
import {
  AmountConvention,
  CsvImportOptions,
  FieldMapping,
  ImportError,
  ImportFormat,
  ImportResult,
  ParsedTransaction,
} from './types';
import { bankersRound } from './utils';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a CSV string containing financial transactions.
 *
 * @param content - Raw CSV text content.
 * @param options - Column mapping and format options.
 * @returns An `ImportResult` with parsed transactions and any errors.
 */
export function parseCsvTransactions(content: string, options: CsvImportOptions): ImportResult {
  const { rows, headers } = parseCsv(content, {
    hasHeader: options.hasHeader ?? true,
    delimiter: options.delimiter,
  });

  const transactions: ParsedTransaction[] = [];
  const errors: ImportError[] = [];
  const convention = options.amountConvention ?? 'signed';

  for (let i = 0; i < rows.length; i++) {
    const lineNumber = i + (options.hasHeader !== false ? 2 : 1); // 1-based, account for header
    const row = rows[i];

    try {
      const rawFields = buildRawFields(headers, row);
      const dateStr = resolveField(row, headers, options.mapping.date);
      const description = resolveField(row, headers, options.mapping.description);

      if (!dateStr) {
        errors.push({
          line: lineNumber,
          message: 'Missing date value',
          severity: 'error',
          rawValue: null,
        });
        continue;
      }

      const parsedDate = parseDate(dateStr, options.dateFormat);
      if (!parsedDate) {
        errors.push({
          line: lineNumber,
          message: `Unable to parse date: "${dateStr}"`,
          severity: 'error',
          rawValue: dateStr,
        });
        continue;
      }

      const amountCents = parseAmount(row, headers, options.mapping, convention);
      if (amountCents === null) {
        errors.push({
          line: lineNumber,
          message: 'Unable to parse amount',
          severity: 'error',
          rawValue: null,
        });
        continue;
      }

      const category = options.mapping.category
        ? resolveField(row, headers, options.mapping.category) || null
        : null;

      const checkNumber = options.mapping.checkNumber
        ? resolveField(row, headers, options.mapping.checkNumber) || null
        : null;

      const memo = options.mapping.memo
        ? resolveField(row, headers, options.mapping.memo) || null
        : null;

      const balanceStr = options.mapping.balance
        ? resolveField(row, headers, options.mapping.balance)
        : null;

      const balanceCents = balanceStr ? parseCurrencyToCents(balanceStr) : null;

      transactions.push({
        date: parsedDate,
        amountCents,
        description: description || '',
        sourceId: null,
        category,
        checkNumber,
        type: null,
        memo,
        balanceCents,
        rawFields,
      });
    } catch {
      errors.push({
        line: lineNumber,
        message: 'Unexpected error parsing row',
        severity: 'error',
        rawValue: row.join(','),
      });
    }
  }

  return {
    format: ImportFormat.CSV,
    transactions,
    errors,
    totalRecords: rows.length,
    accountId: null,
    startDate: transactions.length > 0 ? transactions[0].date : null,
    endDate: transactions.length > 0 ? transactions[transactions.length - 1].date : null,
    currency: null,
  };
}

/**
 * Auto-detect the date format used in a set of date strings.
 *
 * Examines sample values to determine whether dates use MM/DD/YYYY,
 * DD/MM/YYYY, YYYY-MM-DD, or other common patterns.
 *
 * @param samples - Array of date string samples to analyze.
 * @returns The detected date format pattern, or null if inconclusive.
 */
export function detectDateFormat(samples: readonly string[]): string | null {
  if (samples.length === 0) return null;

  const patterns: Array<{ pattern: RegExp; format: string }> = [
    { pattern: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD' },
    { pattern: /^\d{2}\/\d{2}\/\d{4}$/, format: 'MM/DD/YYYY' },
    { pattern: /^\d{2}-\d{2}-\d{4}$/, format: 'MM-DD-YYYY' },
    { pattern: /^\d{2}\.\d{2}\.\d{4}$/, format: 'DD.MM.YYYY' },
    { pattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/, format: 'M/D/YYYY' },
    { pattern: /^\d{1,2}\/\d{1,2}\/\d{2}$/, format: 'M/D/YY' },
  ];

  for (const { pattern, format } of patterns) {
    const matches = samples.filter((s) => pattern.test(s.trim())).length;
    if (matches >= samples.length * 0.8) {
      // Disambiguate MM/DD vs DD/MM when both are plausible
      if (format === 'MM/DD/YYYY' || format === 'M/D/YYYY') {
        const couldBeDayFirst = samples.every((s) => {
          const parts = s.trim().split('/');
          const first = parseInt(parts[0], 10);
          const second = parseInt(parts[1], 10);
          return first <= 12 && second <= 31;
        });
        const mustBeMonthFirst = samples.some((s) => {
          const parts = s.trim().split('/');
          const second = parseInt(parts[1], 10);
          return second > 12;
        });
        if (mustBeMonthFirst) return format;
        if (!couldBeDayFirst) return format.replace('MM', 'DD').replace('DD', 'MM');
      }
      return format;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a field value from a CSV row by column name or index.
 *
 * @param row - The parsed CSV row values.
 * @param headers - Column headers (may be empty if no header row).
 * @param field - Column name (string) or 0-based index (number).
 * @returns The cell value, or undefined if not found.
 */
function resolveField(
  row: readonly string[],
  headers: readonly string[],
  field: string | number,
): string | undefined {
  if (typeof field === 'number') {
    return row[field];
  }
  const index = headers.findIndex((h) => h.toLowerCase() === field.toLowerCase());
  return index >= 0 ? row[index] : undefined;
}

/**
 * Parse an amount from a CSV row based on the configured convention.
 *
 * @returns Amount in integer cents, or null if parsing fails.
 */
function parseAmount(
  row: readonly string[],
  headers: readonly string[],
  mapping: FieldMapping,
  convention: AmountConvention,
): number | null {
  switch (convention) {
    case 'signed': {
      const raw = mapping.amount != null ? resolveField(row, headers, mapping.amount) : undefined;
      if (!raw) return null;
      return parseCurrencyToCents(raw);
    }

    case 'debit_credit': {
      const debitRaw =
        mapping.debit != null ? resolveField(row, headers, mapping.debit) : undefined;
      const creditRaw =
        mapping.credit != null ? resolveField(row, headers, mapping.credit) : undefined;
      const debitCents = debitRaw ? parseCurrencyToCents(debitRaw) : null;
      const creditCents = creditRaw ? parseCurrencyToCents(creditRaw) : null;

      if (debitCents != null && debitCents !== 0) {
        return -Math.abs(debitCents);
      }
      if (creditCents != null && creditCents !== 0) {
        return Math.abs(creditCents);
      }
      // Both empty/zero — treat as zero
      if (debitRaw != null || creditRaw != null) return 0;
      return null;
    }

    case 'inverted': {
      const raw = mapping.amount != null ? resolveField(row, headers, mapping.amount) : undefined;
      if (!raw) return null;
      const cents = parseCurrencyToCents(raw);
      return cents !== null ? -cents : null;
    }

    default:
      return null;
  }
}

/**
 * Parse a currency string into integer cents.
 *
 * Handles currency symbols, thousands separators, parentheses for negatives,
 * and both period and comma decimal separators.
 *
 * Uses Banker's rounding (round half to even) for fractional cents.
 *
 * @param value - Raw currency string (e.g., "$1,234.56", "(45.00)", "€1.234,56").
 * @returns Integer cents, or null if the value cannot be parsed.
 */
export function parseCurrencyToCents(value: string): number | null {
  if (!value || value.trim().length === 0) return null;

  let cleaned = value.trim();

  // Detect negative: parentheses or leading minus
  let negative = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    negative = true;
    cleaned = cleaned.slice(1, -1).trim();
  } else if (cleaned.startsWith('-')) {
    negative = true;
    cleaned = cleaned.slice(1).trim();
  }

  // Remove currency symbols and whitespace
  cleaned = cleaned.replace(/[$€£¥₹\s]/g, '');

  if (cleaned.length === 0) return null;

  // Determine decimal separator: if there's a comma after the last period,
  // or only a comma and it has exactly 2 digits after it, comma is decimal.
  let decimalSep = '.';
  const lastComma = cleaned.lastIndexOf(',');
  const lastPeriod = cleaned.lastIndexOf('.');

  if (lastComma > lastPeriod) {
    // Comma is after period — European format (1.234,56)
    decimalSep = ',';
  } else if (lastPeriod < 0 && lastComma >= 0) {
    // Only comma present — check if it could be a decimal
    const afterComma = cleaned.slice(lastComma + 1);
    if (afterComma.length <= 2 && /^\d+$/.test(afterComma)) {
      decimalSep = ',';
    }
  }

  // Remove thousands separators
  if (decimalSep === '.') {
    cleaned = cleaned.replace(/,/g, '');
  } else {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  const rawCents = num * 100;
  const cents = bankersRound(rawCents);

  return negative ? -cents : cents;
}

/**
 * Parse a date string into ISO 8601 format (YYYY-MM-DD).
 *
 * @param dateStr - Raw date string from the CSV.
 * @param format - Expected date format pattern. Auto-detected if omitted.
 * @returns ISO 8601 date string, or null if parsing fails.
 */
export function parseDate(dateStr: string, format?: string): string | null {
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [datePart] = trimmed.split(/[T\s]/);
    return validateDate(datePart) ? datePart : null;
  }

  // Format-specific parsing
  if (format) {
    return parseDateWithFormat(trimmed, format);
  }

  // Auto-detect common formats
  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    const year = y.length === 2 ? expandTwoDigitYear(parseInt(y, 10)) : parseInt(y, 10);
    const result = formatIsoDate(year, parseInt(m, 10), parseInt(d, 10));
    return validateDate(result) ? result : null;
  }

  // DD.MM.YYYY
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, d, m, y] = dotMatch;
    const result = formatIsoDate(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10));
    return validateDate(result) ? result : null;
  }

  // MM-DD-YYYY
  const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, m, d, y] = dashMatch;
    const result = formatIsoDate(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10));
    return validateDate(result) ? result : null;
  }

  return null;
}

/** Parse a date string using a known format pattern. */
function parseDateWithFormat(dateStr: string, format: string): string | null {
  const sep = format.includes('/') ? '/' : format.includes('.') ? '.' : '-';
  const parts = dateStr.split(sep);
  const formatParts = format.split(sep);

  if (parts.length !== formatParts.length) return null;

  let year = 0,
    month = 0,
    day = 0;

  for (let i = 0; i < formatParts.length; i++) {
    const fp = formatParts[i].toUpperCase();
    const val = parseInt(parts[i], 10);
    if (isNaN(val)) return null;

    if (fp.startsWith('Y')) {
      year = fp.length === 2 ? expandTwoDigitYear(val) : val;
    } else if (fp.startsWith('M')) {
      month = val;
    } else if (fp.startsWith('D')) {
      day = val;
    }
  }

  const result = formatIsoDate(year, month, day);
  return validateDate(result) ? result : null;
}

/** Expand a 2-digit year to 4 digits (pivot at 70). */
function expandTwoDigitYear(twoDigit: number): number {
  return twoDigit >= 70 ? 1900 + twoDigit : 2000 + twoDigit;
}

/** Format year/month/day as YYYY-MM-DD. */
function formatIsoDate(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/** Validate that a YYYY-MM-DD string represents a real date. */
function validateDate(isoDate: string): boolean {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Build a raw fields map from headers and row values. */
function buildRawFields(
  headers: readonly string[],
  row: readonly string[],
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (let i = 0; i < row.length; i++) {
    const key = i < headers.length ? headers[i] : `col_${i}`;
    fields[key] = row[i];
  }
  return fields;
}
