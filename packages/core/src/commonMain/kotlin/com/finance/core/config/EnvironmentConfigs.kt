// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.config

/**
 * Pre-built [EnvironmentConfig] factories for each [BuildEnvironment].
 *
 * Platform apps call the appropriate factory and override platform-specific
 * fields (appVersion, platformName). These factories encode the canonical
 * URLs and defaults so that each platform doesn't have to duplicate them.
 *
 * Example (Android):
 * ```kotlin
 * val config = EnvironmentConfigs.forEnvironment(
 *     env = if (BuildConfig.DEBUG) BuildEnvironment.DEBUG else BuildEnvironment.RELEASE,
 *     appVersion = BuildConfig.VERSION_NAME,
 *     platformName = "android",
 * )
 * ```
 */
object EnvironmentConfigs {

    // ── Canonical URLs ───────────────────────────────────────────────

    private const val DEBUG_API_URL = "http://localhost:8080/api"
    private const val DEBUG_POWERSYNC_URL = "http://localhost:8081"

    private const val STAGING_API_URL = "https://staging-api.finance.app/api"
    private const val STAGING_POWERSYNC_URL = "https://staging-sync.finance.app"

    private const val RELEASE_API_URL = "https://api.finance.app/api"
    private const val RELEASE_POWERSYNC_URL = "https://sync.finance.app"

    // ── Factories ────────────────────────────────────────────────────

    /** Create a debug configuration. */
    fun debug(
        appVersion: String = "0.0.0-dev",
        platformName: String = "unknown",
        apiBaseUrl: String = DEBUG_API_URL,
        powerSyncUrl: String = DEBUG_POWERSYNC_URL,
    ): EnvironmentConfig = EnvironmentConfig(
        environment = BuildEnvironment.DEBUG,
        apiBaseUrl = apiBaseUrl,
        powerSyncUrl = powerSyncUrl,
        appVersion = appVersion,
        platformName = platformName,
    )

    /** Create a staging configuration. */
    fun staging(
        appVersion: String = "0.0.0-staging",
        platformName: String = "unknown",
        apiBaseUrl: String = STAGING_API_URL,
        powerSyncUrl: String = STAGING_POWERSYNC_URL,
    ): EnvironmentConfig = EnvironmentConfig(
        environment = BuildEnvironment.STAGING,
        apiBaseUrl = apiBaseUrl,
        powerSyncUrl = powerSyncUrl,
        appVersion = appVersion,
        platformName = platformName,
    )

    /** Create a release configuration. */
    fun release(
        appVersion: String,
        platformName: String,
        apiBaseUrl: String = RELEASE_API_URL,
        powerSyncUrl: String = RELEASE_POWERSYNC_URL,
    ): EnvironmentConfig = EnvironmentConfig(
        environment = BuildEnvironment.RELEASE,
        apiBaseUrl = apiBaseUrl,
        powerSyncUrl = powerSyncUrl,
        appVersion = appVersion,
        platformName = platformName,
    )

    /**
     * Resolve a config by [BuildEnvironment] enum — useful when the
     * environment is determined at runtime (e.g., from a Gradle-injected
     * build constant or a JS environment variable).
     */
    fun forEnvironment(
        env: BuildEnvironment,
        appVersion: String = "0.0.0",
        platformName: String = "unknown",
    ): EnvironmentConfig = when (env) {
        BuildEnvironment.DEBUG -> debug(appVersion = appVersion, platformName = platformName)
        BuildEnvironment.STAGING -> staging(appVersion = appVersion, platformName = platformName)
        BuildEnvironment.RELEASE -> release(appVersion = appVersion, platformName = platformName)
    }
}
