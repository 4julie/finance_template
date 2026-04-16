// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.analytics

/**
 * An [AnalyticsTracker] that buffers events in memory and delegates
 * flushing to a platform-specific [AnalyticsTransport].
 *
 * This class implements consent gating, buffering, and batch flushing
 * in commonMain so platform implementations only need to provide a
 * lightweight [AnalyticsTransport] adapter.
 *
 * Events are buffered up to [maxBufferSize]. When the buffer is full,
 * the oldest events are dropped (FIFO eviction) and the overflow is
 * counted in [droppedEventCount] for monitoring.
 *
 * Thread-safety: this class is **not** thread-safe. Confine usage to
 * a single coroutine dispatcher or synchronise externally.
 *
 * @param consentProvider Returns true when the user has opted in to analytics.
 * @param transport Platform-specific transport for sending events.
 * @param maxBufferSize Maximum number of events to buffer before eviction.
 */
class BufferedAnalyticsTracker(
    private val consentProvider: () -> Boolean,
    private val transport: AnalyticsTransport,
    private val maxBufferSize: Int = DEFAULT_BUFFER_SIZE,
) : AnalyticsTracker {

    private val buffer = mutableListOf<AnalyticsEvent>()
    private val userProperties = mutableMapOf<String, String>()
    private var userId: String? = null

    /** Number of events dropped due to buffer overflow since creation. */
    var droppedEventCount: Long = 0L
        private set

    /** Number of events currently in the buffer. */
    val bufferedEventCount: Int get() = buffer.size

    override fun track(event: AnalyticsEvent) {
        if (!consentProvider()) return

        if (buffer.size >= maxBufferSize) {
            buffer.removeAt(0)
            droppedEventCount++
        }
        buffer.add(event)

        if (buffer.size >= FLUSH_THRESHOLD) {
            flush()
        }
    }

    override fun setUserProperty(key: String, value: String) {
        if (!consentProvider()) return
        userProperties[key] = value
        transport.setUserProperty(key, value)
    }

    override fun setUserId(userId: String?) {
        if (!consentProvider() && userId != null) return
        this.userId = userId
        transport.setUserId(userId)
    }

    override fun isEnabled(): Boolean = consentProvider()

    override fun flush() {
        if (buffer.isEmpty()) return
        if (!consentProvider()) {
            buffer.clear()
            return
        }

        val batch = buffer.toList()
        buffer.clear()
        transport.sendEvents(batch)
    }

    companion object {
        /** Default maximum buffer size. */
        const val DEFAULT_BUFFER_SIZE = 500

        /** Auto-flush when buffer reaches this percentage of max. */
        private const val FLUSH_THRESHOLD = 50
    }
}

/**
 * Platform-specific transport adapter for sending analytics events
 * to the analytics backend.
 *
 * Platform apps implement this interface to bridge to their chosen
 * analytics SDK (Firebase, Amplitude, PostHog, etc.).
 *
 * Implementations should:
 * - Handle network failures gracefully (events can be lost if send fails).
 * - Not block the calling thread — schedule transmission asynchronously.
 * - Never log or persist PII.
 */
interface AnalyticsTransport {

    /**
     * Send a batch of analytics events to the backend.
     *
     * @param events The events to send. May be empty.
     */
    fun sendEvents(events: List<AnalyticsEvent>)

    /**
     * Set a persistent user property on the analytics backend.
     */
    fun setUserProperty(key: String, value: String)

    /**
     * Set the pseudonymous user ID on the analytics backend.
     */
    fun setUserId(userId: String?)
}

/**
 * No-op [AnalyticsTransport] for testing and disabled environments.
 */
object NoOpAnalyticsTransport : AnalyticsTransport {
    override fun sendEvents(events: List<AnalyticsEvent>) = Unit
    override fun setUserProperty(key: String, value: String) = Unit
    override fun setUserId(userId: String?) = Unit
}
