// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import {
  detectDateFormat,
  parseCsvTransactions,
  parseCurrencyToCents,
  parseDate,
} from '../csv-parser';
import { ImportFormat } from '../types';

describe('parseCsvTransactions', () => {
  it('parses a basic CSV with signed amounts', () => {
    const csv = `Date,Description,Amount
01/15/2024,Grocery Store,-45.67
01/16/2024,Salary Deposit,2500.00`;

    const result = parseCsvTransactions(csv, {
      mapping: { date: 'Date', description: 'Description', amount: 'Amount' },
      amountConvention: 'signed',
    });

    expect(result.format).toBe(ImportFormat.CSV);
    expect(result.transactions).toHaveLength(2);
    expect(result.errors).toHaveLength(0);

    expect(result.transactions[0].date).toBe('2024-01-15');
    expect(result.transactions[0].amountCents).toBe(-4567);
    expect(result.transactions[0].description).toBe('Grocery Store');

    expect(result.transactions[1].date).toBe('2024-01-16');
    expect(result.transactions[1].amountCents).toBe(250000);
  });

  it('parses CSV with debit/credit columns', () => {
    const csv = `Date,Description,Debit,Credit
01/15/2024,Grocery Store,45.67,
01/16/2024,Salary Deposit,,2500.00`;

    const result = parseCsvTransactions(csv, {
      mapping: {
        date: 'Date',
        description: 'Description',
        debit: 'Debit',
        credit: 'Credit',
      },
      amountConvention: 'debit_credit',
    });

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].amountCents).toBe(-4567); // Debits are negative
    expect(result.transactions[1].amountCents).toBe(250000); // Credits are positive
  });

  it('parses CSV with inverted amount convention', () => {
    const csv = `Date,Description,Amount
01/15/2024,Grocery Store,45.67`;

    const result = parseCsvTransactions(csv, {
      mapping: { date: 'Date', description: 'Description', amount: 'Amount' },
      amountConvention: 'inverted',
    });

    expect(result.transactions[0].amountCents).toBe(-4567);
  });

  it('handles Chase CSV format', () => {
    const csv = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
01/15/2024,01/17/2024,GROCERY STORE,Groceries,Sale,-45.67,
01/20/2024,01/22/2024,PAYMENT THANK YOU,Payment,Payment,500.00,`;

    const result = parseCsvTransactions(csv, {
      mapping: {
        date: 'Transaction Date',
        description: 'Description',
        amount: 'Amount',
        category: 'Category',
        memo: 'Memo',
      },
    });

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].category).toBe('Groceries');
    expect(result.transactions[0].amountCents).toBe(-4567);
  });

  it('handles Bank of America CSV format', () => {
    const csv = `Date,Description,Amount,Running Bal.
01/15/2024,"GROCERY STORE #123",-45.67,"1,234.56"
01/16/2024,"DIRECT DEPOSIT",2500.00,"3,734.56"`;

    const result = parseCsvTransactions(csv, {
      mapping: {
        date: 'Date',
        description: 'Description',
        amount: 'Amount',
        balance: 'Running Bal.',
      },
    });

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].balanceCents).toBe(123456);
    expect(result.transactions[1].balanceCents).toBe(373456);
  });

  it('uses column indexes instead of names', () => {
    const csv = `01/15/2024,Grocery Store,-45.67`;

    const result = parseCsvTransactions(csv, {
      mapping: { date: 0, description: 1, amount: 2 },
      hasHeader: false,
    });

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].date).toBe('2024-01-15');
  });

  it('records errors for unparseable dates', () => {
    const csv = `Date,Description,Amount
not-a-date,Test,-10.00`;

    const result = parseCsvTransactions(csv, {
      mapping: { date: 'Date', description: 'Description', amount: 'Amount' },
    });

    expect(result.transactions).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].severity).toBe('error');
  });

  it('records errors for missing amounts', () => {
    const csv = `Date,Description,Amount
01/15/2024,Test,`;

    const result = parseCsvTransactions(csv, {
      mapping: { date: 'Date', description: 'Description', amount: 'Amount' },
    });

    expect(result.transactions).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });
});

describe('parseCurrencyToCents', () => {
  it('parses simple dollar amounts', () => {
    expect(parseCurrencyToCents('45.67')).toBe(4567);
    expect(parseCurrencyToCents('0.01')).toBe(1);
    expect(parseCurrencyToCents('1000.00')).toBe(100000);
  });

  it('parses amounts with currency symbols', () => {
    expect(parseCurrencyToCents('$45.67')).toBe(4567);
    expect(parseCurrencyToCents('€1234.56')).toBe(123456);
    expect(parseCurrencyToCents('£10.00')).toBe(1000);
  });

  it('parses negative amounts', () => {
    expect(parseCurrencyToCents('-45.67')).toBe(-4567);
    expect(parseCurrencyToCents('(45.67)')).toBe(-4567);
    expect(parseCurrencyToCents('-$100.00')).toBe(-10000);
  });

  it('handles thousands separators', () => {
    expect(parseCurrencyToCents('1,234.56')).toBe(123456);
    expect(parseCurrencyToCents('$1,234,567.89')).toBe(123456789);
  });

  it('handles European format (comma decimal)', () => {
    expect(parseCurrencyToCents('1.234,56')).toBe(123456);
  });

  it('uses Banker rounding for fractional cents', () => {
    // 2.5 cents → rounds to 2 (even)
    expect(parseCurrencyToCents('0.025')).toBe(2);
    // 3.5 cents → rounds to 4 (even)
    expect(parseCurrencyToCents('0.035')).toBe(4);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseCurrencyToCents('')).toBe(null);
    expect(parseCurrencyToCents('   ')).toBe(null);
    expect(parseCurrencyToCents('not a number')).toBe(null);
  });
});

describe('parseDate', () => {
  it('parses ISO format', () => {
    expect(parseDate('2024-01-15')).toBe('2024-01-15');
    expect(parseDate('2024-01-15T10:30:00')).toBe('2024-01-15');
  });

  it('parses MM/DD/YYYY format', () => {
    expect(parseDate('01/15/2024')).toBe('2024-01-15');
    expect(parseDate('1/5/2024')).toBe('2024-01-05');
  });

  it('parses DD.MM.YYYY format', () => {
    expect(parseDate('15.01.2024')).toBe('2024-01-15');
  });

  it('parses MM-DD-YYYY format', () => {
    expect(parseDate('01-15-2024')).toBe('2024-01-15');
  });

  it('handles 2-digit years', () => {
    expect(parseDate('01/15/24')).toBe('2024-01-15');
    expect(parseDate('01/15/99')).toBe('1999-01-15');
  });

  it('parses with explicit format', () => {
    expect(parseDate('15/01/2024', 'DD/MM/YYYY')).toBe('2024-01-15');
  });

  it('returns null for invalid dates', () => {
    expect(parseDate('')).toBe(null);
    expect(parseDate('13/32/2024')).toBe(null);
    expect(parseDate('not a date')).toBe(null);
  });
});

describe('detectDateFormat', () => {
  it('detects ISO format', () => {
    expect(detectDateFormat(['2024-01-15', '2024-02-20', '2024-03-01'])).toBe('YYYY-MM-DD');
  });

  it('detects MM/DD/YYYY format', () => {
    // Second value > 12 proves month-first
    expect(detectDateFormat(['01/15/2024', '02/20/2024', '03/25/2024'])).toBe('MM/DD/YYYY');
  });

  it('returns null for empty samples', () => {
    expect(detectDateFormat([])).toBe(null);
  });
});
