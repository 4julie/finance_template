// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.data

import kotlinx.datetime.Instant

/**
 * Test hooks for SampleData to allow tests to pin the current time.
 * Keep in the same package so tests can call these helpers without
 * forcing SampleData initialization.
 */
@Volatile
internal var sampleDataTestNow: Instant? = null

/**
 * Set a fixed Instant for SampleData generation. Pass null to reset to wall-clock time.
 */
fun setSampleDataNowForTests(instant: Instant?) {
    sampleDataTestNow = instant
}

/**
 * Convenience to reset SampleData to use the real system clock.
 */
fun resetSampleDataNowForTests() {
    sampleDataTestNow = null
}
