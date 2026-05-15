// SPDX-License-Identifier: BUSL-1.1

/**
 * Generic undo hook for destructive actions.
 *
 * Captures state before a destructive action, provides a configurable
 * undo window, supports a LIFO stack of pending undos, and auto-commits
 * when the window expires.
 *
 * Usage:
 * ```tsx
 * const { execute, undo, canUndo, pendingActions } = useUndo<Account>({
 *   undoWindowMs: 5000,
 * });
 *
 * // Delete with undo support
 * execute({
 *   description: 'Account deleted',
 *   perform: () => deleteAccount(id),
 *   rollback: () => restoreAccount(savedAccount),
 * });
 * ```
 *
 * @module hooks/useUndo
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single undoable action in the pending stack. */
export interface UndoableAction {
  /** Unique identifier for this action. */
  id: string;
  /** Human-readable description shown in the undo bar. */
  description: string;
  /** Function to reverse the action. */
  rollback: () => void;
  /** Timestamp when the undo window expires (ms since epoch). */
  expiresAt: number;
}

/** Options for configuring the undo hook. */
export interface UseUndoOptions {
  /** Duration of the undo window in milliseconds. Defaults to 5000. */
  undoWindowMs?: number;
}

/** Input to {@link UseUndoResult.execute}. */
export interface UndoExecuteInput {
  /** Human-readable description for the undo bar. */
  description: string;
  /** The destructive action to perform immediately. */
  perform: () => void;
  /** The rollback function to call if the user undoes. */
  rollback: () => void;
}

/** Shape returned by {@link useUndo}. */
export interface UseUndoResult {
  /** Execute a destructive action with undo support. */
  execute: (input: UndoExecuteInput) => void;
  /** Undo the most recent pending action (LIFO). */
  undo: () => void;
  /** Whether there are any actions that can be undone. */
  canUndo: boolean;
  /** The current stack of pending undoable actions (most recent first). */
  pendingActions: ReadonlyArray<UndoableAction>;
  /** Dismiss a specific pending action (auto-commit, remove from stack). */
  dismiss: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextId = 0;

function generateId(): string {
  nextId += 1;
  return `undo-${nextId}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manage a stack of undoable destructive actions with auto-commit timers.
 */
export function useUndo(options: UseUndoOptions = {}): UseUndoResult {
  const { undoWindowMs = 5000 } = options;

  const [pendingActions, setPendingActions] = useState<UndoableAction[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clean up all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setPendingActions((prev) => prev.filter((a) => a.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const execute = useCallback(
    (input: UndoExecuteInput) => {
      // Perform the destructive action immediately
      input.perform();

      const id = generateId();
      const expiresAt = Date.now() + undoWindowMs;

      const action: UndoableAction = {
        id,
        description: input.description,
        rollback: input.rollback,
        expiresAt,
      };

      // Add to the top of the stack (most recent first)
      setPendingActions((prev) => [action, ...prev]);

      // Auto-commit (remove from stack) after the undo window expires
      const timer = setTimeout(() => {
        setPendingActions((prev) => prev.filter((a) => a.id !== id));
        timersRef.current.delete(id);
      }, undoWindowMs);

      timersRef.current.set(id, timer);
    },
    [undoWindowMs],
  );

  const undo = useCallback(() => {
    setPendingActions((prev) => {
      if (prev.length === 0) return prev;
      const [mostRecent, ...rest] = prev;
      // Roll back the most recent action
      mostRecent.rollback();

      // Clear its auto-commit timer
      const timer = timersRef.current.get(mostRecent.id);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(mostRecent.id);
      }

      return rest;
    });
  }, []);

  return {
    execute,
    undo,
    canUndo: pendingActions.length > 0,
    pendingActions,
    dismiss,
  };
}
