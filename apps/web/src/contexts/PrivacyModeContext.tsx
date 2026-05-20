// SPDX-License-Identifier: BUSL-1.1

/**
 * Privacy Mode Context — global toggle to mask financial amounts and balances.
 *
 * When privacy mode is enabled, all CurrencyDisplay components render
 * masked values (e.g., `$•••.••`) instead of actual amounts. The toggle
 * state persists in localStorage until the user turns it off.
 *
 * Usage:
 * ```tsx
 * // Wrap the app in the provider
 * <PrivacyModeProvider>
 *   <App />
 * </PrivacyModeProvider>
 *
 * // Consume in components via the hook
 * const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();
 * ```
 *
 * References: issue #1616
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** localStorage key for persisting privacy mode state. */
const PRIVACY_MODE_STORAGE_KEY = 'finance-privacy-mode';

/** Masked replacement for currency amounts (e.g., "$•••.••"). */
export const MASKED_AMOUNT = '•••.••';

/** Masked replacement for generic sensitive labels. */
export const MASKED_LABEL = '••••';

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

/** Shape of the privacy mode context value. */
export interface PrivacyModeContextValue {
  /** Whether privacy mode is currently active. */
  readonly isPrivacyMode: boolean;
  /** Toggle privacy mode on/off. */
  readonly togglePrivacyMode: () => void;
  /** Explicitly set privacy mode. */
  readonly setPrivacyMode: (enabled: boolean) => void;
  /**
   * Mask a string value when privacy mode is active.
   *
   * @param value - The value to potentially mask.
   * @param replacement - Optional custom mask (defaults to `MASKED_LABEL`).
   * @returns The original value when privacy mode is off, or the mask when on.
   */
  readonly maskValue: (value: string, replacement?: string) => string;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const PrivacyModeContext = createContext<PrivacyModeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface PrivacyModeProviderProps {
  readonly children: ReactNode;
  /** Override initial state (useful for testing). */
  readonly initialValue?: boolean;
}

/**
 * Provides privacy mode state to the component tree.
 *
 * Persists the toggle in localStorage so it survives page reloads.
 */
export const PrivacyModeProvider: FC<PrivacyModeProviderProps> = ({ children, initialValue }) => {
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    if (initialValue !== undefined) return initialValue;
    try {
      return localStorage.getItem(PRIVACY_MODE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Persist to localStorage whenever the value changes.
  useEffect(() => {
    try {
      localStorage.setItem(PRIVACY_MODE_STORAGE_KEY, String(isPrivacyMode));
    } catch {
      // localStorage unavailable — degrade gracefully.
    }
  }, [isPrivacyMode]);

  const togglePrivacyMode = useCallback(() => {
    setIsPrivacyMode((prev) => !prev);
  }, []);

  const setPrivacyMode = useCallback((enabled: boolean) => {
    setIsPrivacyMode(enabled);
  }, []);

  const maskValue = useCallback(
    (value: string, replacement: string = MASKED_LABEL) => {
      return isPrivacyMode ? replacement : value;
    },
    [isPrivacyMode],
  );

  const contextValue = useMemo<PrivacyModeContextValue>(
    () => ({
      isPrivacyMode,
      togglePrivacyMode,
      setPrivacyMode,
      maskValue,
    }),
    [isPrivacyMode, togglePrivacyMode, setPrivacyMode, maskValue],
  );

  return <PrivacyModeContext.Provider value={contextValue}>{children}</PrivacyModeContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Access the privacy mode context.
 *
 * Must be called inside a `<PrivacyModeProvider>`.
 *
 * @throws Error if used outside the provider.
 */
export function usePrivacyMode(): PrivacyModeContextValue {
  const ctx = useContext(PrivacyModeContext);
  if (!ctx) {
    throw new Error('usePrivacyMode must be used within a <PrivacyModeProvider>.');
  }
  return ctx;
}

/**
 * Read privacy mode status without throwing when the provider is absent.
 *
 * Returns `false` when no `<PrivacyModeProvider>` wraps the component.
 * Use this in shared/common components that may render outside the provider
 * (e.g., in Storybook or isolated tests).
 */
export function useIsPrivacyModeActive(): boolean {
  const ctx = useContext(PrivacyModeContext);
  return ctx?.isPrivacyMode ?? false;
}
