// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.config

import kotlin.test.*

class ConfigProviderTest {

    @BeforeTest
    fun setUp() {
        ConfigProvider.reset()
    }

    @AfterTest
    fun tearDown() {
        ConfigProvider.reset()
    }

    @Test
    fun throwsWhenNotInitialized() {
        assertFalse(ConfigProvider.isInitialized)
        assertFailsWith<IllegalStateException> {
            ConfigProvider.config
        }
    }

    @Test
    fun initializeSetsConfig() {
        val config = EnvironmentConfigs.debug(appVersion = "1.0.0", platformName = "test")
        ConfigProvider.initialize(config)

        assertTrue(ConfigProvider.isInitialized)
        assertEquals(config, ConfigProvider.config)
    }

    @Test
    fun convenienceAccessorsWork() {
        val config = EnvironmentConfigs.staging(appVersion = "2.0.0", platformName = "ios")
        ConfigProvider.initialize(config)

        assertEquals(BuildEnvironment.STAGING, ConfigProvider.environment)
        assertEquals(config.apiBaseUrl, ConfigProvider.apiBaseUrl)
        assertEquals(config.powerSyncUrl, ConfigProvider.powerSyncUrl)
        assertEquals(LogLevel.DEBUG, ConfigProvider.logLevel)
        assertFalse(ConfigProvider.isDebug)
        assertFalse(ConfigProvider.isRelease)
    }

    @Test
    fun reinitializeOverwritesPrevious() {
        ConfigProvider.initialize(EnvironmentConfigs.debug())
        assertEquals(BuildEnvironment.DEBUG, ConfigProvider.environment)

        ConfigProvider.initialize(EnvironmentConfigs.release(appVersion = "1.0.0", platformName = "android"))
        assertEquals(BuildEnvironment.RELEASE, ConfigProvider.environment)
    }

    @Test
    fun resetClearsConfig() {
        ConfigProvider.initialize(EnvironmentConfigs.debug())
        assertTrue(ConfigProvider.isInitialized)

        ConfigProvider.reset()
        assertFalse(ConfigProvider.isInitialized)
    }

    @Test
    fun configFlowEmitsNullBeforeInit() {
        assertNull(ConfigProvider.configFlow.value)
    }

    @Test
    fun configFlowEmitsConfigAfterInit() {
        val config = EnvironmentConfigs.debug()
        ConfigProvider.initialize(config)
        assertEquals(config, ConfigProvider.configFlow.value)
    }
}
