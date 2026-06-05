// SPDX-License-Identifier: BUSL-1.1

/**
 * Preferred authentication method tracking (#1983)
 *
 * Persists the user's preferred sign-in method (passkey vs password) and
 * the timestamp at which they last dismissed the passkey setup prompt.
 *
 * Used to:
 *   - Drive the login page layout (biometric-first vs email/password-first).
 *   - Avoid repeatedly nagging users who dismissed the passkey prompt.
 *
 * Storage keys (all under the `finance:` prefix to match existing conventions):
 *   - `finance:preferred-auth-method`     → `'passkey' | 'password'`
 *   - `finance:passkey-prompt-dismissed-at` → epoch milliseconds
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFERRED = 'finance:preferred-auth-method';
const STORAGE_KEY_DISMISSED_AT = 'finance:passkey-prompt-dismissed-at';

/** Cooldown window after which the passkey prompt may re-appear. */
export const PASSKEY_PROMPT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PreferredAuthMethod = 'passkey' | 'password';

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

/**
 * Read the user's preferred authentication method, if one has been recorded.
 *
 * @returns `'passkey' | 'password' | null`
 */
export function getPreferredAuthMethod(): PreferredAuthMethod | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY_PREFERRED);
    if (value === 'passkey' || value === 'password') {
      return value;
    }
  } catch {
    // localStorage unavailable
  }
  return null;
}

/**
 * Record the user's preferred authentication method.
 *
 * Idempotent — safe to call on every successful sign-in.
 */
export function setPreferredAuthMethod(value: PreferredAuthMethod): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFERRED, value);
  } catch {
    // localStorage unavailable — silently fail
  }
}

/**
 * Record the timestamp at which the user dismissed the passkey setup prompt,
 * starting a {@link PASSKEY_PROMPT_COOLDOWN_MS} cooldown.
 */
export function markPasskeyPromptDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY_DISMISSED_AT, String(Date.now()));
  } catch {
    // localStorage unavailable — silently fail
  }
}

/**
 * Read the dismissal timestamp, if any.
 *
 * @returns epoch ms, or `null` if never dismissed / unreadable.
 */
export function getPasskeyPromptDismissedAt(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISMISSED_AT);
    if (raw === null) {
      return null;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Determine whether the passkey setup prompt should be shown right now.
 *
 * Returns `false` when:
 *   - The user already has a preferred auth method recorded (either way), or
 *   - The user dismissed the prompt within the last
 *     {@link PASSKEY_PROMPT_COOLDOWN_MS} window.
 *
 * Otherwise returns `true`.
 */
export function shouldShowPasskeyPrompt(): boolean {
  if (getPreferredAuthMethod() !== null) {
    return false;
  }

  const dismissedAt = getPasskeyPromptDismissedAt();
  if (dismissedAt !== null && Date.now() - dismissedAt < PASSKEY_PROMPT_COOLDOWN_MS) {
    return false;
  }

  return true;
}

/**
 * Forget all preferred-auth-method state. Useful for account deletion.
 */
export function clearPreferredAuthMethod(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFERRED);
    localStorage.removeItem(STORAGE_KEY_DISMISSED_AT);
  } catch {
    // localStorage unavailable — silently fail
  }
}
