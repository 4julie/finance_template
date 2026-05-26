// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import { MockProvider } from '../mock-provider';

describe('MockProvider', () => {
  // -- Identity & features --------------------------------------------------

  it('has correct provider identity', () => {
    const mock = new MockProvider();
    expect(mock.id).toBe('mock');
    expect(mock.name).toBe('Mock Provider');
    expect(mock.supportedCountries).toContain('US');
    expect(mock.supportedCountries).toContain('GB');
  });

  it('reports expected feature flags', () => {
    const mock = new MockProvider();
    expect(mock.features.realTimeBalance).toBe(true);
    expect(mock.features.creditCards).toBe(true);
    expect(mock.features.bnpl).toBe(false);
    expect(mock.features.crypto).toBe(false);
  });

  // -- Data generation ------------------------------------------------------

  it('generates the configured number of accounts', async () => {
    const mock = new MockProvider({ accountCount: 5 });
    const session = await mock.initializeConnection({});
    const conn = await mock.completeConnection(session.sessionId);
    const accounts = await mock.getAccounts(conn.id);
    expect(accounts).toHaveLength(5);
  });

  it('generates transactions for each account', async () => {
    const mock = new MockProvider({
      accountCount: 2,
      transactionsPerAccount: 10,
    });
    const session = await mock.initializeConnection({});
    const conn = await mock.completeConnection(session.sessionId);
    const txs = await mock.getTransactions(conn.id, {
      from: '2000-01-01',
      to: '2099-12-31',
    });
    expect(txs).toHaveLength(20);
  });

  it('generates transactions with integer cent amounts', async () => {
    const mock = new MockProvider({ transactionsPerAccount: 5 });
    const session = await mock.initializeConnection({});
    const conn = await mock.completeConnection(session.sessionId);
    const txs = await mock.getTransactions(conn.id, {
      from: '2000-01-01',
      to: '2099-12-31',
    });

    for (const tx of txs) {
      expect(Number.isInteger(tx.amountCents)).toBe(true);
    }
  });

  // -- Deterministic output -------------------------------------------------

  it('produces deterministic data with the same seed', async () => {
    const run = async (seed: number) => {
      const mock = new MockProvider({ seed, accountCount: 2, transactionsPerAccount: 3 });
      const session = await mock.initializeConnection({});
      const conn = await mock.completeConnection(session.sessionId);
      const accounts = await mock.getAccounts(conn.id);
      const txs = await mock.getTransactions(conn.id, {
        from: '2000-01-01',
        to: '2099-12-31',
      });
      return { accounts, txs };
    };

    const first = await run(99);
    const second = await run(99);

    // Account IDs and names should match
    expect(first.accounts.map((a) => a.id)).toEqual(second.accounts.map((a) => a.id));

    // Transaction amounts and dates should match
    expect(first.txs.map((t) => t.amountCents)).toEqual(second.txs.map((t) => t.amountCents));
    expect(first.txs.map((t) => t.date)).toEqual(second.txs.map((t) => t.date));
  });

  it('produces different data with different seeds', async () => {
    const run = async (seed: number) => {
      const mock = new MockProvider({ seed, accountCount: 1, transactionsPerAccount: 5 });
      const session = await mock.initializeConnection({});
      const conn = await mock.completeConnection(session.sessionId);
      return mock.getTransactions(conn.id, {
        from: '2000-01-01',
        to: '2099-12-31',
      });
    };

    const txsA = await run(1);
    const txsB = await run(2);

    // Very unlikely to be identical with different seeds
    const amountsA = txsA.map((t) => t.amountCents);
    const amountsB = txsB.map((t) => t.amountCents);
    expect(amountsA).not.toEqual(amountsB);
  });

  // -- Date range filtering -------------------------------------------------

  it('filters transactions by date range', async () => {
    const mock = new MockProvider({ transactionsPerAccount: 50 });
    const session = await mock.initializeConnection({});
    const conn = await mock.completeConnection(session.sessionId);

    const all = await mock.getTransactions(conn.id, {
      from: '2000-01-01',
      to: '2099-12-31',
    });

    const narrow = await mock.getTransactions(conn.id, {
      from: '2024-03-01',
      to: '2024-03-31',
    });

    expect(narrow.length).toBeLessThanOrEqual(all.length);
    for (const tx of narrow) {
      expect(tx.date >= '2024-03-01').toBe(true);
      expect(tx.date <= '2024-03-31').toBe(true);
    }
  });

  // -- Error simulation -----------------------------------------------------

  it('simulates errors when configured', async () => {
    const mock = new MockProvider({ simulateError: 'Provider unavailable' });
    await expect(mock.initializeConnection({})).rejects.toThrow('Provider unavailable');

    // Error resets after first throw
    const session = await mock.initializeConnection({});
    expect(session.sessionId).toBeTruthy();
  });

  // -- Balance & status -----------------------------------------------------

  it('returns balances for all accounts', async () => {
    const mock = new MockProvider({ accountCount: 3 });
    const session = await mock.initializeConnection({});
    const conn = await mock.completeConnection(session.sessionId);
    const balances = await mock.getBalances(conn.id);
    expect(balances).toHaveLength(3);
    for (const b of balances) {
      expect(Number.isInteger(b.currentCents)).toBe(true);
    }
  });

  it('reports healthy status', async () => {
    const mock = new MockProvider();
    const health = await mock.getProviderHealth();
    expect(health.isHealthy).toBe(true);

    const status = await mock.getConnectionStatus('any');
    expect(status.status).toBe('active');
  });

  // -- Remove ---------------------------------------------------------------

  it('removes connection data', async () => {
    const mock = new MockProvider();
    const session = await mock.initializeConnection({});
    const conn = await mock.completeConnection(session.sessionId);
    await mock.removeConnection(conn.id);
    const accounts = await mock.getAccounts(conn.id);
    expect(accounts).toEqual([]);
  });
});
