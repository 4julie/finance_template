// SPDX-License-Identifier: BUSL-1.1

/**
 * Household Context — provides household state and permission checks
 * to the entire component tree.
 *
 * This context is the single source of truth for:
 * - Current household and membership info
 * - Role-based permission checks
 * - Privacy boundary enforcement (account visibility)
 *
 * Usage:
 * ```tsx
 * <HouseholdProvider userId="user-123">
 *   <App />
 * </HouseholdProvider>
 *
 * // In components:
 * const { household, currentRole, hasPermission } = useHouseholdContext();
 * ```
 *
 * References: issues #1780, #1716
 */

import { createContext, useCallback, useContext, useMemo, type FC, type ReactNode } from 'react';

import type {
  Household,
  HouseholdMember,
  HouseholdPermission,
  HouseholdRole,
  SyncId,
} from '../kmp/bridge';
import { ROLE_PERMISSIONS } from '../kmp/bridge';

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

/** Shape of the household context value. */
export interface HouseholdContextValue {
  /** The current user's household, or null if not in a household. */
  readonly household: Household | null;
  /** The current user's household membership, or null. */
  readonly currentMember: HouseholdMember | null;
  /** The current user's role in the household, or null. */
  readonly currentRole: HouseholdRole | null;
  /** All members of the current household. */
  readonly members: HouseholdMember[];
  /** Whether the current user is the household owner. */
  readonly isOwner: boolean;
  /** Whether the current user is an admin or owner. */
  readonly isAdminOrOwner: boolean;
  /** Whether the current user belongs to a household. */
  readonly isInHousehold: boolean;
  /** Check if the current user has a specific permission. */
  readonly hasPermission: (permission: HouseholdPermission) => boolean;
  /** Check if the current user can manage the household (owner or admin). */
  readonly canManage: boolean;
  /** The authenticated user's ID. */
  readonly userId: SyncId | null;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface HouseholdProviderProps {
  readonly children: ReactNode;
  /** The authenticated user's ID. */
  readonly userId: SyncId | null;
  /** Current household (loaded externally via useHousehold hook). */
  readonly household: Household | null;
  /** Current household members (loaded externally). */
  readonly members: HouseholdMember[];
}

/**
 * Provides household context to the component tree.
 *
 * Derives the current user's role and permissions from the household
 * membership data. The provider does not load data itself — it receives
 * pre-loaded data from the useHousehold hook.
 */
export const HouseholdProvider: FC<HouseholdProviderProps> = ({
  children,
  userId,
  household,
  members,
}) => {
  const currentMember = useMemo(
    () => (userId ? (members.find((m) => m.userId === userId) ?? null) : null),
    [userId, members],
  );

  const currentRole = currentMember?.role ?? null;

  const isOwner = currentRole === 'OWNER';
  const isAdminOrOwner = currentRole === 'OWNER' || currentRole === 'ADMIN';
  const isInHousehold = currentMember !== null;

  const hasPermission = useCallback(
    (permission: HouseholdPermission): boolean => {
      if (!currentRole) return false;
      return ROLE_PERMISSIONS[currentRole].includes(permission);
    },
    [currentRole],
  );

  const canManage = isAdminOrOwner;

  const contextValue = useMemo<HouseholdContextValue>(
    () => ({
      household,
      currentMember,
      currentRole,
      members,
      isOwner,
      isAdminOrOwner,
      isInHousehold,
      hasPermission,
      canManage,
      userId,
    }),
    [
      household,
      currentMember,
      currentRole,
      members,
      isOwner,
      isAdminOrOwner,
      isInHousehold,
      hasPermission,
      canManage,
      userId,
    ],
  );

  return <HouseholdContext.Provider value={contextValue}>{children}</HouseholdContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Access the household context.
 *
 * Must be called inside a `<HouseholdProvider>`.
 *
 * @throws Error if used outside the provider.
 */
export function useHouseholdContext(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) {
    throw new Error('useHouseholdContext must be used within a <HouseholdProvider>.');
  }
  return ctx;
}

/**
 * Check if the current user has a specific household permission.
 *
 * Returns false when no provider is present (safe for shared components).
 */
export function useHouseholdPermission(permission: HouseholdPermission): boolean {
  const ctx = useContext(HouseholdContext);
  return ctx?.hasPermission(permission) ?? false;
}
