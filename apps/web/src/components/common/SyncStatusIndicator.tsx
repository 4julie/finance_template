// SPDX-License-Identifier: BUSL-1.1

/**
 * SyncStatusIndicator — displays real-time sync state in the UI.
 *
 * Shows:
 *   - Connection status dot (green/yellow/red)
 *   - Pending changes badge
 *   - Last sync time
 *   - Conflict warnings
 *
 * Accessible: uses ARIA live regions to announce status changes.
 *
 * References: issue #443
 */

import React from 'react';
import { usePowerSyncStatus } from '../../hooks/usePowerSyncStatus';
import type { PowerSyncConnectionStatus } from '../../db/sync/powersync-client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<PowerSyncConnectionStatus, string> = {
  disconnected: 'Offline',
  connecting: 'Connecting…',
  connected: 'Synced',
  syncing: 'Syncing…',
  error: 'Sync error',
};

const STATUS_COLORS: Record<PowerSyncConnectionStatus, string> = {
  disconnected: 'var(--semantic-status-negative, #dc2626)',
  connecting: 'var(--semantic-status-warning, #f59e0b)',
  connected: 'var(--semantic-status-positive, #16a34a)',
  syncing: 'var(--semantic-status-info, #2563eb)',
  error: 'var(--semantic-status-negative, #dc2626)',
};

function formatLastSync(timestamp: string | null): string {
  if (!timestamp) return 'Never synced';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60_000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface SyncStatusIndicatorProps {
  /** Additional CSS class name. */
  className?: string;
  /** Whether to show the detailed view (pending counts, last sync time). */
  detailed?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  className = '',
  detailed = false,
}) => {
  const { enabled, status, pendingCount, conflicts } = usePowerSyncStatus();

  if (!enabled) {
    return null;
  }

  const statusLabel = STATUS_LABELS[status.connectionStatus];
  const statusColor = STATUS_COLORS[status.connectionStatus];
  const hasConflicts = conflicts.length > 0;

  return (
    <div
      className={`sync-status-indicator ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={`Sync status: ${statusLabel}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--spacing-2, 0.5rem)',
        fontSize: 'var(--type-scale-caption-font-size, 0.75rem)',
        color: 'var(--semantic-text-secondary, #6b7280)',
      }}
    >
      {/* Status dot */}
      <span
        aria-hidden="true"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          flexShrink: 0,
          animation:
            status.connectionStatus === 'syncing'
              ? 'pulse-sync 1.5s ease-in-out infinite'
              : undefined,
        }}
      />

      {/* Status text */}
      <span>{statusLabel}</span>

      {/* Pending count badge */}
      {pendingCount > 0 && (
        <span
          aria-label={`${pendingCount} pending changes`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '20px',
            height: '20px',
            padding: '0 var(--spacing-1, 0.25rem)',
            borderRadius: 'var(--border-radius-full, 999px)',
            backgroundColor: 'var(--semantic-status-warning, #f59e0b)',
            color: 'white',
            fontSize: '0.65rem',
            fontWeight: 'var(--font-weight-semibold, 600)',
          }}
        >
          {pendingCount}
        </span>
      )}

      {/* Conflict warning */}
      {hasConflicts && (
        <span
          aria-label={`${conflicts.length} sync conflict${conflicts.length > 1 ? 's' : ''}`}
          style={{
            color: 'var(--semantic-status-warning, #f59e0b)',
          }}
        >
          ⚠
        </span>
      )}

      {/* Detailed info */}
      {detailed && (
        <span
          style={{
            marginLeft: 'var(--spacing-2, 0.5rem)',
            opacity: 0.7,
          }}
        >
          {formatLastSync(status.lastSyncTime)}
        </span>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
