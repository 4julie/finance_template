// SPDX-License-Identifier: BUSL-1.1

/**
 * React hook for local-only mode management.
 *
 * Tracks whether the user is operating in local-only mode (no account,
 * no sync). Provides actions to enable/disable the mode and check
 * feature availability.
 *
 * Usage:
 * ```tsx
 * const { isLocalOnly, enableLocalOnly, features } = useLocalOnlyMode();
 * ```
 *
 * References: issue #1621 (local-only onboarding path)
 */

import { useCallback, useState } from 'react';
import {
  isLocalOnlyMode,
  setLocalOnlyMode,
  isOnboardingComplete,
  setOnboardingComplete,
  FEATURE_AVAILABILITY,
  type FeatureAvailability,
} from '../lib/local-only-mode';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/** Shape returned by {@link useLocalOnlyMode}. */
export interface UseLocalOnlyModeResult {
  /** Whether the user is in local-only mode. */
  readonly isLocalOnly: boolean;
  /** Whether the onboarding flow has been completed. */
  readonly onboardingComplete: boolean;
  /** Feature availability list for the current mode. */
  readonly features: FeatureAvailability[];
  /** Enable local-only mode. */
  readonly enableLocalOnly: () => void;
  /** Disable local-only mode (upgrade to account). */
  readonly disableLocalOnly: () => void;
  /** Mark onboarding as complete. */
  readonly completeOnboarding: () => void;
  /** Check if a specific feature is available in the current mode. */
  readonly isFeatureAvailable: (featureId: string) => boolean;
  /** Refresh state from storage. */
  readonly refresh: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Manage local-only mode state. */
export function useLocalOnlyMode(): UseLocalOnlyModeResult {
  const [isLocalOnly, setIsLocalOnly] = useState(isLocalOnlyMode);
  const [onboardingDone, setOnboardingDone] = useState(isOnboardingComplete);

  const refresh = useCallback(() => {
    setIsLocalOnly(isLocalOnlyMode());
    setOnboardingDone(isOnboardingComplete());
  }, []);

  const enableLocalOnly = useCallback(() => {
    setLocalOnlyMode(true);
    setIsLocalOnly(true);
  }, []);

  const disableLocalOnly = useCallback(() => {
    setLocalOnlyMode(false);
    setIsLocalOnly(false);
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboardingComplete(true);
    setOnboardingDone(true);
  }, []);

  const isFeatureAvailable = useCallback(
    (featureId: string): boolean => {
      const feature = FEATURE_AVAILABILITY.find((f) => f.id === featureId);
      if (!feature) return false;
      if (isLocalOnly) return feature.availableLocalOnly;
      return true;
    },
    [isLocalOnly],
  );

  return {
    isLocalOnly,
    onboardingComplete: onboardingDone,
    features: FEATURE_AVAILABILITY,
    enableLocalOnly,
    disableLocalOnly,
    completeOnboarding,
    isFeatureAvailable,
    refresh,
  };
}
