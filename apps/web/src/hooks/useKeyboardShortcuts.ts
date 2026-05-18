// SPDX-License-Identifier: BUSL-1.1

/**
 * useKeyboardShortcuts — Comprehensive keyboard shortcut system.
 *
 * Supports:
 * - Single key shortcuts (?, /, N, J, K, Enter)
 * - Two-key "G then X" navigation sequences with timeout
 * - Input/textarea/contenteditable guard
 *
 * @module hooks/useKeyboardShortcuts
 * References: issues #1476, #1478
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shortcut category for display in the help dialog. */
export interface ShortcutCategory {
  title: string;
  shortcuts: { keys: string; description: string }[];
}

export interface UseKeyboardShortcutsOptions {
  /** Callback to navigate to a route path. */
  onNavigate?: (path: string) => void;
  /** Callback to open new transaction form. */
  onNewTransaction?: () => void;
  /** Callback to focus the search field. */
  onFocusSearch?: () => void;
  /** Callback for J/K list navigation (direction: -1 up, +1 down). */
  onListNavigate?: (direction: -1 | 1) => void;
  /** Callback for Enter on selected list item. */
  onListSelect?: () => void;
}

export interface UseKeyboardShortcutsResult {
  showHelp: boolean;
  setShowHelp: Dispatch<SetStateAction<boolean>>;
  /** All available shortcuts organized by category for display. */
  shortcutCategories: ShortcutCategory[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Timeout (ms) for the second key in a two-key sequence. */
const SEQUENCE_TIMEOUT = 1500;

/** Navigation targets for "G then X" sequences. */
const G_NAV_MAP: Record<string, string> = {
  d: '/',
  t: '/transactions',
  b: '/budgets',
  a: '/accounts',
  o: '/goals',
  s: '/settings',
};

/** All shortcut categories for the help dialog. */
export const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: 'G then D', description: 'Go to Dashboard' },
      { keys: 'G then T', description: 'Go to Transactions' },
      { keys: 'G then B', description: 'Go to Budgets' },
      { keys: 'G then A', description: 'Go to Accounts' },
      { keys: 'G then O', description: 'Go to Goals' },
      { keys: 'G then S', description: 'Go to Settings' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: 'N', description: 'New transaction' },
      { keys: '/', description: 'Focus search' },
      { keys: '?', description: 'Show keyboard shortcuts' },
    ],
  },
  {
    title: 'Transaction List',
    shortcuts: [
      { keys: 'J', description: 'Next item' },
      { keys: 'K', description: 'Previous item' },
      { keys: 'Enter', description: 'Open selected item' },
    ],
  },
  {
    title: 'General',
    shortcuts: [{ keys: 'Escape', description: 'Close dialog / dismiss' }],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Handle global keyboard shortcuts including two-key navigation sequences. */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {},
): UseKeyboardShortcutsResult {
  const { onNavigate, onNewTransaction, onFocusSearch, onListNavigate, onListSelect } = options;

  const [showHelp, setShowHelp] = useState(false);
  const pendingGRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSequence = useCallback(() => {
    pendingGRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape always works, even in inputs
      if (event.key === 'Escape') {
        setShowHelp(false);
        clearSequence();
        return;
      }

      // Skip if modifier keys are held (except Shift for ?)
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        clearSequence();
        return;
      }

      // Don't fire shortcuts when user is typing in an input/textarea
      if (isEditableTarget(event.target)) {
        clearSequence();
        return;
      }

      // --- Two-key sequence: waiting for second key after G ---
      if (pendingGRef.current) {
        clearSequence();
        const key = event.key.toLowerCase();
        const path = G_NAV_MAP[key];
        if (path && onNavigate) {
          event.preventDefault();
          onNavigate(path);
        }
        return;
      }

      // --- Single key handlers ---
      const key = event.key;

      // "G" starts a navigation sequence
      if (key === 'g' || key === 'G') {
        pendingGRef.current = true;
        timeoutRef.current = setTimeout(() => {
          pendingGRef.current = false;
        }, SEQUENCE_TIMEOUT);
        return;
      }

      // Show help with ?
      if (key === '?' || (key === '/' && event.shiftKey)) {
        event.preventDefault();
        setShowHelp(true);
        return;
      }

      // Focus search with /
      if (key === '/' && !event.shiftKey) {
        event.preventDefault();
        onFocusSearch?.();
        return;
      }

      // New transaction
      if (key === 'n' || key === 'N') {
        event.preventDefault();
        onNewTransaction?.();
        return;
      }

      // List navigation: J = down, K = up
      if (key === 'j' || key === 'J') {
        event.preventDefault();
        onListNavigate?.(1);
        return;
      }

      if (key === 'k' || key === 'K') {
        event.preventDefault();
        onListNavigate?.(-1);
        return;
      }

      // Open selected item
      if (key === 'Enter') {
        onListSelect?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearSequence();
    };
  }, [onNavigate, onNewTransaction, onFocusSearch, onListNavigate, onListSelect, clearSequence]);

  return { showHelp, setShowHelp, shortcutCategories: SHORTCUT_CATEGORIES };
}
