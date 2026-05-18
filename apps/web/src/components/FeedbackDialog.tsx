// SPDX-License-Identifier: BUSL-1.1

/**
 * FeedbackDialog — Modal form for users to report bugs, give feedback, or suggest features.
 *
 * For alpha: stores submissions in localStorage. Backend integration planned.
 *
 * @module components/FeedbackDialog
 * References: issue #1476
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Feedback submission type. */
export type FeedbackType = 'bug' | 'feedback' | 'suggestion';

/** A stored feedback entry. */
export interface FeedbackEntry {
  id: string;
  type: FeedbackType;
  description: string;
  email: string;
  timestamp: string;
}

export interface FeedbackDialogProps {
  /** Whether the dialog is visible. */
  isOpen: boolean;
  /** Called when the dialog should close. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'finance_feedback_entries';

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'suggestion', label: 'Suggestion' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Accessible feedback dialog with focus trapping and localStorage persistence.
 */
export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ isOpen, onClose }) => {
  const [type, setType] = useState<FeedbackType>('feedback');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLSelectElement>(null);

  // Reset form state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setType('feedback');
      setDescription('');
      setEmail('');
      setSubmitted(false);
      setError(null);
      // Focus first input on open
      requestAnimationFrame(() => {
        firstInputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!description.trim()) {
        setError('Please provide a description.');
        return;
      }

      // TODO: Replace localStorage with backend API integration when available
      try {
        const entry: FeedbackEntry = {
          id: crypto.randomUUID(),
          type,
          description: description.trim(),
          email: email.trim(),
          timestamp: new Date().toISOString(),
        };

        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as FeedbackEntry[];
        existing.push(entry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

        setSubmitted(true);
      } catch {
        setError('Failed to save feedback. Please try again.');
      }
    },
    [type, description, email],
  );

  if (!isOpen) return null;

  return (
    <div className="form-backdrop" onClick={onClose} aria-hidden="true">
      <div
        ref={panelRef}
        className="form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="feedback-dialog-title" className="form-dialog__title">
          Send Feedback
        </h2>

        {submitted ? (
          <div className="feedback-dialog__success" role="status" aria-live="polite">
            <p className="feedback-dialog__success-text">
              Thank you! Your feedback has been recorded.
            </p>
            <button type="button" className="form-button form-button--primary" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="form-banner-error" role="alert">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="feedback-type" className="form-group__label">
                Type
              </label>
              <select
                id="feedback-type"
                ref={firstInputRef}
                className="form-group__input"
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label
                htmlFor="feedback-description"
                className="form-group__label form-group__label--required"
              >
                Description
              </label>
              <textarea
                id="feedback-description"
                className="form-group__input form-group__textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tell us what's on your mind..."
                aria-required="true"
                aria-invalid={error ? 'true' : undefined}
              />
            </div>

            <div className="form-group">
              <label htmlFor="feedback-email" className="form-group__label">
                Email (optional)
              </label>
              <input
                id="feedback-email"
                type="email"
                className="form-group__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <div className="form-dialog__actions">
              <button
                type="button"
                className="form-button form-button--secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className="form-button form-button--primary">
                Submit
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackDialog;
