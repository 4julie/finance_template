// SPDX-License-Identifier: BUSL-1.1

/**
 * React hook for PowerSync sync status and offline queue indicators.
 *
 * Provides real-time sync state to components for displaying:
 *   - Connection status (connected, syncing, offline)
 *   - Pending upload/download counts
 *   - Last sync timestamp
 *   - Conflict indicators
 *
 * Usage:
 * ```tsx
 * const { status, isOnline, pendingCount, hasSynced } = usePowerSyncStatus();
 * ```
 *
 * References: issue #443
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getPowerSyncStatus,
  isPowerSyncEnabled,
  onPowerSyncStatusChange,
  getPendingConflicts,
  type PowerSyncStatus,
  type SyncConflict,
} from '../db/sync/powersync-client';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/** Shape returned by {@link usePowerSyncStatus}. */
export interface UsePowerSyncStatusResult {
  /** Whether PowerSync is configured and enabled. */
  readonly enabled: boolean;
  /** Current sync status snapshot. */
  readonly status: PowerSyncStatus;
  /** Shortcut: whether the app is currently online and connected. */
  readonly isOnline: boolean;
  /** Shortcut: total pending changes (uploads + downloads). */
  readonly pendingCount: number;
  /** Shortcut: whether at least one full sync has completed. */
  readonly hasSynced: boolean;
  /** Unresolved sync conflicts requiring user attention. */
  readonly conflicts: readonly SyncConflict[];
  /** Force refresh the status (e.g. after manual conflict resolution). */
  readonly refresh: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Subscribe to PowerSync sync status and expose offline queue indicators. */
export function usePowerSyncStatus(): UsePowerSyncStatusResult {
  const [status, setStatus] = useState<PowerSyncStatus>(getPowerSyncStatus);
  const [conflicts, setConflicts] = useState<readonly SyncConflict[]>([]);
  const enabled = isPowerSyncEnabled();

  const refresh = useCallback(() => {
    setStatus(getPowerSyncStatus());
    setConflicts(getPendingConflicts());
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Subscribe to status changes
    const unsubscribe = onPowerSyncStatusChange((newStatus) => {
      setStatus(newStatus);
      setConflicts(getPendingConflicts());
    });

    // Load initial state
    refresh();

    return unsubscribe;
  }, [enabled, refresh]);

  return {
    enabled,
    status,
    isOnline: status.connectionStatus === 'connected' || status.connectionStatus === 'syncing',
    pendingCount: status.pendingUploads + status.pendingDownloads,
    hasSynced: status.hasSynced,
    conflicts,
    refresh,
  };
}
