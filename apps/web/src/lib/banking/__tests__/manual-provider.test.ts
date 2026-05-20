// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import { ManualImportProvider } from '../manual-provider';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CSV_CONTENT = `Date,Amount,Description
01/15/2024,42.99,Whole Foods
01/16/2024,-100.00,ATM Withdrawal
01/17/2024,1500.00,Payroll Deposit`;

const OFX_CONTENT = `
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<DTPOSTED>20240115
<TRNAMT>-42.99
<NAME>Whole Foods
<FITID>WF-001
</STMTTRN>
<STMTTRN>
<DTPOSTED>20240116
<TRNAMT>1500.00
<NAME>Payroll
<FITID>PAY-001
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

const QIF_CONTENT = `!Type:Bank
D01/15/2024
T-42.99
PWhole Foods
^
D01/16/2024
T1500.00
PPayroll
^`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ManualImportProvider', () => {
  // -- Feature flags --------------------------------------------------------

  it('has all features set to false', () => {
    const provider = new ManualImportProvider();
    const features = provider.features;

    expect(features.realTimeBalance).toBe(false);
    expect(features.transactionWebhooks).toBe(false);
    expect(features.investmentAccounts).toBe(false);
    expect(features.creditCards).toBe(false);
    expect(features.loans).toBe(false);
    expect(features.bnpl).toBe(false);
    expect(features.crypto).toBe(false);
    expect(features.internationalBanks).toBe(false);
  });

  it('has correct provider identity', () => {
    const provider = new ManualImportProvider();
    expect(provider.id).toBe('manual');
    expect(provider.name).toBe('Manual Import');
    expect(provider.supportedCountries).toEqual([]);
  });

  // -- CSV import -----------------------------------------------------------

  it('imports CSV transactions through the provider interface', async () => {
    const provider = new ManualImportProvider();

    const session = await provider.initializeConnection({
      metadata: { content: CSV_CONTENT, format: 'csv', institutionName: 'Test Bank' },
    });
    expect(session.sessionId).toBeTruthy();

    const connection = await provider.completeConnection(session.sessionId);
    expect(connection.status).toBe('active');
    expect(connection.institutionName).toBe('Test Bank');

    const accounts = await provider.getAccounts(connection.id);
    expect(accounts).toHaveLength(1);
    expect(accounts[0].institution).toBe('Test Bank');

    const txs = await provider.getTransactions(connection.id, {
      from: '2024-01-01',
      to: '2024-12-31',
    });
    expect(txs).toHaveLength(3);
    // Verify amounts are in cents
    expect(txs.some((t) => t.amountCents === 4299)).toBe(true);
  });

  // -- OFX import -----------------------------------------------------------

  it('imports OFX transactions through the provider interface', async () => {
    const provider = new ManualImportProvider();

    const session = await provider.initializeConnection({
      metadata: { content: OFX_CONTENT, format: 'ofx' },
    });
    const connection = await provider.completeConnection(session.sessionId);

    const txs = await provider.getTransactions(connection.id, {
      from: '2024-01-01',
      to: '2024-12-31',
    });
    expect(txs).toHaveLength(2);
    // OFX amount -42.99 → -4299 cents
    expect(txs.some((t) => t.amountCents === -4299)).toBe(true);
    // OFX amount 1500.00 → 150000 cents
    expect(txs.some((t) => t.amountCents === 150000)).toBe(true);
  });

  // -- QIF import -----------------------------------------------------------

  it('imports QIF transactions through the provider interface', async () => {
    const provider = new ManualImportProvider();

    const session = await provider.initializeConnection({
      metadata: { content: QIF_CONTENT, format: 'qif' },
    });
    const connection = await provider.completeConnection(session.sessionId);

    const txs = await provider.getTransactions(connection.id, {
      from: '2024-01-01',
      to: '2024-12-31',
    });
    expect(txs).toHaveLength(2);
    expect(txs.some((t) => t.amountCents === -4299)).toBe(true);
    expect(txs.some((t) => t.amountCents === 150000)).toBe(true);
  });

  // -- Error handling -------------------------------------------------------

  it('throws when content is missing', async () => {
    const provider = new ManualImportProvider();
    await expect(provider.initializeConnection({ metadata: { format: 'csv' } })).rejects.toThrow(
      'content',
    );
  });

  it('throws on invalid session ID', async () => {
    const provider = new ManualImportProvider();
    await expect(provider.completeConnection('bad-id')).rejects.toThrow('No manual import session');
  });

  // -- Date filtering -------------------------------------------------------

  it('filters transactions by date range', async () => {
    const provider = new ManualImportProvider();
    const session = await provider.initializeConnection({
      metadata: { content: CSV_CONTENT, format: 'csv' },
    });
    const conn = await provider.completeConnection(session.sessionId);

    const narrow = await provider.getTransactions(conn.id, {
      from: '2024-01-15',
      to: '2024-01-15',
    });
    expect(narrow).toHaveLength(1);
  });

  // -- Provider health & status ---------------------------------------------

  it('reports healthy status', async () => {
    const provider = new ManualImportProvider();
    const health = await provider.getProviderHealth();
    expect(health.isHealthy).toBe(true);

    const status = await provider.getConnectionStatus('any');
    expect(status.status).toBe('active');
  });

  // -- Remove connection ----------------------------------------------------

  it('removes imported data', async () => {
    const provider = new ManualImportProvider();
    const session = await provider.initializeConnection({
      metadata: { content: CSV_CONTENT, format: 'csv' },
    });
    const conn = await provider.completeConnection(session.sessionId);

    await provider.removeConnection(conn.id);
    const accounts = await provider.getAccounts(conn.id);
    expect(accounts).toEqual([]);
  });
});
