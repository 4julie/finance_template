// SPDX-License-Identifier: BUSL-1.1

/**
 * Shared types for the financial data import and reconciliation engine.
 *
 * All monetary values are represented as integer cents to avoid
 * floating-point precision issues.
 */

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/** Supported file import formats. */
export enum ImportFormat {
  CSV = 'CSV',
  OFX = 'OFX',
  QIF = 'QIF',
  QFX = 'QFX',
  PDF_TEXT = 'PDF_TEXT',
}

/** Result of auto-detecting a file's format from its content. */
export interface FormatDetectionResult {
  /** The detected format. */
  readonly format: ImportFormat;
  /** Confidence score from 0 to 100. */
  readonly confidence: number;
  /** Human-readable reason the format was chosen. */
  readonly reason: string;
}

// ---------------------------------------------------------------------------
// Parsed transactions
// ---------------------------------------------------------------------------

/** A single transaction extracted from an imported file. */
export interface ParsedTransaction {
  /** ISO 8601 date string (YYYY-MM-DD). */
  readonly date: string;
  /** Transaction amount in integer cents (negative = outflow). */
  readonly amountCents: number;
  /** Payee or description text. */
  readonly description: string;
  /** Unique ID from the source file (e.g., OFX FITID), if available. */
  readonly sourceId: string | null;
  /** Category from the source file, if available. */
  readonly category: string | null;
  /** Check number, if available. */
  readonly checkNumber: string | null;
  /** Transaction type hint from the source (e.g., DEBIT, CREDIT, CHECK). */
  readonly type: string | null;
  /** Memo or note field, if available. */
  readonly memo: string | null;
  /** Running balance after this transaction in integer cents, if available. */
  readonly balanceCents: number | null;
  /** Raw fields from the source for debugging/auditing. */
  readonly rawFields: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// Import results & errors
// ---------------------------------------------------------------------------

/** Severity level for import issues. */
export type ImportErrorSeverity = 'error' | 'warning' | 'info';

/** A single error or warning encountered during import parsing. */
export interface ImportError {
  /** 1-based line/record number where the issue occurred, or null if global. */
  readonly line: number | null;
  /** Human-readable description of the issue. */
  readonly message: string;
  /** Severity of the issue. */
  readonly severity: ImportErrorSeverity;
  /** The problematic raw value, if applicable. */
  readonly rawValue: string | null;
}

/** Complete result of parsing a financial data file. */
export interface ImportResult {
  /** The format that was parsed. */
  readonly format: ImportFormat;
  /** Successfully parsed transactions. */
  readonly transactions: readonly ParsedTransaction[];
  /** Errors and warnings encountered during parsing. */
  readonly errors: readonly ImportError[];
  /** Total number of records found in the source (before filtering). */
  readonly totalRecords: number;
  /** Account identifier from the source file, if available. */
  readonly accountId: string | null;
  /** Statement start date (ISO 8601) from the source, if available. */
  readonly startDate: string | null;
  /** Statement end date (ISO 8601) from the source, if available. */
  readonly endDate: string | null;
  /** Currency code from the source (e.g., "USD"), if available. */
  readonly currency: string | null;
}

// ---------------------------------------------------------------------------
// CSV field mapping
// ---------------------------------------------------------------------------

/** Describes how CSV columns map to ParsedTransaction fields. */
export interface FieldMapping {
  /** Column name or 0-based index for the transaction date. */
  readonly date: string | number;
  /** Column name or index for the amount (signed convention). */
  readonly amount?: string | number;
  /** Column name or index for debit amounts (always positive in source). */
  readonly debit?: string | number;
  /** Column name or index for credit amounts (always positive in source). */
  readonly credit?: string | number;
  /** Column name or index for the description/payee. */
  readonly description: string | number;
  /** Column name or index for the category. */
  readonly category?: string | number;
  /** Column name or index for the check number. */
  readonly checkNumber?: string | number;
  /** Column name or index for the memo. */
  readonly memo?: string | number;
  /** Column name or index for the running balance. */
  readonly balance?: string | number;
}

/** How amounts are represented in the CSV. */
export type AmountConvention =
  /** A single column with signed values (negative = debit). */
  | 'signed'
  /** Separate debit and credit columns (both positive). */
  | 'debit_credit'
  /** A single column where debits are positive (inverted from our convention). */
  | 'inverted';

/** Options for parsing a CSV file as financial transactions. */
export interface CsvImportOptions {
  /** Column mapping configuration. */
  readonly mapping: FieldMapping;
  /** How amounts are represented. @default 'signed' */
  readonly amountConvention?: AmountConvention;
  /** Expected date format pattern (e.g., "MM/DD/YYYY"). Auto-detected if omitted. */
  readonly dateFormat?: string;
  /** Whether to skip the header row. @default true */
  readonly hasHeader?: boolean;
  /** CSV delimiter character. Auto-detected if omitted. */
  readonly delimiter?: string;
}

// ---------------------------------------------------------------------------
// Banker's rounding utility type
// ---------------------------------------------------------------------------

/**
 * Result of a rounding operation.
 * Captures both the rounded value and any remainder for auditing.
 */
export interface RoundingResult {
  /** The rounded integer cents value. */
  readonly cents: number;
  /** The fractional cents that were discarded (for audit trails). */
  readonly remainder: number;
}
