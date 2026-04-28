// SPDX-License-Identifier: BUSL-1.1

plugins {
    alias(libs.plugins.kotlin.multiplatform) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.sqldelight) apply false
    alias(libs.plugins.detekt)
    alias(libs.plugins.compose.multiplatform) apply false
    alias(libs.plugins.kotlin.jvm) apply false
}

// Configure detekt for all Kotlin files in the project
detekt {
    basePath = projectDir.absolutePath
    config.setFrom("$rootDir/config/detekt/detekt.yml")
    source.setFrom("$rootDir/build-logic", "$rootDir/packages", "$rootDir/apps")
    parallel = true
    ignoreFailures = true
    buildUponDefaultConfig = true
}
