// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearResolvedConflicts,
  getPendingConflicts,
  getPowerSyncStatus,
  isPowerSyncEnabled,
  onPowerSyncStatusChange,
  resetPowerSyncStatus,
  resolveConflict,
  setPowerSyncConfig,
  SYNC_RULES,
  updatePowerSyncStatus,
  type SyncConflict,
} from '../powersync-client';

describe('powersync-client', () => {
  beforeEach(() => {
    resetPowerSyncStatus();
    clearResolvedConflicts();
    setPowerSyncConfig({
      instanceUrl: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
      enabled: false,
    });
  });

  describe('isPowerSyncEnabled', () => {
    it('returns false when not configured', () => {
      expect(isPowerSyncEnabled()).toBe(false);
    });

    it('returns true when configured and enabled', () => {
      setPowerSyncConfig({
        instanceUrl: 'https://test.powersync.com',
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-key',
        enabled: true,
      });
      expect(isPowerSyncEnabled()).toBe(true);
    });

    it('returns false when enabled but no instance URL', () => {
      setPowerSyncConfig({
        instanceUrl: '',
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-key',
        enabled: true,
      });
      expect(isPowerSyncEnabled()).toBe(false);
    });
  });

  describe('SYNC_RULES', () => {
    it('defines rules for all expected tables', () => {
      const tableNames = SYNC_RULES.map((r) => r.tableName);
      expect(tableNames).toContain('user');
      expect(tableNames).toContain('household');
      expect(tableNames).toContain('account');
      expect(tableNames).toContain('category');
      expect(tableNames).toContain('transaction');
      expect(tableNames).toContain('budget');
      expect(tableNames).toContain('goal');
    });

    it('has monotonically increasing priorities', () => {
      for (let i = 1; i < SYNC_RULES.length; i++) {
        expect(SYNC_RULES[i]!.priority).toBeGreaterThanOrEqual(SYNC_RULES[i - 1]!.priority);
      }
    });
  });

  describe('status management', () => {
    it('starts with disconnected status', () => {
      const status = getPowerSyncStatus();
      expect(status.connectionStatus).toBe('disconnected');
      expect(status.pendingUploads).toBe(0);
      expect(status.hasSynced).toBe(false);
    });

    it('updates status and notifies listeners', () => {
      const received: string[] = [];
      onPowerSyncStatusChange((s) => received.push(s.connectionStatus));

      updatePowerSyncStatus({ connectionStatus: 'connecting' });
      updatePowerSyncStatus({ connectionStatus: 'connected' });

      expect(received).toEqual(['connecting', 'connected']);
    });

    it('unsubscribes correctly', () => {
      const received: string[] = [];
      const unsub = onPowerSyncStatusChange((s) => received.push(s.connectionStatus));

      updatePowerSyncStatus({ connectionStatus: 'connecting' });
      unsub();
      updatePowerSyncStatus({ connectionStatus: 'connected' });

      expect(received).toEqual(['connecting']);
    });

    it('resets status to defaults', () => {
      updatePowerSyncStatus({ connectionStatus: 'connected', hasSynced: true });
      resetPowerSyncStatus();

      const status = getPowerSyncStatus();
      expect(status.connectionStatus).toBe('disconnected');
      expect(status.hasSynced).toBe(false);
    });
  });

  describe('conflict resolution', () => {
    const mockConflict: SyncConflict = {
      tableName: 'transaction',
      recordId: 'tx-123',
      localVersion: { amount: 100 },
      serverVersion: { amount: 200 },
      timestamp: '2024-01-15T10:00:00Z',
      resolved: false,
    };

    it('server-wins returns server version', () => {
      const result = resolveConflict(mockConflict, 'server-wins');
      expect(result).toEqual({ amount: 200 });
    });

    it('client-wins returns local version', () => {
      const result = resolveConflict(mockConflict, 'client-wins');
      expect(result).toEqual({ amount: 100 });
    });

    it('manual strategy stores conflict for review', () => {
      resolveConflict(mockConflict, 'manual');
      const pending = getPendingConflicts();
      expect(pending.length).toBe(1);
      expect(pending[0]?.tableName).toBe('transaction');
    });

    it('clears resolved conflicts', () => {
      resolveConflict(mockConflict, 'manual');
      clearResolvedConflicts();
      // After clear, all marked as 'manual' (resolved:true) are removed
      // but the one we added has resolved:true+manual, so it gets removed
      const pending = getPendingConflicts();
      expect(pending.length).toBe(0);
    });
  });
});
