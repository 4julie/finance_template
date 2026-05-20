// SPDX-License-Identifier: BUSL-1.1

/**
 * PDF text extraction types and field extraction patterns.
 *
 * This module defines interfaces for working with text extracted from
 * bank statement PDFs and provides pattern-based parsers for common
 * statement layouts.
 *
 * NOTE: Actual PDF binary parsing requires a library (e.g., pdf.js).
 * This module works with already-extracted text content.
 *
 * All monetary values are returned as integer cents.
 * Pure functions — no side effects, no file I/O.
 */

import { ImportError, ImportFormat, ImportResult, ParsedTransaction } from './types';
import { bankersRound } from './utils';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Configuration for extracting transactions from PDF text. */
export interface PdfExtractionConfig {
  /** Regex pattern for matching transaction lines. */
  readonly linePattern: RegExp;
  /** Named capture group for the date. */
  readonly dateGroup: string;
  /** Named capture group for the description. */
  readonly descriptionGroup: string;
  /** Named capture group for the amount (may include sign). */
  readonly amountGroup: string;
  /** Named capture group for the running balance, if available. */
  readonly balanceGroup?: string;
  /** Date format in the statement (e.g., "MM/DD"). */
  readonly dateFormat?: string;
  /** Year to assume when the statement only provides MM/DD dates. */
  readonly assumeYear?: number;
}

/** Detected statement metadata from PDF text. */
export interface StatementInfo {
  /** Account number (may be partially masked). */
  readonly accountNumber: string | null;
  /** Statement period start date (ISO 8601). */
  readonly periodStart: string | null;
  /** Statement period end date (ISO 8601). */
  readonly periodEnd: string | null;
  /** Opening balance in cents. */
  readonly openingBalanceCents: number | null;
  /** Closing balance in cents. */
  readonly closingBalanceCents: number | null;
  /** Institution name, if detected. */
  readonly institution: string | null;
}

// ---------------------------------------------------------------------------
// Pre-built extraction patterns for common banks
// ---------------------------------------------------------------------------

/**
 * Pre-built extraction configurations for common bank statement layouts.
 *
 * These patterns work on text extracted from PDF statements.
 * Each pattern uses named capture groups for reliable field extraction.
 */
