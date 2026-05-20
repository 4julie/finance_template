// SPDX-License-Identifier: BUSL-1.1

/**
 * Auto-detects financial file formats from content analysis.
 *
 * Uses magic bytes, header patterns, and structural analysis to
 * determine the most likely format with a confidence score.
 *
 * Pure function — no side effects, no file I/O.
 */

import { FormatDetectionResult, ImportFormat } from './types';

/** Mutable version of FormatDetectionResult for internal processing. */
interface MutableDetectionResult {
  format: ImportFormat;
  confidence: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect the import format of a financial data file from its text content.
 *
 * Analyzes magic bytes, XML structure, header patterns, and line structure
 * to determine the format. Returns a confidence score (0–100) indicating
 * how certain the detection is.
 *
 * @param content - The raw text content of the file.
 * @param fileName - Optional file name (used for extension hint).
 * @returns The detected format with confidence score and reasoning.
 */
export function detectFormat(content: string, fileName?: string): FormatDetectionResult {
  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { format: ImportFormat.CSV, confidence: 0, reason: 'Empty content; defaulting to CSV' };
  }

  const candidates: MutableDetectionResult[] = [
    detectOfx(trimmed),
    detectQfx(trimmed),
    detectQif(trimmed),
    detectPdfText(trimmed),
    detectCsv(trimmed),
  ];

  // Boost confidence for matching file extension
  if (fileName) {
    const ext = getExtension(fileName);
    for (const candidate of candidates) {
      if (extensionMatchesFormat(ext, candidate.format)) {
        candidate.confidence = Math.min(100, candidate.confidence + 15);
        candidate.reason += ' (extension match)';
      }
    }
  }

  // Sort by confidence descending and return the best match
  candidates.sort((a, b) => b.confidence - a.confidence);
  const best = candidates[0];
  return { ...best, confidence: Math.min(100, best.confidence) };
}

/**
 * Detect all possible formats for ambiguous content, sorted by confidence.
 *
 * @param content - The raw text content of the file.
 * @param fileName - Optional file name for extension hinting.
 * @returns Array of detection results sorted by confidence (highest first).
 */
