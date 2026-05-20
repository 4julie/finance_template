// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionManager, categorizeError } from '../connection-manager';
import { ProviderRegistry } from '../provider-registry';
import type { BankConnectionProvider, ProviderFeatures, RefreshResult } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const noopFeatures: ProviderFeatures = {
  realTimeBalance: false,
  transactionWebhooks: false,
  investmentAccounts: false,
  creditCards: false,
  loans: false,
  bnpl: false,
  crypto: false,
  internationalBanks: false,
};

function stubProvider(
  overrides: Partial<BankConnectionProvider> & { id: string },
): BankConnectionProvider {
  return {
    name: overrides.id,
    supportedCountries: [],
    features: noopFeatures,
    initializeConnection: vi.fn().mockResolvedValue({ sessionId: 'sess-1' }),
    completeConnection: vi.fn().mockResolvedValue({
      id: 'conn-1',
      providerId: overrides.id,
      providerConnectionId: 'pc-1',
      institutionName: 'Test Bank',
      status: 'active',
      createdAt: new Date().toISOString(),
    }),
    refreshConnection: vi.fn().mockResolvedValue({ connectionId: 'conn-1', success: true }),
    removeConnection: vi.fn().mockResolvedValue(undefined),
    getAccounts: vi.fn().mockResolvedValue([]),
    getTransactions: vi.fn().mockResolvedValue([]),
    getBalances: vi.fn().mockResolvedValue([]),
    getConnectionStatus: vi.fn().mockResolvedValue({ status: 'active' }),
    getProviderHealth: vi.fn().mockResolvedValue({
      isHealthy: true,
      checkedAt: new Date().toISOString(),
    }),
    ...overrides,
  } as BankConnectionProvider;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConnectionManager', () => {
  let registry: ProviderRegistry;
  let manager: ConnectionManager;

  beforeEach(() => {
    registry = new ProviderRegistry();
    // Use zero delays to keep tests fast
    manager = new ConnectionManager(registry, {
      maxRetries: 2,
      baseDelayMs: 0,
    });
  });

  // -- createConnection -----------------------------------------------------

  it('creates a connection through the correct provider', async () => {
    const provider = stubProvider({ id: 'test' });
    registry.registerProvider(provider);

    const session = await manager.createConnection('test', {});
    expect(session.sessionId).toBe('sess-1');
    expect(provider.initializeConnection).toHaveBeenCalledOnce();
  });

  it('throws when creating a connection with an unknown provider', async () => {
    await expect(manager.createConnection('nope', {})).rejects.toThrow('not registered');
  });

  // -- completeConnection ---------------------------------------------------

  it('completes and stores a connection', async () => {
    const provider = stubProvider({ id: 'test' });
    registry.registerProvider(provider);

    const conn = await manager.completeConnection('test', 'sess-1');
    expect(conn.id).toBe('conn-1');

    const stored = manager.getConnectionsByProvider('test');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('conn-1');
  });

  // -- refreshAllConnections ------------------------------------------------

  it('refreshes all connections and returns results', async () => {
    const provider = stubProvider({ id: 'p1' });
    registry.registerProvider(provider);

    // Manually add two connections
    manager.addConnection({
      id: 'c1',
      providerId: 'p1',
      providerConnectionId: 'pc1',
      institutionName: 'Bank A',
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    manager.addConnection({
      id: 'c2',
      providerId: 'p1',
      providerConnectionId: 'pc2',
      institutionName: 'Bank B',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    vi.mocked(provider.refreshConnection).mockImplementation(
      async (id: string): Promise<RefreshResult> => ({
        connectionId: id,
        success: true,
        newTransactions: 5,
      }),
    );

    const results = await manager.refreshAllConnections();
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('isolates errors — one failure does not block others', async () => {
    const provider = stubProvider({ id: 'p1' });
    registry.registerProvider(provider);

    manager.addConnection({
      id: 'good',
      providerId: 'p1',
      providerConnectionId: 'pc1',
      institutionName: 'Good Bank',
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    manager.addConnection({
      id: 'bad',
      providerId: 'p1',
      providerConnectionId: 'pc2',
      institutionName: 'Bad Bank',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    vi.mocked(provider.refreshConnection).mockImplementation(
      async (id: string): Promise<RefreshResult> => {
        if (id === 'bad') throw new Error('Authentication expired');
        return { connectionId: id, success: true };
      },
    );

    const results = await manager.refreshAllConnections();
    const good = results.find((r) => r.connectionId === 'good');
    const bad = results.find((r) => r.connectionId === 'bad');

    expect(good?.success).toBe(true);
    expect(bad?.success).toBe(false);
    expect(bad?.error?.code).toBe('AUTHENTICATION_EXPIRED');
  });

  // -- retry logic ----------------------------------------------------------

  it('retries retryable errors up to maxRetries', async () => {
    const provider = stubProvider({ id: 'p1' });
    registry.registerProvider(provider);

    manager.addConnection({
      id: 'retry-conn',
      providerId: 'p1',
      providerConnectionId: 'pc1',
      institutionName: 'Slow Bank',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    vi.mocked(provider.refreshConnection).mockRejectedValue(
      new Error('Provider unavailable — 503'),
    );

    const results = await manager.refreshAllConnections();
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error?.code).toBe('PROVIDER_DOWN');

    // initial + 2 retries = 3 calls total
    expect(provider.refreshConnection).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable errors', async () => {
    const provider = stubProvider({ id: 'p1' });
    registry.registerProvider(provider);

    manager.addConnection({
      id: 'auth-conn',
      providerId: 'p1',
      providerConnectionId: 'pc1',
      institutionName: 'Auth Bank',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    vi.mocked(provider.refreshConnection).mockRejectedValue(new Error('Authentication expired'));

    await manager.refreshAllConnections();
    // Only 1 call — no retry for auth errors
    expect(provider.refreshConnection).toHaveBeenCalledTimes(1);
  });

  // -- removeConnection -----------------------------------------------------

  it('removes a connection from the manager and provider', async () => {
    const provider = stubProvider({ id: 'p1' });
    registry.registerProvider(provider);

    manager.addConnection({
      id: 'rm-conn',
      providerId: 'p1',
      providerConnectionId: 'pc1',
      institutionName: 'Remove Bank',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    await manager.removeConnection('rm-conn');
    expect(manager.getAllConnections()).toHaveLength(0);
    expect(provider.removeConnection).toHaveBeenCalledWith('rm-conn');
  });
});

// ---------------------------------------------------------------------------
// categorizeError
// ---------------------------------------------------------------------------

describe('categorizeError', () => {
  it.each([
    ['Authentication expired', 'AUTHENTICATION_EXPIRED', false],
    ['Auth token invalid', 'AUTHENTICATION_EXPIRED', false],
    ['Rate limit exceeded', 'RATE_LIMITED', true],
    ['Too many requests', 'RATE_LIMITED', true],
    ['Provider unavailable 503', 'PROVIDER_DOWN', true],
    ['Request timeout', 'PROVIDER_DOWN', true],
    ['Invalid credentials', 'INVALID_CREDENTIALS', false],
    ['Institution not supported', 'INSTITUTION_NOT_SUPPORTED', false],
    ['Something unknown happened', 'UNKNOWN', false],
  ])('categorizes "%s" as %s (retryable=%s)', (message, expectedCode, expectedRetryable) => {
    const result = categorizeError(new Error(message));
    expect(result.code).toBe(expectedCode);
    expect(result.retryable).toBe(expectedRetryable);
  });

  it('handles non-Error values', () => {
    const result = categorizeError('simple string error');
    expect(result.message).toBe('simple string error');
  });

  it('handles null/undefined', () => {
    const result = categorizeError(null);
    expect(result.code).toBe('UNKNOWN');
  });
});
