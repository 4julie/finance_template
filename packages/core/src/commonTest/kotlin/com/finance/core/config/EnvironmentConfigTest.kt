// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.config

import kotlin.test.*

class EnvironmentConfigTest {

    // ── Construction validation ──────────────────────────────────────

    @Test
    fun validDebugConfigIsCreated() {
        val config = EnvironmentConfig(
            environment = BuildEnvironment.DEBUG,
            apiBaseUrl = "http://localhost:8080/api",
            powerSyncUrl = "http://localhost:8081",
        )
        assertEquals(BuildEnvironment.DEBUG, config.environment)
        assertEquals("http://localhost:8080/api", config.apiBaseUrl)
    }

    @Test
    fun blankApiBaseUrlIsRejected() {
        assertFailsWith<IllegalArgumentException> {
            EnvironmentConfig(
                environment = BuildEnvironment.DEBUG,
                apiBaseUrl = "",
                powerSyncUrl = "http://localhost:8081",
            )
        }
    }

    @Test
    fun trailingSlashInApiBaseUrlIsRejected() {
        assertFailsWith<IllegalArgumentException> {
            EnvironmentConfig(
                environment = BuildEnvironment.DEBUG,
                apiBaseUrl = "http://localhost:8080/api/",
                powerSyncUrl = "http://localhost:8081",
            )
        }
    }

    @Test
    fun blankPowerSyncUrlIsRejected() {
        assertFailsWith<IllegalArgumentException> {
            EnvironmentConfig(
                environment = BuildEnvironment.DEBUG,
                apiBaseUrl = "http://localhost:8080/api",
                powerSyncUrl = "",
            )
        }
    }

    @Test
    fun zeroSyncIntervalIsRejected() {
        assertFailsWith<IllegalArgumentException> {
            EnvironmentConfig(
                environment = BuildEnvironment.DEBUG,
                apiBaseUrl = "http://localhost:8080/api",
                powerSyncUrl = "http://localhost:8081",
                syncIntervalSeconds = 0,
            )
        }
    }

    @Test
    fun negativeSyncIntervalIsRejected() {
        assertFailsWith<IllegalArgumentException> {
            EnvironmentConfig(
                environment = BuildEnvironment.RELEASE,
                apiBaseUrl = "https://api.finance.app/api",
                powerSyncUrl = "https://sync.finance.app",
                syncIntervalSeconds = -1,
            )
        }
    }

    // ── Default values per environment ───────────────────────────────

    @Test
    fun debugDefaultsAreCorrect() {
        val config = EnvironmentConfigs.debug()
        assertEquals(BuildEnvironment.DEBUG, config.environment)
        assertEquals(LogLevel.VERBOSE, config.logLevel)
        assertEquals(15, config.syncIntervalSeconds)
        assertFalse(config.enableCrashReporting)
        assertFalse(config.enableAnalytics)
        assertTrue(config.isDebug)
        assertFalse(config.isRelease)
        assertTrue(config.isDebugOrStaging)
    }

    @Test
    fun stagingDefaultsAreCorrect() {
        val config = EnvironmentConfigs.staging()
        assertEquals(BuildEnvironment.STAGING, config.environment)
        assertEquals(LogLevel.DEBUG, config.logLevel)
        assertEquals(30, config.syncIntervalSeconds)
        assertTrue(config.enableCrashReporting)
        assertFalse(config.enableAnalytics)
        assertFalse(config.isDebug)
        assertFalse(config.isRelease)
        assertTrue(config.isDebugOrStaging)
    }

    @Test
    fun releaseDefaultsAreCorrect() {
        val config = EnvironmentConfigs.release(
            appVersion = "1.0.0",
            platformName = "android",
        )
        assertEquals(BuildEnvironment.RELEASE, config.environment)
        assertEquals(LogLevel.WARN, config.logLevel)
        assertEquals(60, config.syncIntervalSeconds)
        assertTrue(config.enableCrashReporting)
        assertTrue(config.enableAnalytics)
        assertFalse(config.isDebug)
        assertTrue(config.isRelease)
        assertFalse(config.isDebugOrStaging)
        assertEquals("1.0.0", config.appVersion)
        assertEquals("android", config.platformName)
    }

    // ── forEnvironment factory ───────────────────────────────────────

    @Test
    fun forEnvironmentResolvesDebug() {
        val config = EnvironmentConfigs.forEnvironment(
            BuildEnvironment.DEBUG,
            appVersion = "1.0.0",
            platformName = "ios",
        )
        assertEquals(BuildEnvironment.DEBUG, config.environment)
        assertEquals("1.0.0", config.appVersion)
        assertEquals("ios", config.platformName)
    }

    @Test
    fun forEnvironmentResolvesStaging() {
        val config = EnvironmentConfigs.forEnvironment(BuildEnvironment.STAGING)
        assertEquals(BuildEnvironment.STAGING, config.environment)
    }

    @Test
    fun forEnvironmentResolvesRelease() {
        val config = EnvironmentConfigs.forEnvironment(
            BuildEnvironment.RELEASE,
            appVersion = "2.0.0",
            platformName = "web",
        )
        assertEquals(BuildEnvironment.RELEASE, config.environment)
    }

    // ── Custom overrides ─────────────────────────────────────────────

    @Test
    fun customApiUrlIsPreserved() {
        val config = EnvironmentConfigs.debug(
            apiBaseUrl = "http://10.0.2.2:8080/api",
        )
        assertEquals("http://10.0.2.2:8080/api", config.apiBaseUrl)
    }

    @Test
    fun customSyncIntervalIsPreserved() {
        val config = EnvironmentConfig(
            environment = BuildEnvironment.RELEASE,
            apiBaseUrl = "https://api.finance.app/api",
            powerSyncUrl = "https://sync.finance.app",
            syncIntervalSeconds = 120,
        )
        assertEquals(120, config.syncIntervalSeconds)
    }
}

class LogLevelTest {

    @Test
    fun debugEnvironmentDefaultsToVerbose() {
        assertEquals(LogLevel.VERBOSE, LogLevel.defaultFor(BuildEnvironment.DEBUG))
    }

    @Test
    fun stagingEnvironmentDefaultsToDebug() {
        assertEquals(LogLevel.DEBUG, LogLevel.defaultFor(BuildEnvironment.STAGING))
    }

    @Test
    fun releaseEnvironmentDefaultsToWarn() {
        assertEquals(LogLevel.WARN, LogLevel.defaultFor(BuildEnvironment.RELEASE))
    }
}