export function detectAllFormats(
  content: string,
  fileName?: string,
): readonly FormatDetectionResult[] {
  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return [{ format: ImportFormat.CSV, confidence: 0, reason: 'Empty content' }];
  }

  const candidates: MutableDetectionResult[] = [
    detectOfx(trimmed),
    detectQfx(trimmed),
    detectQif(trimmed),
    detectPdfText(trimmed),
    detectCsv(trimmed),
  ];

  if (fileName) {
    const ext = getExtension(fileName);
    for (const candidate of candidates) {
      if (extensionMatchesFormat(ext, candidate.format)) {
        candidate.confidence = Math.min(100, candidate.confidence + 15);
        candidate.reason += ' (extension match)';
      }
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates
    .filter((c) => c.confidence > 0)
    .map((c) => ({ ...c, confidence: Math.min(100, c.confidence) }));
}

// ---------------------------------------------------------------------------
// Format-specific detectors
// ---------------------------------------------------------------------------

/** Detect OFX format (SGML-style or XML). */
function detectOfx(content: string): MutableDetectionResult {
  let confidence = 0;
  const reasons: string[] = [];

  // OFX header marker
  if (content.includes('OFXHEADER:') || content.includes('<?OFX')) {
    confidence += 50;
    reasons.push('OFX header found');
  }

  // OFX XML namespace or document type
  if (content.includes('<OFX>') || content.includes('<OFX ')) {
    confidence += 30;
    reasons.push('<OFX> root element');
  }

  // Statement transaction elements
  if (content.includes('<STMTTRN>') || content.includes('<STMTTRNRS>')) {
    confidence += 20;
    reasons.push('STMTTRN elements present');
  }

  // Bank or credit card statement
  if (content.includes('<BANKMSGSRSV1>') || content.includes('<CREDITCARDMSGSRSV1>')) {
    confidence += 10;
    reasons.push('Bank/CC message set found');
  }

  return {
    format: ImportFormat.OFX,
    confidence: Math.min(100, confidence),
    reason: reasons.length > 0 ? reasons.join('; ') : 'No OFX markers found',
  };
}

/** Detect QFX format (Quicken variant of OFX). */
function detectQfx(content: string): MutableDetectionResult {
  // QFX is essentially OFX with Intuit-specific headers
  const hasIntuitMarkers = content.includes('INTU.BID') || content.includes('INTU.USERID');

  if (!hasIntuitMarkers) {
    return {
      format: ImportFormat.QFX,
      confidence: 0,
      reason: 'No QFX-specific markers found',
    };
  }

  // QFX has Intuit markers — score it higher than plain OFX
  const ofxResult = detectOfx(content);
  const confidence = ofxResult.confidence + 15;

  return {
    format: ImportFormat.QFX,
    confidence,
    reason: `Intuit-specific headers in OFX (base OFX confidence: ${ofxResult.confidence})`,
  };
}

/** Detect QIF (Quicken Interchange Format). */
function detectQif(content: string): MutableDetectionResult {
  let confidence = 0;
  const reasons: string[] = [];

  // QIF files start with a type header
  const firstLine = content.split(/\r?\n/)[0].trim();
  if (/^!Type:/i.test(firstLine)) {
    confidence += 60;
    reasons.push('QIF !Type: header on first line');
  } else if (/^!Account/i.test(firstLine)) {
    confidence += 50;
    reasons.push('QIF !Account header on first line');
  } else if (/^!Option:/i.test(firstLine)) {
    confidence += 40;
    reasons.push('QIF !Option: header on first line');
  }

  // Record terminators
  const caretLines = content.split(/\r?\n/).filter((l) => l.trim() === '^').length;
  if (caretLines > 0) {
    confidence += Math.min(30, caretLines * 5);
    reasons.push(`${caretLines} record terminators (^)`);
  }

  // Field line prefixes (D=date, T=amount, P=payee, etc.)
  const fieldPattern = /^[DTPMNLCA]/m;
  if (fieldPattern.test(content)) {
    confidence += 10;
    reasons.push('QIF field prefixes found');
  }

  return {
    format: ImportFormat.QIF,
    confidence: Math.min(100, confidence),
    reason: reasons.length > 0 ? reasons.join('; ') : 'No QIF markers found',
  };
}

/** Detect extracted PDF text (heuristic — looks for statement-like patterns). */
function detectPdfText(content: string): MutableDetectionResult {
  let confidence = 0;
  const reasons: string[] = [];

  // PDF marker (rare for text, but possible)
  if (content.startsWith('%PDF')) {
    confidence += 40;
    reasons.push('PDF magic bytes');
  }

  // Statement period patterns
  const periodPattern =
    /statement\s+period|billing\s+period|account\s+summary|opening\s+balance|closing\s+balance/i;
  if (periodPattern.test(content)) {
    confidence += 25;
    reasons.push('Statement period language found');
  }

  // Page number patterns common in extracted PDF text
  const pagePattern = /page\s+\d+\s+of\s+\d+/i;
  if (pagePattern.test(content)) {
    confidence += 15;
    reasons.push('Page numbering found');
  }

  // Fixed-width column alignment (many spaces between fields)
  const fixedWidthLines = content.split(/\r?\n/).filter((l) => /\s{4,}/.test(l)).length;
  const totalLines = content.split(/\r?\n/).length;
  if (totalLines > 5 && fixedWidthLines / totalLines > 0.3) {
    confidence += 15;
    reasons.push('Fixed-width column formatting detected');
  }

  return {
    format: ImportFormat.PDF_TEXT,
    confidence: Math.min(100, confidence),
    reason: reasons.length > 0 ? reasons.join('; ') : 'No PDF text markers found',
  };
}

/** Detect CSV format (fallback — almost anything can be CSV). */
function detectCsv(content: string): MutableDetectionResult {
  let confidence = 10; // Base confidence since CSV is the fallback
  const reasons: string[] = ['CSV is the default fallback format'];

  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { format: ImportFormat.CSV, confidence, reason: reasons.join('; ') };
  }

  // Check for consistent delimiter usage
  const delimiters = [',', ';', '\t', '|'];
  for (const delim of delimiters) {
    const counts = lines.slice(0, 5).map((l) => countOutsideQuotes(l, delim));
    const allSame = counts.every((c) => c === counts[0] && c > 0);
    if (allSame && counts[0] > 0) {
      confidence += 30;
      reasons.push(`Consistent delimiter '${delim === '\t' ? 'TAB' : delim}' across rows`);
      break;
    }
  }

  // Date-like values in first column
  const datePattern = /^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}/;
  const dateHits = lines.slice(1, 6).filter((l) =>
    datePattern.test(
      l
        .split(/[,;\t|]/)[0]
        .replace(/^"/, '')
        .trim(),
    ),
  ).length;
  if (dateHits > 0) {
    confidence += 15;
    reasons.push('Date-like values in first column');
  }

  // Currency/amount patterns
  const amountPattern = /[$€£¥]?\s*-?\d+[.,]\d{2}\b/;
  const amountHits = lines.slice(1, 6).filter((l) => amountPattern.test(l)).length;
  if (amountHits > 0) {
    confidence += 10;
    reasons.push('Currency/amount patterns found');
  }

  return {
    format: ImportFormat.CSV,
    confidence: Math.min(100, confidence),
    reason: reasons.join('; '),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count occurrences of a character outside quoted regions. */
function countOutsideQuotes(line: string, char: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && line[i] === char) {
      count++;
    }
  }
  return count;
}

/** Extract lowercase file extension without the dot. */
function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
}

/** Check if a file extension matches an import format. */
function extensionMatchesFormat(ext: string, format: ImportFormat): boolean {
  switch (format) {
    case ImportFormat.CSV:
      return ext === 'csv';
    case ImportFormat.OFX:
      return ext === 'ofx';
    case ImportFormat.QFX:
      return ext === 'qfx';
    case ImportFormat.QIF:
      return ext === 'qif';
    case ImportFormat.PDF_TEXT:
      return ext === 'pdf' || ext === 'txt';
    default:
      return false;
  }
}
