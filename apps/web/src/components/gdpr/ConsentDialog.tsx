// SPDX-License-Identifier: BUSL-1.1

/**
 * ConsentDialog — first-run GDPR consent capture dialog.
 *
 * Displays on first visit (or when the privacy policy version changes).
 * Uses a modal dialog with focus trapping for accessibility.
 *
 * Features:
 *   - Granular opt-in per consent category
 *   - "Accept All" / "Reject All" / "Save Preferences" actions
 *   - Accessible modal with focus trap and keyboard navigation
 *   - Links to privacy policy
 *   - ARIA labelled and described
 *
 * References: issue #443 (GDPR consent — critical legal blocker)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CONSENT_DESCRIPTIONS,
  CONSENT_LABELS,
  type ConsentCategory,
} from '../../lib/consent-storage';
import { useConsent } from '../../hooks/useConsent';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Categories the user can toggle (essential is always on). */
const TOGGLEABLE_CATEGORIES: ConsentCategory[] = [
  'analytics',
  'error_reporting',
  'sync',
  'marketing',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ConsentDialogProps {
  /** Called after the user makes a consent decision. */
  onComplete?: () => void;
}

/**
 * First-run consent dialog for GDPR compliance.
 *
 * Renders as a modal overlay. Traps focus within the dialog.
 * Only renders when `needsConsent` is true.
 */
export const ConsentDialog: React.FC<ConsentDialogProps> = ({ onComplete }) => {
  const { needsConsent, consent, acceptAll, rejectAll, savePreferences } = useConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [localPreferences, setLocalPreferences] = useState<Record<ConsentCategory, boolean>>({
    essential: true,
    analytics: consent.categories.analytics,
    error_reporting: consent.categories.error_reporting,
    sync: consent.categories.sync,
    marketing: consent.categories.marketing,
  });

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focus the dialog on mount
  useEffect(() => {
    if (needsConsent) {
      firstFocusRef.current?.focus();
    }
  }, [needsConsent]);

  // Trap keyboard focus within the dialog
  useEffect(() => {
    if (!needsConsent) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't allow dismissal without a decision
        e.preventDefault();
        return;
      }

      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [needsConsent]);

  const handleAcceptAll = useCallback(() => {
    acceptAll();
    onComplete?.();
  }, [acceptAll, onComplete]);

  const handleRejectAll = useCallback(() => {
    rejectAll();
    onComplete?.();
  }, [rejectAll, onComplete]);

  const handleSavePreferences = useCallback(() => {
    savePreferences(localPreferences);
    onComplete?.();
  }, [savePreferences, localPreferences, onComplete]);

  const handleToggle = useCallback((category: ConsentCategory) => {
    if (category === 'essential') return; // Can't disable essential
    setLocalPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  if (!needsConsent) {
    return null;
  }

  return (
    <div
      className="consent-overlay"
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 'var(--spacing-4, 1rem)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        aria-describedby="consent-description"
        style={{
          backgroundColor: 'var(--semantic-surface-primary, #ffffff)',
          borderRadius: 'var(--border-radius-lg, 0.75rem)',
          maxWidth: '32rem',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 'var(--spacing-6, 1.5rem)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-4, 1rem)' }}>
          <h2
            id="consent-title"
            style={{
              fontSize: 'var(--type-scale-headline-font-size, 1.25rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--semantic-text-primary, #111827)',
              marginBottom: 'var(--spacing-2, 0.5rem)',
            }}
          >
            Your Privacy Matters
          </h2>
          <p
            id="consent-description"
            style={{
              fontSize: 'var(--type-scale-body-font-size, 0.875rem)',
              color: 'var(--semantic-text-secondary, #6b7280)',
              lineHeight: 1.5,
            }}
          >
            We use cookies and similar technologies to provide core functionality and improve your
            experience. You can choose which optional data processing to allow. Your financial data
            is always encrypted and private.
          </p>
        </div>

        {/* Quick actions */}
        {!showDetails && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-3, 0.75rem)',
              marginBottom: 'var(--spacing-4, 1rem)',
            }}
          >
            <button
              ref={firstFocusRef}
              type="button"
              onClick={handleAcceptAll}
              className="consent-button consent-button--primary"
              style={{
                width: '100%',
                padding: 'var(--spacing-3, 0.75rem) var(--spacing-4, 1rem)',
                borderRadius: 'var(--border-radius-md, 0.5rem)',
                border: 'none',
                backgroundColor: 'var(--semantic-interactive-default, #2563eb)',
                color: 'white',
                fontWeight: 'var(--font-weight-medium, 500)',
                fontSize: 'var(--type-scale-body-font-size, 0.875rem)',
                cursor: 'pointer',
              }}
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={handleRejectAll}
              className="consent-button consent-button--secondary"
              style={{
                width: '100%',
                padding: 'var(--spacing-3, 0.75rem) var(--spacing-4, 1rem)',
                borderRadius: 'var(--border-radius-md, 0.5rem)',
                border: '1px solid var(--semantic-border-default, #d1d5db)',
                backgroundColor: 'transparent',
                color: 'var(--semantic-text-primary, #111827)',
                fontWeight: 'var(--font-weight-medium, 500)',
                fontSize: 'var(--type-scale-body-font-size, 0.875rem)',
                cursor: 'pointer',
              }}
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="consent-button consent-button--link"
              style={{
                width: '100%',
                padding: 'var(--spacing-2, 0.5rem)',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--semantic-interactive-default, #2563eb)',
                fontSize: 'var(--type-scale-caption-font-size, 0.75rem)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Customize Preferences
            </button>
          </div>
        )}

        {/* Detailed preferences */}
        {showDetails && (
          <div style={{ marginBottom: 'var(--spacing-4, 1rem)' }}>
            <fieldset
              style={{ border: 'none', padding: 0, margin: 0 }}
              aria-label="Privacy preferences"
            >
              <legend
                style={{
                  fontSize: 'var(--type-scale-body-font-size, 0.875rem)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  color: 'var(--semantic-text-primary, #111827)',
                  marginBottom: 'var(--spacing-3, 0.75rem)',
                }}
              >
                Choose which data processing to allow:
              </legend>

              {/* Essential — always on */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--spacing-3, 0.75rem)',
                  padding: 'var(--spacing-3, 0.75rem)',
                  borderBottom: '1px solid var(--semantic-border-default, #e5e7eb)',
                  opacity: 0.7,
                }}
              >
                <input
                  type="checkbox"
                  checked
                  disabled
                  aria-label={`${CONSENT_LABELS.essential} (required)`}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <span
                    style={{
                      fontWeight: 'var(--font-weight-medium, 500)',
                      fontSize: 'var(--type-scale-body-font-size, 0.875rem)',
                      color: 'var(--semantic-text-primary, #111827)',
                    }}
                  >
                    {CONSENT_LABELS.essential}{' '}
                    <span
                      style={{
                        fontSize: 'var(--type-scale-caption-font-size, 0.75rem)',
                        color: 'var(--semantic-text-tertiary, #9ca3af)',
                      }}
                    >
                      (required)
                    </span>
                  </span>
                  <p
                    style={{
                      margin: 'var(--spacing-1, 0.25rem) 0 0',
                      fontSize: 'var(--type-scale-caption-font-size, 0.75rem)',
                      color: 'var(--semantic-text-secondary, #6b7280)',
                    }}
                  >
                    {CONSENT_DESCRIPTIONS.essential}
                  </p>
                </div>
              </div>

              {/* Toggleable categories */}
              {TOGGLEABLE_CATEGORIES.map((category) => (
                <div
                  key={category}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--spacing-3, 0.75rem)',
                    padding: 'var(--spacing-3, 0.75rem)',
                    borderBottom: '1px solid var(--semantic-border-default, #e5e7eb)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={localPreferences[category]}
                    onChange={() => handleToggle(category)}
                    aria-label={CONSENT_LABELS[category]}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <span
                      style={{
                        fontWeight: 'var(--font-weight-medium, 500)',
                        fontSize: 'var(--type-scale-body-font-size, 0.875rem)',
                        color: 'var(--semantic-text-primary, #111827)',
                      }}
                    >
                      {CONSENT_LABELS[category]}
                    </span>
                    <p
                      style={{
                        margin: 'var(--spacing-1, 0.25rem) 0 0',
                        fontSize: 'var(--type-scale-caption-font-size, 0.75rem)',
                        color: 'var(--semantic-text-secondary, #6b7280)',
                      }}
                    >
                      {CONSENT_DESCRIPTIONS[category]}
                    </p>
                  </div>
                </div>
              ))}
            </fieldset>

            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-3, 0.75rem)',
                marginTop: 'var(--spacing-4, 1rem)',
              }}
            >
              <button
                ref={firstFocusRef}
                type="button"
                onClick={handleSavePreferences}
                style={{
                  flex: 1,
                  padding: 'var(--spacing-3, 0.75rem)',
                  borderRadius: 'var(--border-radius-md, 0.5rem)',
                  border: 'none',
                  backgroundColor: 'var(--semantic-interactive-default, #2563eb)',
                  color: 'white',
                  fontWeight: 'var(--font-weight-medium, 500)',
                  cursor: 'pointer',
                }}
              >
                Save Preferences
              </button>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                style={{
                  padding: 'var(--spacing-3, 0.75rem)',
                  borderRadius: 'var(--border-radius-md, 0.5rem)',
                  border: '1px solid var(--semantic-border-default, #d1d5db)',
                  backgroundColor: 'transparent',
                  color: 'var(--semantic-text-secondary, #6b7280)',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Footer with privacy policy link */}
        <p
          style={{
            fontSize: 'var(--type-scale-caption-font-size, 0.75rem)',
            color: 'var(--semantic-text-tertiary, #9ca3af)',
            textAlign: 'center',
            marginTop: 'var(--spacing-2, 0.5rem)',
          }}
        >
          By using this app, you agree to our{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--semantic-interactive-default, #2563eb)',
              textDecoration: 'underline',
            }}
          >
            Privacy Policy
          </a>
          . You can change your preferences at any time in Settings.
        </p>
      </div>
    </div>
  );
};

export default ConsentDialog;
