// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect, beforeEach } from 'vitest';
import type { BankConnectionProvider, ProviderFeatures } from '../types';
import { ProviderRegistry } from '../provider-registry';

// ---------------------------------------------------------------------------
// Helpers — minimal stub provider
// ---------------------------------------------------------------------------

function stubProvider(
  overrides: Partial<BankConnectionProvider> & { id: string },
): BankConnectionProvider {
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

  return {
    name: overrides.id,
    supportedCountries: [],
    features: noopFeatures,
    initializeConnection: vi.fn(),
    completeConnection: vi.fn(),
    refreshConnection: vi.fn(),
    removeConnection: vi.fn(),
    getAccounts: vi.fn(),
    getTransactions: vi.fn(),
    getBalances: vi.fn(),
    getConnectionStatus: vi.fn(),
    getProviderHealth: vi.fn(),
    ...overrides,
  } as BankConnectionProvider;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  // -- registerProvider / getProvider ----------------------------------------

  it('registers and retrieves a provider by ID', () => {
    const p = stubProvider({ id: 'plaid' });
    registry.registerProvider(p);
    expect(registry.getProvider('plaid')).toBe(p);
  });

  it('returns undefined for an unregistered ID', () => {
    expect(registry.getProvider('nonexistent')).toBeUndefined();
  });

  it('throws when registering a duplicate ID', () => {
    registry.registerProvider(stubProvider({ id: 'plaid' }));
    expect(() => registry.registerProvider(stubProvider({ id: 'plaid' }))).toThrow(
      'already registered',
    );
  });

  // -- getAllProviders -------------------------------------------------------

  it('returns all registered providers', () => {
    registry.registerProvider(stubProvider({ id: 'a' }));
    registry.registerProvider(stubProvider({ id: 'b' }));
    registry.registerProvider(stubProvider({ id: 'c' }));
    expect(registry.getAllProviders()).toHaveLength(3);
  });

  it('returns an empty array when no providers are registered', () => {
    expect(registry.getAllProviders()).toEqual([]);
  });

  // -- getProvidersForCountry -----------------------------------------------

  it('filters providers by supported country (case-insensitive)', () => {
    registry.registerProvider(stubProvider({ id: 'us-only', supportedCountries: ['US'] }));
    registry.registerProvider(stubProvider({ id: 'gb-only', supportedCountries: ['GB'] }));
    registry.registerProvider(stubProvider({ id: 'both', supportedCountries: ['US', 'GB'] }));

    const us = registry.getProvidersForCountry('us');
    expect(us.map((p) => p.id)).toEqual(['us-only', 'both']);

    const gb = registry.getProvidersForCountry('GB');
    expect(gb.map((p) => p.id)).toEqual(['gb-only', 'both']);
  });

  it('returns empty array when no provider matches the country', () => {
    registry.registerProvider(stubProvider({ id: 'us-only', supportedCountries: ['US'] }));
    expect(registry.getProvidersForCountry('JP')).toEqual([]);
  });

  // -- getProvidersWithFeature ----------------------------------------------

  it('filters providers by feature flag', () => {
    registry.registerProvider(
      stubProvider({
        id: 'realtime',
        features: {
          realTimeBalance: true,
          transactionWebhooks: false,
          investmentAccounts: false,
          creditCards: false,
          loans: false,
          bnpl: false,
          crypto: false,
          internationalBanks: false,
        },
      }),
    );
    registry.registerProvider(
      stubProvider({
        id: 'basic',
        features: {
          realTimeBalance: false,
          transactionWebhooks: false,
          investmentAccounts: false,
          creditCards: false,
          loans: false,
          bnpl: false,
          crypto: false,
          internationalBanks: false,
        },
      }),
    );

    const realtime = registry.getProvidersWithFeature('realTimeBalance');
    expect(realtime).toHaveLength(1);
    expect(realtime[0].id).toBe('realtime');
  });

  it('returns empty array when no provider has the feature', () => {
    registry.registerProvider(stubProvider({ id: 'basic' }));
    expect(registry.getProvidersWithFeature('crypto')).toEqual([]);
  });

  // -- clear ----------------------------------------------------------------

  it('clears all providers', () => {
    registry.registerProvider(stubProvider({ id: 'a' }));
    registry.registerProvider(stubProvider({ id: 'b' }));
    registry.clear();
    expect(registry.getAllProviders()).toEqual([]);
  });
});
