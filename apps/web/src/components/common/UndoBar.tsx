// SPDX-License-Identifier: BUSL-1.1

/**
 * Undo Bar — floating toast with countdown timer for undoable actions.
 *
 * Displays a dark toast at the bottom of the viewport with a message,
 * a circular countdown timer, and an "Undo" button. Multiple bars
 * stack vertically. Supports keyboard Ctrl+Z to undo the most recent.
 *
 * @module components/common/UndoBar
 */

import { useCallback, useEffect, useState } from 'react';

import type { UndoableAction } from '../../hooks/useUndo';

import './undo-bar.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props for {@link UndoBar}. */
export interface UndoBarProps {
  /** Stack of pending undoable actions (most recent first). */
  pendingActions: ReadonlyArray<UndoableAction>;
  /** Called when the user clicks "Undo" for a specific action. */
  onUndo: () => void;
  /** Called to dismiss a specific action. */
  onDismiss: (id: string) => void;
  /** Optional CSS class name. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Sub-component: single bar
// ---------------------------------------------------------------------------

interface SingleUndoBarProps {
  action: UndoableAction;
  onUndo: () => void;
  onDismiss: (id: string) => void;
}

const CIRCUMFERENCE = 2 * Math.PI * 11; // radius=11 for the countdown ring

/** Render a single undo toast with a countdown ring. */
const SingleUndoBar: React.FC<SingleUndoBarProps> = ({ action, onUndo, onDismiss }) => {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, action.expiresAt - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, action.expiresAt - Date.now());
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [action.expiresAt]);

  const fraction = Math.min(1, remainingMs / 5000);
  const dashOffset = CIRCUMFERENCE * (1 - fraction);
  const secondsLeft = Math.ceil(remainingMs / 1000);

  const handleUndo = useCallback(() => {
    onUndo();
  }, [onUndo]);

  const handleDismiss = useCallback(() => {
    onDismiss(action.id);
  }, [onDismiss, action.id]);

  if (remainingMs <= 0) return null;

  return (
    <div
      className="undo-bar"
      role="status"
      aria-live="polite"
      aria-label={`${action.description}. ${secondsLeft} seconds to undo.`}
      data-testid="undo-bar"
    >
      <span className="undo-bar__message">{action.description}</span>

      {/* Countdown ring */}
      <div className="undo-bar__countdown" aria-hidden="true">
        <svg className="undo-bar__countdown-ring" viewBox="0 0 28 28">
          <circle className="undo-bar__countdown-track" cx="14" cy="14" r="11" />
          <circle
            className="undo-bar__countdown-fill"
            cx="14"
            cy="14"
            r="11"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="undo-bar__countdown-text">{secondsLeft}</span>
      </div>

      <button
        type="button"
        className="undo-bar__button"
        onClick={handleUndo}
        aria-label={`Undo: ${action.description}`}
        data-testid="undo-bar-button"
      >
        Undo
      </button>

      <button
        type="button"
        className="undo-bar__button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
      >
        ✕
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Render a stack of undo bars at the bottom of the viewport.
 */
export const UndoBar: React.FC<UndoBarProps> = ({
  pendingActions,
  onUndo,
  onDismiss,
  className = '',
}) => {
  // Global Ctrl+Z listener
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && pendingActions.length > 0) {
        e.preventDefault();
        onUndo();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, pendingActions.length]);

  if (pendingActions.length === 0) return null;

  return (
    <div className={`undo-bar-container ${className}`} data-testid="undo-bar-container">
      {pendingActions.map((action) => (
        <SingleUndoBar key={action.id} action={action} onUndo={onUndo} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
