// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.config

import kotlinx.serialization.Serializable

/**
 * Build environment variant.
 *
 * Each variant defines different behavior for API endpoints, logging,
 * sync frequency, and feature availability. Platform build systems
 * (Gradle buildTypes, Xcode schemes, Webpack modes) select the variant.
 */
@Serializable
enum class BuildEnvironment {
    /** Local development — verbose logging, mock-friendly, short sync intervals. */
    DEBUG,

    /** Pre-release testing against staging backend — moderate logging. */
    STAGING,

    /** Production release — minimal logging, real backend, strict security. */
    RELEASE,
}
