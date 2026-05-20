// SPDX-License-Identifier: BUSL-1.1

/**
 * Provider registry — discover, register, and query banking providers.
 *
 * The registry is the single source of truth for which
 * {@link BankConnectionProvider} implementations are available at runtime.
 * Consumers filter providers by country or capability before presenting
 * choices to the user.
 *
 * A default singleton ({@link defaultRegistry}) is exported for convenience;
 * tests and alternative configurations can create their own instances.
 *
 * @module banking/provider-registry
 */

import type { BankConnectionProvider, ProviderFeatures } from './types';

/**
 * Registry that holds and queries {@link BankConnectionProvider} instances.
 */
export class ProviderRegistry {
  /** @internal provider map keyed by provider ID */
  private readonly providers = new Map<string, BankConnectionProvider>();

  /**
   * Register a banking provider.
   *
   * @param provider - The provider implementation to register.
   * @throws {Error} If a provider with the same `id` is already registered.
   */
  registerProvider(provider: BankConnectionProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider with id "${provider.id}" is already registered.`);
    }
    this.providers.set(provider.id, provider);
  }

  /**
   * Retrieve a provider by its unique identifier.
   *
   * @param id - The provider ID (e.g., `"plaid"`, `"manual"`).
   * @returns The provider, or `undefined` if not found.
   */
  getProvider(id: string): BankConnectionProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Return every registered provider.
   *
   * @returns An array of all providers (order is insertion order).
   */
  getAllProviders(): BankConnectionProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Return providers that list the given country in their
   * {@link BankConnectionProvider.supportedCountries}.
   *
   * @param countryCode - ISO 3166-1 alpha-2 code (case-insensitive).
   * @returns Providers supporting that country.
   */
  getProvidersForCountry(countryCode: string): BankConnectionProvider[] {
    const upper = countryCode.toUpperCase();
    return this.getAllProviders().filter((p) =>
      p.supportedCountries.some((c) => c.toUpperCase() === upper),
    );
  }

  /**
   * Return providers whose {@link ProviderFeatures} include a truthy value
   * for the requested feature key.
   *
   * @param feature - A key of {@link ProviderFeatures}.
   * @returns Providers that support the feature.
   */
  getProvidersWithFeature(feature: keyof ProviderFeatures): BankConnectionProvider[] {
    return this.getAllProviders().filter((p) => p.features[feature]);
  }

  /**
   * Remove all registered providers (useful in tests).
   */
  clear(): void {
    this.providers.clear();
  }
}

/**
 * Default singleton registry.
 *
 * Application bootstrap code registers providers here; hooks and managers
 * consume from this instance unless overridden.
 */
export const defaultRegistry = new ProviderRegistry();
