// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for consent-history library.
 *
 * References: issue #1641
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadConsentHistory,
  recordConsentChange,
  recordBulkConsentChanges,
  exportConsentHistory,
  clearConsentHistory,
} from './consent-history';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('consent-history', () => {
  describe('loadConsentHistory', () => {
    it('returns empty array when no history exists', () => {
      expect(loadConsentHistory()).toEqual([]);
    });

    it('returns empty array for invalid JSON', () => {
      localStorage.setItem('finance-consent-history', 'not-json');
      expect(loadConsentHistory()).toEqual([]);
    });
  });

  describe('recordConsentChange', () => {
    it('records a single consent change', () => {
      const event = recordConsentChange('analytics', true, 'settings', '1.0.0');

      expect(event.category).toBe('analytics');
      expect(event.granted).toBe(true);
      expect(event.method).toBe('settings');
      expect(event.policyVersion).toBe('1.0.0');
      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('appends events to history', () => {
      recordConsentChange('analytics', true, 'settings', '1.0.0');
      recordConsentChange('sync', false, 'dashboard', '1.0.0');

      const history = loadConsentHistory();
      expect(history).toHaveLength(2);
      expect(history[0].category).toBe('analytics');
      expect(history[1].category).toBe('sync');
    });
  });

  describe('recordBulkConsentChanges', () => {
    it('records multiple changes at once', () => {
      const events = recordBulkConsentChanges(
        [
          { category: 'analytics', granted: true },
          { category: 'sync', granted: false },
        ],
        'bulk',
        '1.0.0',
      );

      expect(events).toHaveLength(2);
      expect(loadConsentHistory()).toHaveLength(2);
    });

    it('all events share the same timestamp', () => {
      const events = recordBulkConsentChanges(
        [
          { category: 'analytics', granted: true },
          { category: 'marketing', granted: true },
        ],
        'first_run',
        '1.0.0',
      );

      expect(events[0].timestamp).toBe(events[1].timestamp);
    });
  });

  describe('exportConsentHistory', () => {
    it('exports history as JSON string', () => {
      recordConsentChange('analytics', true, 'settings', '1.0.0');
      const exported = exportConsentHistory();
      const parsed = JSON.parse(exported);

      expect(parsed.type).toBe('gdpr_consent_history');
      expect(parsed.totalEvents).toBe(1);
      expect(parsed.events).toHaveLength(1);
      expect(parsed.exportedAt).toBeDefined();
    });
  });

  describe('clearConsentHistory', () => {
    it('removes all history', () => {
      recordConsentChange('analytics', true, 'settings', '1.0.0');
      expect(loadConsentHistory()).toHaveLength(1);

      clearConsentHistory();
      expect(loadConsentHistory()).toHaveLength(0);
    });
  });
});
