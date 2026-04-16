// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.analytics

import kotlinx.datetime.Instant
import kotlin.test.*

/**
 * Tests for [BufferedAnalyticsTracker] — consent gating, buffering,
 * auto-flush, overflow eviction, and transport delegation.
 */
class BufferedAnalyticsTrackerTest {

    private val fixedInstant = Instant.parse("2024-06-15T12:00:00Z")

    /** Captures events sent through the transport. */
    private class RecordingTransport : AnalyticsTransport {
        val sentBatches = mutableListOf<List<AnalyticsEvent>>()
        val userProperties = mutableMapOf<String, String>()
        var lastUserId: String? = null

        override fun sendEvents(events: List<AnalyticsEvent>) {
            sentBatches.add(events.toList())
        }

        override fun setUserProperty(key: String, value: String) {
            userProperties[key] = value
        }

        override fun setUserId(userId: String?) {
            this.lastUserId = userId
        }

        val totalEventsSent: Int get() = sentBatches.sumOf { it.size }
    }

    private fun sampleEvent(name: String = "test"): AnalyticsEvent =
        AnalyticsEvent.ScreenViewed(fixedInstant, name)

    // ── Consent gating ───────────────────────────────────────────────

    @Test
    fun trackIsNoOpWhenConsentDenied() {
        val transport = RecordingTransport()
        val tracker = BufferedAnalyticsTracker(
            consentProvider = { false },
            transport = transport,
        )

        tracker.track(sampleEvent())
        assertEquals(0, tracker.bufferedEventCount)
        assertEquals(0, transport.totalEventsSent)
    }

    @Test
    fun setUserPropertyIsNoOpWhenConsentDenied() {
        val transport = RecordingTransport()
        val tracker = BufferedAnalyticsTracker(
            consentProvider = { false },
            transport = transport,
        )

        tracker.setUserProperty("key", "value")
        assertTrue(transport.userProperties.isEmpty())
    }

    @Test
    fun setUserIdIsNoOpWhenConsentDeniedAndNonNull() {
        val transport = RecordingTransport()
        val tracker = BufferedAnalyticsTracker(
            consentProvider = { false },
            transport = transport,
        )

        tracker.setUserId("user-123")
        assertNull(transport.lastUserId)
    }

    @Test
    fun setUserIdAllowsNullEvenWithoutConsent() {
        val transport = RecordingTransport()
        // Start with consent to set a user ID
        var consent = true
        val tracker = BufferedAnalyticsTracker(
            consentProvider = { consent },
            transport = transport,
        )

        tracker.setUserId("user-123")
        assertEquals("user-123", transport.lastUserId)

        // Revoke consent, but clearing (null) should still work
        consent = false
        tracker.setUserId(null)
        assertNull(transport.lastUserId)
    }

    @Test
    fun isEnabledReflectsConsentProvider() {
        var consent = false
        val tracker = BufferedAnalyticsTracker(
            consentProvider = { consent },
            transport = RecordingTransport(),
        )

        assertFalse(tracker.isEnabled())
        consent = true
        assertTrue(tracker.isEnabled())
    }

    // ── Buffering ────────────────────────────────────────────────────

    @Test
    fun eventsBufferedUntilFlush() {
        val transport = RecordingTransport()
        val tracker = BufferedAnalyticsTracker(
            consentProvider = { true },
            transport = transport,
            maxBufferSize = 100,
        )

        // Track fewer than FLUSH_THRESHOLD events
        repeat(10) { tracker.track(sampleEvent("screen-$it")) }

        assertEquals(10, tracker.bufferedEventCount)
        assertEquals(0, transport.totalEventsSent, "Should not auto-flush below threshold")
    }

    @Test
    fun flushSendsAllBufferedEvents() {
        val transport = RecordingTransport()
        val tracker = BufferedAnalyticsTracker(
            consentProvider = { true },
            transport = transport,
            maxBufferSize = 100,
        )

        repeat(10) { tracker.track(sampleEvent("screen-$it")) }
        tracker.flush()

        assertEquals(0, tracker.bufferedEventCount)
        assertEquals(10, transport.totalEventsSent)
    }

    @Test
    fun flushIsNoOpWhenBufferEmpty() {
        val transport = RecordingTransport()
        val tracker = BufferedAnalyticsTracker(
            consentProvider = { true },
            transport = transport,
        )

        tracker.flush()
        assertTrue(transport.sentBatches.isEmpty())
    }

    @Test
    fun flushClearsBufferWhenConsentRevoked() {
        val transport = RecordingTransport()
        var consent = true
        val tracker = BufferedAnalyticsTracker(
            consentProvider = { consent },
            transport = transport,
            maxBufferSize = 100,
        )

        repeat(10) { tracker.track(sampleEvent()) }
        assertEquals(10, tracker.bufferedEventCount)

        consent = false
        tracker.flush()

        assertEquals(0, tracker.bufferedEventCount)
        assertEquals(0, transport.totalEventsSent, "Events should be discarded, not sent")
    }

    // ── Overflow eviction ────────────────────────────────────────────

    @Test
    fun bufferOverflowEvictsOldestEvent() {
        val transport = RecordingTransport()
        val tracker = BufferedAnalyticsTracker(
            consentProvider = { true },
            transport = transport,
            maxBufferSize = 5,
        )

        // Track 5 events (fills buffer) — note: small buffer means auto-flush triggers
        // We need maxBufferSize > FLUSH_THRESHOLD for this test
        // Actually FLUSH_THRESHOLD is 50, so with maxBufferSize=5, auto-flush won't trigger
        // because 5 < 50. But eviction happens at 5.
        repeat(5) { tracker.track(sampleEvent("screen-$it")) }
        assertEquals(5, tracker.bufferedEventCount)
        assertEquals(0L, tracker.droppedEventCount)

        // 6th event should evict the oldest
        tracker.track(sampleEvent("screen-5"))
        assertEquals(5, tracker.bufferedEventCount)
        assertEquals(1L, tracker.droppedEventCount)
    }

    // ── Transport delegation ─────────────────────────────────────────

    @Test
    fun setUserPropertyDelegatesToTransport() {
        val transport = RecordingTransport()
        val tracker = BufferedAnalyticsTracker(
            consentProvider = { true },
            transport = transport,
        )

        tracker.setUserProperty("plan_type", "premium")
        assertEquals("premium", transport.userProperties["plan_type"])
    }

    @Test
    fun setUserIdDelegatesToTransport() {
        val transport = RecordingTransport()
        val tracker = BufferedAnalyticsTracker(
            consentProvider = { true },
            transport = transport,
        )

        tracker.setUserId("pseudo-abc")
        assertEquals("pseudo-abc", transport.lastUserId)
    }
}
