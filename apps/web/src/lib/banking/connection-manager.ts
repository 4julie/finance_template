// SPDX-License-Identifier: BUSL-1.1

/**
 * Connection manager — orchestrates the banking connection lifecycle.
 *
 * Sits between the UI layer (hooks/components) and individual
 * {@link BankConnectionProvider} implementations. Provides:
 *
 * - Connection creation routing to the correct provider
 * - Batch refresh with error isolation (one failure doesn't block others)
 * - Retry logic with configurable exponential backoff
 * - Structured error categorization
 *
 * @module banking/connection-manager
 */

import type { ProviderRegistry } from './provider-registry';
import type {
  BankConnection,
  ConnectionConfig,
  ConnectionError,
  ConnectionErrorCode,
  ConnectionSession,
  RefreshResult,
} from './types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration for the {@link ConnectionManager}'s retry behavior.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts before giving up. @default 3 */
  maxRetries: number;
  /** Base delay in milliseconds (doubled each attempt). @default 1000 */
  baseDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
};

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

/**
 * Categorize an unknown error into a {@link ConnectionErrorCode}.
 *
 * The heuristic inspects error messages for well-known keywords. Real
 * provider implementations should throw pre-categorized errors, but this
 * acts as a safety net.
 *
 * @param error - The caught error value.
 * @returns A categorized {@link ConnectionError}.
 */
export function categorizeError(error: unknown): ConnectionError {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const lower = message.toLowerCase();

  let code: ConnectionErrorCode = 'UNKNOWN';
  let retryable = false;

  if (
    lower.includes('authentication') ||
    lower.includes('auth') ||
    lower.includes('expired') ||
    lower.includes('token')
  ) {
    code = 'AUTHENTICATION_EXPIRED';
    retryable = false;
  } else if (
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('throttle') ||
    lower.includes('too many requests')
  ) {
    code = 'RATE_LIMITED';
    retryable = true;
  } else if (
    lower.includes('provider') ||
    lower.includes('unavailable') ||
    lower.includes('503') ||
    lower.includes('502') ||
    lower.includes('timeout')
  ) {
    code = 'PROVIDER_DOWN';
    retryable = true;
  } else if (
    lower.includes('credential') ||
    lower.includes('password') ||
    lower.includes('invalid')
  ) {
    code = 'INVALID_CREDENTIALS';
    retryable = false;
  } else if (
    lower.includes('institution') ||
    lower.includes('not supported') ||
    lower.includes('unsupported')
  ) {
    code = 'INSTITUTION_NOT_SUPPORTED';
    retryable = false;
  }

  return { code, message, retryable, providerError: error };
}

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------

/** @internal Pause execution for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// ConnectionManager
// ---------------------------------------------------------------------------

/**
 * Orchestrates creation, refresh, and error handling for banking connections.
 */
export class ConnectionManager {
  /** @internal in-memory connection store (keyed by connection ID). */
  private readonly connections = new Map<string, BankConnection>();
  private readonly registry: ProviderRegistry;
  private readonly retryConfig: RetryConfig;

  /**
   * @param registry - The provider registry to resolve providers from.
   * @param retryConfig - Optional retry configuration overrides.
   */
  constructor(registry: ProviderRegistry, retryConfig?: Partial<RetryConfig>) {
    this.registry = registry;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Begin a new connection through the specified provider.
   *
   * @param providerId - ID of the registered provider.
   * @param config - Connection configuration.
   * @returns A {@link ConnectionSession} to continue the handshake.
   * @throws {Error} If the provider ID is not registered.
   */
  async createConnection(providerId: string, config: ConnectionConfig): Promise<ConnectionSession> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider "${providerId}" is not registered.`);
    }
    return provider.initializeConnection(config);
  }

  /**
   * Complete a connection handshake and store the resulting connection.
   *
   * @param providerId - ID of the provider that started the session.
   * @param sessionId - The session ID returned from {@link createConnection}.
   * @param metadata - Provider-specific completion data.
   * @returns The established {@link BankConnection}.
   */
  async completeConnection(
    providerId: string,
    sessionId: string,
    metadata?: Record<string, unknown>,
  ): Promise<BankConnection> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider "${providerId}" is not registered.`);
    }
    const connection = await provider.completeConnection(sessionId, metadata);
    this.connections.set(connection.id, connection);
    return connection;
  }

  /**
   * Refresh **all** stored connections, isolating individual failures.
   *
   * Each connection is refreshed through its provider. If one connection
   * fails, the error is captured in the result and the remaining connections
   * continue to refresh.
   *
   * @returns An array of {@link RefreshResult} — one per connection.
   */
  async refreshAllConnections(): Promise<RefreshResult[]> {
    const results: RefreshResult[] = [];

    const entries = Array.from(this.connections.values());

    await Promise.all(
      entries.map(async (conn) => {
        const result = await this.refreshWithRetry(conn);
        results.push(result);
      }),
    );

    return results;
  }

  /**
   * Return all stored connections for a given provider.
   *
   * @param providerId - The provider ID to filter by.
   * @returns Connections managed by that provider.
   */
  getConnectionsByProvider(providerId: string): BankConnection[] {
    return Array.from(this.connections.values()).filter((c) => c.providerId === providerId);
  }

  /**
   * Return all stored connections.
   *
   * @returns Every tracked connection.
   */
  getAllConnections(): BankConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Store an externally-created connection (e.g., from manual import).
   *
   * @param connection - The connection to track.
   */
  addConnection(connection: BankConnection): void {
    this.connections.set(connection.id, connection);
  }

  /**
   * Remove a connection from the manager and provider.
   *
   * @param connectionId - The connection to remove.
   */
  async removeConnection(connectionId: string): Promise<void> {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    const provider = this.registry.getProvider(conn.providerId);
    if (provider) {
      await provider.removeConnection(connectionId);
    }
    this.connections.delete(connectionId);
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Refresh a single connection with exponential backoff retry.
   *
   * @internal
   */
  private async refreshWithRetry(conn: BankConnection): Promise<RefreshResult> {
    const provider = this.registry.getProvider(conn.providerId);
    if (!provider) {
      return {
        connectionId: conn.id,
        success: false,
        error: {
          code: 'UNKNOWN',
          message: `Provider "${conn.providerId}" not found in registry.`,
          retryable: false,
        },
      };
    }

    let lastError: ConnectionError | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await provider.refreshConnection(conn.id);
        // Update stored connection status on success
        if (result.success) {
          this.connections.set(conn.id, {
            ...conn,
            status: 'active',
            lastRefreshedAt: new Date().toISOString(),
          });
        }
        return result;
      } catch (err) {
        lastError = categorizeError(err);

        // Don't retry non-retryable errors
        if (!lastError.retryable) break;

        // Don't sleep after the last attempt
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
          await sleep(delay);
        }
      }
    }

    return {
      connectionId: conn.id,
      success: false,
      error: lastError ?? {
        code: 'UNKNOWN',
        message: 'Refresh failed with no error details.',
        retryable: false,
      },
    };
  }
}
