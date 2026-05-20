// SPDX-License-Identifier: BUSL-1.1

/**
 * ConsentHistoryViewer — displays a timeline of consent changes.
 *
 * Shows when each consent category was granted or withdrawn with
 * timestamps, providing transparent proof of consent decisions.
 *
 * References: issue #1641 (granular consent management with proof)
 */

import React, { useCallback, useState } from 'react';
import { useConsentHistory } from '../../hooks/useConsentHistory';
import { CONSENT_LABELS, type ConsentCategory } from '../../lib/consent-storage';
import type { ConsentEvent } from '../../lib/consent-history';
import './consent-history.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Human-readable method label. */
const METHOD_LABELS: Record<ConsentEvent['method'], string> = {
  first_run: 'First Run',
  settings: 'Settings',
  banner: 'Consent Banner',
  dashboard: 'Privacy Dashboard',
  bulk: 'Bulk Action',
};

/** Format a date for display. */
function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ConsentHistoryViewerProps {
  /** Optional filter to show only specific categories. */
  readonly filterCategory?: ConsentCategory;
}

/** Timeline view of consent changes with export capability. */
export const ConsentHistoryViewer: React.FC<ConsentHistoryViewerProps> = ({ filterCategory }) => {
  const { history, exportHistory } = useConsentHistory();
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const filteredHistory = filterCategory
    ? history.filter((e) => e.category === filterCategory)
    : history;

  const handleExport = useCallback(() => {
    try {
      const data = exportHistory();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `consent-history-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(anchor);
      }, 100);
      setExportMessage('Consent history exported successfully.');
      setTimeout(() => setExportMessage(null), 4000);
    } catch {
      setExportMessage('Failed to export consent history.');
    }
  }, [exportHistory]);

  return (
    <section className="consent-history" aria-label="Consent history">
      <div className="consent-history__header">
        <h3 className="consent-history__title">Consent History</h3>
        <button
          type="button"
          className="consent-history__export-btn"
          onClick={handleExport}
          aria-label="Export consent history as JSON"
        >
          Export History
        </button>
      </div>

      {exportMessage && (
        <div role="status" aria-live="polite" className="consent-history__status">
          {exportMessage}
        </div>
      )}

      {filteredHistory.length === 0 ? (
        <p className="consent-history__empty">No consent changes recorded yet.</p>
      ) : (
        <ol className="consent-history__timeline" role="list" aria-label="Consent change timeline">
          {filteredHistory.map((event) => (
            <li
              key={event.id}
              className={`consent-history__event ${
                event.granted
                  ? 'consent-history__event--granted'
                  : 'consent-history__event--withdrawn'
              }`}
              role="listitem"
              aria-label={`${CONSENT_LABELS[event.category]} ${event.granted ? 'granted' : 'withdrawn'} on ${formatDate(event.timestamp)}`}
            >
              <span className="consent-history__event-indicator" aria-hidden="true">
                {event.granted ? '✓' : '✕'}
              </span>
              <div className="consent-history__event-content">
                <div className="consent-history__event-header">
                  <span className="consent-history__event-category">
                    {CONSENT_LABELS[event.category]}
                  </span>
                  <span
                    className={`consent-history__event-badge ${
                      event.granted
                        ? 'consent-history__event-badge--granted'
                        : 'consent-history__event-badge--withdrawn'
                    }`}
                  >
                    {event.granted ? 'Granted' : 'Withdrawn'}
                  </span>
                </div>
                <div className="consent-history__event-meta">
                  <time dateTime={event.timestamp} className="consent-history__event-time">
                    {formatDate(event.timestamp)}
                  </time>
                  <span className="consent-history__event-method">
                    via {METHOD_LABELS[event.method]}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default ConsentHistoryViewer;