export const COMMON_PATTERNS: Readonly<Record<string, PdfExtractionConfig>> = {
  /**
   * Generic pattern: DATE DESCRIPTION AMOUNT [BALANCE]
   * Matches lines like: "01/15 GROCERY STORE -45.67 1,234.56"
   */
  generic: {
    linePattern:
      /(?<date>\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(?<description>.+?)\s+(?<amount>-?[$]?[\d,]+\.\d{2})(?:\s+(?<balance>-?[$]?[\d,]+\.\d{2}))?$/,
    dateGroup: 'date',
    descriptionGroup: 'description',
    amountGroup: 'amount',
    balanceGroup: 'balance',
  },

  /**
   * Chase-style: DATE DESCRIPTION AMOUNT
   * Matches lines like: "01/15 CHASE DEBIT PURCHASE $45.67"
   */
  chase: {
    linePattern: /(?<date>\d{2}\/\d{2})\s+(?<description>.+?)\s+(?<amount>-?\$?[\d,]+\.\d{2})\s*$/,
    dateGroup: 'date',
    descriptionGroup: 'description',
    amountGroup: 'amount',
    dateFormat: 'MM/DD',
  },

  /**
   * Bank of America-style: DATE DATE DESCRIPTION AMOUNT BALANCE
   * (posting date and transaction date)
   */
  bofa: {
    linePattern:
      /(?<date>\d{2}\/\d{2}\/\d{2})\s+\d{2}\/\d{2}\/\d{2}\s+(?<description>.+?)\s+(?<amount>-?[\d,]+\.\d{2})\s+(?<balance>-?[\d,]+\.\d{2})/,
    dateGroup: 'date',
    descriptionGroup: 'description',
    amountGroup: 'amount',
    balanceGroup: 'balance',
    dateFormat: 'MM/DD/YY',
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract financial transactions from PDF-extracted text.
 *
 * @param text - Text content extracted from a bank statement PDF.
 * @param config - Extraction configuration with line patterns.
 * @returns An `ImportResult` with parsed transactions and any errors.
 */
export function parsePdfText(text: string, config: PdfExtractionConfig): ImportResult {
  const errors: ImportError[] = [];
  const transactions: ParsedTransaction[] = [];
  const lines = text.split(/\r?\n/);
  let totalMatches = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;

    const match = line.match(config.linePattern);
    if (!match?.groups) continue;

    totalMatches++;
    const lineNumber = i + 1;

    const rawDate = match.groups[config.dateGroup];
    const rawDescription = match.groups[config.descriptionGroup];
    const rawAmount = match.groups[config.amountGroup];
    const rawBalance = config.balanceGroup ? match.groups[config.balanceGroup] : null;

    // Parse date
    const date = parsePdfDate(rawDate, config.dateFormat, config.assumeYear);
    if (!date) {
      errors.push({
        line: lineNumber,
        message: `Unable to parse date: "${rawDate}"`,
        severity: 'error',
        rawValue: rawDate,
      });
      continue;
    }

    // Parse amount
    const amountCents = parsePdfAmount(rawAmount);
    if (amountCents === null) {
      errors.push({
        line: lineNumber,
        message: `Unable to parse amount: "${rawAmount}"`,
        severity: 'error',
        rawValue: rawAmount,
      });
      continue;
    }

    // Parse balance (optional)
    const balanceCents = rawBalance ? parsePdfAmount(rawBalance) : null;

    const rawFields: Record<string, string> = {
      line: line,
      date: rawDate,
      description: rawDescription,
      amount: rawAmount,
    };
    if (rawBalance) rawFields['balance'] = rawBalance;

    transactions.push({
      date,
      amountCents,
      description: rawDescription?.trim() || '',
      sourceId: null,
      category: null,
      checkNumber: null,
      type: null,
      memo: null,
      balanceCents,
      rawFields,
    });
  }

  if (totalMatches === 0) {
    errors.push({
      line: null,
      message: 'No transaction lines matched the extraction pattern',
      severity: 'warning',
      rawValue: null,
    });
  }

  return {
    format: ImportFormat.PDF_TEXT,
    transactions,
    errors,
    totalRecords: totalMatches,
    accountId: null,
    startDate: transactions.length > 0 ? transactions[0].date : null,
    endDate: transactions.length > 0 ? transactions[transactions.length - 1].date : null,
    currency: null,
  };
}

/**
 * Detect the statement period from PDF-extracted text.
 *
 * Searches for common patterns like "Statement Period: MM/DD/YYYY - MM/DD/YYYY"
 * or "Billing Period: ...".
 *
 * @param text - Text content from a PDF statement.
 * @returns Detected statement information, or null if nothing found.
 */
export function detectStatementInfo(text: string): StatementInfo | null {
  const accountNumber = extractAccountNumber(text);
  const period = extractStatementPeriod(text);
  const balances = extractBalances(text);
  const institution = detectInstitution(text);

  if (!accountNumber && !period && !balances && !institution) {
    return null;
  }

  return {
    accountNumber,
    periodStart: period?.start || null,
    periodEnd: period?.end || null,
    openingBalanceCents: balances?.opening ?? null,
    closingBalanceCents: balances?.closing ?? null,
    institution,
  };
}

/**
 * Auto-detect the best extraction config for a PDF text.
 *
 * Tries each pre-built pattern and returns the one that matches
 * the most transaction lines.
 *
 * @param text - Text content from a PDF statement.
 * @returns The best matching pattern name and config, or null.
 */
export function detectPdfPattern(
  text: string,
): { name: string; config: PdfExtractionConfig } | null {
  let bestName: string | null = null;
  let bestConfig: PdfExtractionConfig | null = null;
  let bestCount = 0;

  const lines = text.split(/\r?\n/);

  for (const [name, config] of Object.entries(COMMON_PATTERNS)) {
    const count = lines.filter((l) => config.linePattern.test(l.trim())).length;
    if (count > bestCount) {
      bestCount = count;
      bestName = name;
      bestConfig = config;
    }
  }

  if (bestName && bestConfig && bestCount > 0) {
    return { name: bestName, config: bestConfig };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parse a date from PDF text, handling partial dates (MM/DD without year).
 *
 * @param dateStr - Raw date string from the PDF.
 * @param format - Expected date format.
 * @param assumeYear - Year to use if not present in the date.
 * @returns ISO 8601 date string, or null.
 */
function parsePdfDate(dateStr: string, format?: string, assumeYear?: number): string | null {
  const cleaned = dateStr.trim();
  const year = assumeYear ?? new Date().getFullYear();

  // MM/DD format (no year)
  const shortMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const [, m, d] = shortMatch;
    return formatIsoDate(year, parseInt(m, 10), parseInt(d, 10));
  }

  // MM/DD/YY format
  const shortYearMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (shortYearMatch) {
    const [, m, d, y] = shortYearMatch;
    const fullYear = parseInt(y, 10) >= 70 ? 1900 + parseInt(y, 10) : 2000 + parseInt(y, 10);
    return formatIsoDate(fullYear, parseInt(m, 10), parseInt(d, 10));
  }

  // MM/DD/YYYY format
  const fullMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fullMatch) {
    const [, m, d, y] = fullMatch;
    return formatIsoDate(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10));
  }

  // YYYY-MM-DD format
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return formatIsoDate(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10));
  }

  // DD.MM.YYYY (European) — only when format hints it
  if (format?.startsWith('DD')) {
    const euroMatch = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (euroMatch) {
      const [, d, m, y] = euroMatch;
      return formatIsoDate(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10));
    }
  }

  return null;
}

