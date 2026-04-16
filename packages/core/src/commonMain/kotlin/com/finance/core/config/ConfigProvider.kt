// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.config

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Singleton holder for the active [EnvironmentConfig].
 *
 * Platform entry points call [initialize] once at app startup.
 * All shared code reads the config through [config] (blocking) or
 * [configFlow] (reactive).
 *
 * Design rationale:
 * - KMP shared code needs access to environment config without
 *   depending on platform DI frameworks (Koin, Hilt, SwiftUI @Environment).
 * - A simple singleton with explicit initialization is the most
 *   portable pattern across iOS, Android, Web, and Desktop.
 * - The [StateFlow] enables reactive updates if hot-reload or
 *   dynamic config changes are ever needed.
 */
object ConfigProvider {

    private val _config = MutableStateFlow<EnvironmentConfig?>(null)

    /** Reactive config stream. Emits null until [initialize] is called. */
    val configFlow: StateFlow<EnvironmentConfig?> = _config.asStateFlow()

    /**
     * The current environment config.
     *
     * @throws IllegalStateException if [initialize] has not been called.
     */
    val config: EnvironmentConfig
        get() = _config.value
            ?: throw IllegalStateException(
                "ConfigProvider not initialized. Call ConfigProvider.initialize() at app startup."
            )

    /** Whether the provider has been initialized. */
    val isInitialized: Boolean get() = _config.value != null

    /**
     * Initialize with the given config. Must be called once before any
     * shared code accesses [config].
     *
     * Safe to call multiple times (e.g., in tests) — last value wins.
     */
    fun initialize(config: EnvironmentConfig) {
        _config.value = config
    }

    /**
     * Reset to uninitialized state. **Test-only** — do not call in production.
     */
    fun reset() {
        _config.value = null
    }

    // ── Convenience accessors ────────────────────────────────────────

    /** Shortcut: current [BuildEnvironment]. */
    val environment: BuildEnvironment get() = config.environment

    /** Shortcut: current API base URL. */
    val apiBaseUrl: String get() = config.apiBaseUrl

    /** Shortcut: current PowerSync URL. */
    val powerSyncUrl: String get() = config.powerSyncUrl

    /** Shortcut: current log level. */
    val logLevel: LogLevel get() = config.logLevel

    /** Shortcut: whether this is a debug build. */
    val isDebug: Boolean get() = config.isDebug

    /** Shortcut: whether this is a release build. */
    val isRelease: Boolean get() = config.isRelease
}
