// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import { detectAllFormats, detectFormat } from '../detect';
import { ImportFormat } from '../types';

describe('detectFormat', () => {
  it('detects OFX format from OFXHEADER marker', () => {
    const content = `OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTTRN><DTPOSTED>20240115<TRNAMT>-45.67</STMTTRN>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
    const result = detectFormat(content);
    expect(result.format).toBe(ImportFormat.OFX);
    expect(result.confidence).toBeGreaterThanOrEqual(50);
  });

  it('detects OFX format from XML structure', () => {
    const content = `<?xml version="1.0"?>
<OFX>
<BANKMSGSRSV1>
<STMTTRN><DTPOSTED>20240115<TRNAMT>-10.00</STMTTRN>
</BANKMSGSRSV1>
</OFX>`;
    const result = detectFormat(content);
    expect(result.format).toBe(ImportFormat.OFX);
    expect(result.confidence).toBeGreaterThanOrEqual(40);
  });

  it('detects QFX format with Intuit headers', () => {
    const content = `OFXHEADER:100
INTU.BID:12345
<OFX>
<STMTTRN><DTPOSTED>20240115<TRNAMT>-45.67</STMTTRN>
</OFX>`;
    const result = detectFormat(content);
    expect(result.format).toBe(ImportFormat.QFX);
    expect(result.confidence).toBeGreaterThanOrEqual(50);
  });

  it('detects QIF format from !Type: header', () => {
    const content = `!Type:Bank
D01/15/2024
T-45.67
PGrocery Store
^
D01/16/2024
T100.00
PSalary
^`;
    const result = detectFormat(content);
    expect(result.format).toBe(ImportFormat.QIF);
    expect(result.confidence).toBeGreaterThanOrEqual(60);
  });

  it('detects CSV format from consistent delimiters', () => {
    const content = `Date,Description,Amount,Balance
01/15/2024,Grocery Store,-45.67,1234.56
01/16/2024,Salary Deposit,2500.00,3734.56`;
    const result = detectFormat(content);
    expect(result.format).toBe(ImportFormat.CSV);
    expect(result.confidence).toBeGreaterThanOrEqual(30);
  });

  it('detects PDF text from statement language patterns', () => {
    const content = `BANK STATEMENT
Statement Period: 01/01/2024 - 01/31/2024
Account Summary
Opening Balance: $5,000.00

Page 1 of 3

01/15    GROCERY STORE         -45.67    4,954.33
01/16    SALARY DEPOSIT      2,500.00    7,454.33`;
    const result = detectFormat(content);
    expect(result.format).toBe(ImportFormat.PDF_TEXT);
    expect(result.confidence).toBeGreaterThanOrEqual(25);
  });

  it('boosts confidence for matching file extension', () => {
    const content = 'Date,Description,Amount\n01/15/2024,Test,-10.00';
    const withExt = detectFormat(content, 'transactions.csv');
    const withoutExt = detectFormat(content);
    expect(withExt.confidence).toBeGreaterThanOrEqual(withoutExt.confidence);
  });

  it('returns CSV as fallback for ambiguous content', () => {
    const content = 'some random text\nwith no clear format';
    const result = detectFormat(content);
    expect(result.format).toBe(ImportFormat.CSV);
  });

  it('handles empty content gracefully', () => {
    const result = detectFormat('');
    expect(result.confidence).toBe(0);
  });
});

describe('detectAllFormats', () => {
  it('returns multiple candidates sorted by confidence', () => {
    const content = `Date,Description,Amount
01/15/2024,Test,-10.00`;
    const results = detectAllFormats(content);
    expect(results.length).toBeGreaterThan(0);
    // Should be sorted descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i].confidence).toBeLessThanOrEqual(results[i - 1].confidence);
    }
  });

  it('filters out zero-confidence results for empty content', () => {
    const results = detectAllFormats('');
    // Only the fallback
    expect(results.length).toBeLessThanOrEqual(1);
  });
});
