// SPDX-License-Identifier: BUSL-1.1

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPreferredAuthMethod,
  getPasskeyPromptDismissedAt,
  getPreferredAuthMethod,
  markPasskeyPromptDismissed,
  PASSKEY_PROMPT_COOLDOWN_MS,
  setPreferredAuthMethod,
  shouldShowPasskeyPrompt,
} from '../preferred-auth-method';

const STORAGE_KEY_PREFERRED = 'finance:preferred-auth-method';
const STORAGE_KEY_DISMISSED_AT = 'finance:passkey-prompt-dismissed-at';

describe('preferred-auth-method', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  describe('getPreferredAuthMethod', () => {
    it('returns null when nothing is stored', () => {
      expect(getPreferredAuthMethod()).toBeNull();
    });

    it('returns "passkey" when set to passkey', () => {
      localStorage.setItem(STORAGE_KEY_PREFERRED, 'passkey');
      expect(getPreferredAuthMethod()).toBe('passkey');
    });

    it('returns "password" when set to password', () => {
      localStorage.setItem(STORAGE_KEY_PREFERRED, 'password');
      expect(getPreferredAuthMethod()).toBe('password');
    });

    it('returns null for unrecognised values', () => {
      localStorage.setItem(STORAGE_KEY_PREFERRED, 'something-else');
      expect(getPreferredAuthMethod()).toBeNull();
    });

    it('returns null when localStorage throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('disabled');
      });
      try {
        expect(getPreferredAuthMethod()).toBeNull();
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('setPreferredAuthMethod', () => {
    it('persists "passkey" to localStorage', () => {
      setPreferredAuthMethod('passkey');
      expect(localStorage.getItem(STORAGE_KEY_PREFERRED)).toBe('passkey');
    });

    it('persists "password" to localStorage', () => {
      setPreferredAuthMethod('password');
      expect(localStorage.getItem(STORAGE_KEY_PREFERRED)).toBe('password');
    });

    it('is idempotent (overwrites without throwing)', () => {
      setPreferredAuthMethod('passkey');
      setPreferredAuthMethod('passkey');
      setPreferredAuthMethod('password');
      expect(localStorage.getItem(STORAGE_KEY_PREFERRED)).toBe('password');
    });

    it('swallows localStorage errors silently', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      try {
        expect(() => setPreferredAuthMethod('passkey')).not.toThrow();
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('markPasskeyPromptDismissed', () => {
    it('stores the current epoch ms', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));

      markPasskeyPromptDismissed();

      const stored = localStorage.getItem(STORAGE_KEY_DISMISSED_AT);
      expect(stored).toBe(String(Date.parse('2025-06-15T12:00:00.000Z')));
      expect(getPasskeyPromptDismissedAt()).toBe(Date.parse('2025-06-15T12:00:00.000Z'));
    });

    it('overwrites a previous dismissal timestamp', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
      markPasskeyPromptDismissed();
      const first = getPasskeyPromptDismissedAt();

      vi.setSystemTime(new Date('2025-02-01T00:00:00.000Z'));
      markPasskeyPromptDismissed();
      const second = getPasskeyPromptDismissedAt();

      expect(second).not.toBe(first);
      expect(second).toBe(Date.parse('2025-02-01T00:00:00.000Z'));
    });
  });

  describe('shouldShowPasskeyPrompt', () => {
    it('returns true when nothing has been stored', () => {
      expect(shouldShowPasskeyPrompt()).toBe(true);
    });

    it('returns false when a preference (passkey) is already recorded', () => {
      setPreferredAuthMethod('passkey');
      expect(shouldShowPasskeyPrompt()).toBe(false);
    });

    it('returns false when a preference (password) is already recorded', () => {
      setPreferredAuthMethod('password');
      expect(shouldShowPasskeyPrompt()).toBe(false);
    });

    it('returns false within the 30-day cooldown after a dismissal', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
      markPasskeyPromptDismissed();

      // 29 days later
      vi.setSystemTime(new Date('2025-06-30T00:00:00.000Z'));
      expect(shouldShowPasskeyPrompt()).toBe(false);
    });

    it('returns true once the 30-day cooldown elapses', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
      markPasskeyPromptDismissed();

      vi.setSystemTime(Date.now() + PASSKEY_PROMPT_COOLDOWN_MS + 1);
      expect(shouldShowPasskeyPrompt()).toBe(true);
    });

    it('still suppresses when both dismissal AND preference are present', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'));
      markPasskeyPromptDismissed();
      setPreferredAuthMethod('password');

      vi.setSystemTime(Date.now() + PASSKEY_PROMPT_COOLDOWN_MS + 1);
      // Preference is still recorded → don't nag, even after cooldown.
      expect(shouldShowPasskeyPrompt()).toBe(false);
    });
  });

  describe('clearPreferredAuthMethod', () => {
    it('removes both stored keys', () => {
      setPreferredAuthMethod('passkey');
      markPasskeyPromptDismissed();

      clearPreferredAuthMethod();

      expect(localStorage.getItem(STORAGE_KEY_PREFERRED)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY_DISMISSED_AT)).toBeNull();
      expect(getPreferredAuthMethod()).toBeNull();
      expect(getPasskeyPromptDismissedAt()).toBeNull();
    });
  });
});
