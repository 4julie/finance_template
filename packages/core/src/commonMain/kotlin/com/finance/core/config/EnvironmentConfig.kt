// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.config

import kotlinx.serialization.Serializable

/**
 * Shared environment configuration consumed by all KMP modules.
 *
 * Platform apps construct an [EnvironmentConfig] at startup based on
 * the active [BuildEnvironment] and inject it into the shared layer.
 * This keeps platform-specific build config (BuildConfig, Info.plist,
 * webpack DefinePlugin) out of commonMain while giving shared code
 * a single, typed configuration surface.
 *
 * @property environment The active build environment variant.
 * @property apiBaseUrl Base URL for the Finance API (no trailing slash).
 * @property powerSyncUrl PowerSync instance URL for offline-first sync.
 * @property logLevel Minimum log severity for shared-layer logging.
 * @property syncIntervalSeconds How often (in seconds) to trigger background sync.
 * @property enableCrashReporting Whether to send crash reports to the telemetry backend.
 * @property enableAnalytics Whether to collect anonymous usage analytics.
 * @property appVersion Semantic version of the running app (e.g., "1.2.0").
 * @property platformName Runtime platform identifier (e.g., "android", "ios", "web", "windows").
 */
@Serializable
data class EnvironmentConfig(
    val environment: BuildEnvironment,
    val apiBaseUrl: String,
    val powerSyncUrl: String,
    val logLevel: LogLevel = LogLevel.defaultFor(environment),
    val syncIntervalSeconds: Int = defaultSyncInterval(environment),
    val enableCrashReporting: Boolean = environment != BuildEnvironment.DEBUG,
    val enableAnalytics: Boolean = environment == BuildEnvironment.RELEASE,
    val appVersion: String = "0.0.0",
    val platformName: String = "unknown",
) {
    init {
        require(apiBaseUrl.isNotBlank()) { "apiBaseUrl cannot be blank" }
        require(!apiBaseUrl.endsWith("/")) { "apiBaseUrl must not end with /" }
        require(powerSyncUrl.isNotBlank()) { "powerSyncUrl cannot be blank" }
        require(syncIntervalSeconds > 0) { "syncIntervalSeconds must be positive" }
    }

    /** Whether this is a non-production build (debug or staging). */
    val isDebugOrStaging: Boolean get() = environment != BuildEnvironment.RELEASE

    /** Whether this is a production release build. */
    val isRelease: Boolean get() = environment == BuildEnvironment.RELEASE

    /** Whether this is a local debug build. */
    val isDebug: Boolean get() = environment == BuildEnvironment.DEBUG

    companion object {
        /** Default sync intervals per environment. */
        fun defaultSyncInterval(env: BuildEnvironment): Int = when (env) {
            BuildEnvironment.DEBUG -> 15      // 15 s — fast feedback during development
            BuildEnvironment.STAGING -> 30    // 30 s — closer to prod cadence
            BuildEnvironment.RELEASE -> 60    // 60 s — production default
        }
    }
}

/**
 * Log severity levels for shared-layer logging.
 * Platform logging adapters (Timber, os_log, console) map these to native levels.
 */
@Serializable
enum class LogLevel {
    VERBOSE,
    DEBUG,
    INFO,
    WARN,
    ERROR,
    NONE;

    companion object {
        fun defaultFor(env: BuildEnvironment): LogLevel = when (env) {
            BuildEnvironment.DEBUG -> VERBOSE
            BuildEnvironment.STAGING -> DEBUG
            BuildEnvironment.RELEASE -> WARN
        }
    }
}