/** Parse an amount string from PDF text into integer cents. */
function parsePdfAmount(amountStr: string): number | null {
  let cleaned = amountStr.trim();

  // Handle negative markers
  let negative = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    negative = true;
    cleaned = cleaned.slice(1, -1);
  } else if (cleaned.startsWith('-')) {
    negative = true;
    cleaned = cleaned.slice(1);
  }

  // Remove currency symbols and thousands separators
  cleaned = cleaned.replace(/[$€£¥,\s]/g, '');

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  const cents = bankersRound(num * 100);
  return negative ? -cents : cents;
}

/** Format components into ISO date string with validation. */
function formatIsoDate(year: number, month: number, day: number): string | null {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/** Extract account number from statement text. */
function extractAccountNumber(text: string): string | null {
  const patterns = [
    /account\s*(?:number|#|no\.?)\s*:?\s*([\d*X]{4,})/i,
    /acct\s*(?:#|no\.?)\s*:?\s*([\d*X]{4,})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Extract statement period dates from text. */
function extractStatementPeriod(text: string): { start: string | null; end: string | null } | null {
  const patterns = [
    /(?:statement|billing)\s+period\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:to|-|through)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /(?:from|begin(?:ning)?)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:to|-|through|end(?:ing)?)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        start: parsePdfDate(match[1]) || null,
        end: parsePdfDate(match[2]) || null,
      };
    }
  }
  return null;
}

/** Extract opening and closing balance amounts. */
function extractBalances(text: string): { opening: number | null; closing: number | null } | null {
  const openingPatterns = [/(?:opening|beginning|previous)\s+balance\s*:?\s*\$?([\d,]+\.\d{2})/i];
  const closingPatterns = [/(?:closing|ending|new)\s+balance\s*:?\s*\$?([\d,]+\.\d{2})/i];

  let opening: number | null = null;
  let closing: number | null = null;

  for (const pattern of openingPatterns) {
    const match = text.match(pattern);
    if (match) {
      opening = parsePdfAmount(match[1]);
      break;
    }
  }

  for (const pattern of closingPatterns) {
    const match = text.match(pattern);
    if (match) {
      closing = parsePdfAmount(match[1]);
      break;
    }
  }

  if (opening === null && closing === null) return null;
  return { opening, closing };
}

/** Detect the financial institution from text. */
function detectInstitution(text: string): string | null {
  const institutions: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /\bchase\b/i, name: 'Chase' },
    { pattern: /\bbank\s+of\s+america\b/i, name: 'Bank of America' },
    { pattern: /\bwells\s+fargo\b/i, name: 'Wells Fargo' },
    { pattern: /\bcitibank\b|\bciti\b/i, name: 'Citibank' },
    { pattern: /\bcapital\s+one\b/i, name: 'Capital One' },
    { pattern: /\busaa\b/i, name: 'USAA' },
    { pattern: /\bamerican\s+express\b|\bamex\b/i, name: 'American Express' },
    { pattern: /\bdiscover\b/i, name: 'Discover' },
  ];

  for (const { pattern, name } of institutions) {
    if (pattern.test(text)) return name;
  }

  return null;
}
