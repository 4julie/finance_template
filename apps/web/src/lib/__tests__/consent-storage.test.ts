// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  clearConsentData,
  DEFAULT_CONSENT,
  hasCompletedConsent,
  hasConsent,
  loadConsent,
  needsConsentRefresh,
  revokeAllConsent,
  saveConsent,
  updateConsent,
  exportConsentRecord,
  CURRENT_POLICY_VERSION,
  type ConsentRecord,
} from '../consent-storage';

describe('consent-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadConsent', () => {
    it('returns default consent when no record exists', () => {
      const consent = loadConsent();
      expect(consent.categories.essential).toBe(true);
      expect(consent.categories.analytics).toBe(false);
      expect(consent.categories.sync).toBe(false);
      expect(consent.hasCompletedFirstRun).toBe(false);
    });

    it('loads a previously saved consent record', () => {
      const record: ConsentRecord = {
        categories: {
          essential: true,
          analytics: true,
          error_reporting: false,
          sync: true,
          marketing: false,
        },
        timestamp: '2024-01-15T10:00:00Z',
        policyVersion: '1.0.0',
        method: 'settings',
        hasCompletedFirstRun: true,
      };
      saveConsent(record);

      const loaded = loadConsent();
      expect(loaded.categories.analytics).toBe(true);
      expect(loaded.categories.sync).toBe(true);
      expect(loaded.categories.marketing).toBe(false);
      expect(loaded.hasCompletedFirstRun).toBe(true);
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('finance-gdpr-consent', '{{{invalid json');
      const consent = loadConsent();
      expect(consent).toEqual(DEFAULT_CONSENT);
    });
  });

  describe('updateConsent', () => {
    it('updates specific categories and preserves others', () => {
      updateConsent({ analytics: true, sync: true });
      const consent = loadConsent();

      expect(consent.categories.analytics).toBe(true);
      expect(consent.categories.sync).toBe(true);
      expect(consent.categories.error_reporting).toBe(false);
      expect(consent.categories.marketing).toBe(false);
      expect(consent.hasCompletedFirstRun).toBe(true);
    });

    it('always keeps essential as true', () => {
      const result = updateConsent({});
      expect(result.categories.essential).toBe(true);
    });

    it('sets the current policy version', () => {
      const result = updateConsent({ analytics: true });
      expect(result.policyVersion).toBe(CURRENT_POLICY_VERSION);
    });

    it('records a timestamp', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));

      const result = updateConsent({ analytics: true });
      expect(result.timestamp).toBe('2024-06-15T12:00:00.000Z');

      vi.useRealTimers();
    });
  });

  describe('hasCompletedConsent', () => {
    it('returns false when no consent has been given', () => {
      expect(hasCompletedConsent()).toBe(false);
    });

    it('returns true after consent is given', () => {
      updateConsent({ analytics: true });
      expect(hasCompletedConsent()).toBe(true);
    });
  });

  describe('hasConsent', () => {
    it('returns true for essential even without explicit consent', () => {
      expect(hasConsent('essential')).toBe(true);
    });

    it('returns false for optional categories by default', () => {
      expect(hasConsent('analytics')).toBe(false);
      expect(hasConsent('marketing')).toBe(false);
    });

    it('returns true after granting consent', () => {
      updateConsent({ analytics: true });
      expect(hasConsent('analytics')).toBe(true);
    });
  });

  describe('needsConsentRefresh', () => {
    it('returns true when consent has never been given', () => {
      expect(needsConsentRefresh()).toBe(true);
    });

    it('returns false when consent is current', () => {
      updateConsent({ analytics: true });
      expect(needsConsentRefresh()).toBe(false);
    });

    it('returns true when policy version has changed', () => {
      const record: ConsentRecord = {
        categories: {
          essential: true,
          analytics: true,
          error_reporting: false,
          sync: false,
          marketing: false,
        },
        timestamp: new Date().toISOString(),
        policyVersion: '0.9.0', // Old version
        method: 'first_run',
        hasCompletedFirstRun: true,
      };
      saveConsent(record);

      expect(needsConsentRefresh()).toBe(true);
    });
  });

  describe('revokeAllConsent', () => {
    it('revokes all non-essential consent', () => {
      updateConsent({ analytics: true, sync: true, marketing: true });
      const revoked = revokeAllConsent();

      expect(revoked.categories.essential).toBe(true);
      expect(revoked.categories.analytics).toBe(false);
      expect(revoked.categories.sync).toBe(false);
      expect(revoked.categories.marketing).toBe(false);
    });
  });

  describe('clearConsentData', () => {
    it('removes all consent from localStorage', () => {
      updateConsent({ analytics: true });
      clearConsentData();

      expect(hasCompletedConsent()).toBe(false);
    });
  });

  describe('exportConsentRecord', () => {
    it('returns a valid JSON string', () => {
      updateConsent({ analytics: true });
      const exported = exportConsentRecord();
      const parsed = JSON.parse(exported);

      expect(parsed.type).toBe('gdpr_consent_record');
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.consent.categories.analytics).toBe(true);
    });
  });
});
