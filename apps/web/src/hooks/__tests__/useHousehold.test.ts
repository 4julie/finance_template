// SPDX-License-Identifier: BUSL-1.1

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHousehold } from '../useHousehold';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// Mock crypto.randomUUID for deterministic tests
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `uuid-${++uuidCounter}`,
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = i + 1;
    return arr;
  },
});

beforeEach(() => {
  uuidCounter = 0;
  localStorage.clear();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useHousehold', () => {
  it('returns null household when none exists', () => {
    const { result } = renderHook(() => useHousehold());

    expect(result.current.loading).toBe(false);
    expect(result.current.household).toBeNull();
    expect(result.current.members).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('creates a household with the owner as first member', () => {
    const { result } = renderHook(() => useHousehold());

    let household!: ReturnType<typeof result.current.createHousehold>;
    act(() => {
      household = result.current.createHousehold({ name: 'Smith Family' });
    });

    expect(household).not.toBeNull();
    expect(result.current.household?.name).toBe('Smith Family');
    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0]?.role).toBe('OWNER');
  });

  it('invites a member with specified role', () => {
    const { result } = renderHook(() => useHousehold());

    act(() => {
      result.current.createHousehold({ name: 'Test Household' });
    });

    let invitation!: ReturnType<typeof result.current.inviteMember>;
    act(() => {
      invitation = result.current.inviteMember({
        email: 'partner@example.com',
        role: 'ADMIN',
      });
    });

    expect(invitation).not.toBeNull();
    expect(result.current.invitations).toHaveLength(1);
    expect(result.current.invitations[0]?.email).toBe('partner@example.com');
    expect(result.current.invitations[0]?.role).toBe('ADMIN');
    expect(result.current.invitations[0]?.status).toBe('PENDING');
  });

  it('returns null when inviting without a household', () => {
    const { result } = renderHook(() => useHousehold());

    let invitation!: ReturnType<typeof result.current.inviteMember>;
    act(() => {
      invitation = result.current.inviteMember({
        email: 'test@example.com',
        role: 'MEMBER',
      });
    });

    expect(invitation).toBeNull();
    expect(result.current.error).toBe('No household exists. Create one first.');
  });

  it('revokes a pending invitation', () => {
    const { result } = renderHook(() => useHousehold());

    act(() => {
      result.current.createHousehold({ name: 'Test' });
    });

    act(() => {
      result.current.inviteMember({ email: 'test@example.com', role: 'VIEWER' });
    });

    const invitationId = result.current.invitations[0]?.id;
    expect(invitationId).toBeDefined();

    let revoked: boolean;
    act(() => {
      revoked = result.current.revokeInvitation(invitationId!);
    });

    expect(revoked!).toBe(true);
  });

  it('updates a member role', () => {
    const { result } = renderHook(() => useHousehold());

    act(() => {
      result.current.createHousehold({ name: 'Test' });
    });

    // The first member is the owner — we test the mechanism
    const memberId = result.current.members[0]?.id;
    expect(memberId).toBeDefined();

    let updated: boolean;
    act(() => {
      updated = result.current.updateMemberRole(memberId!, 'ADMIN');
    });

    expect(updated!).toBe(true);
    expect(result.current.members[0]?.role).toBe('ADMIN');
  });

  it('removes a member', () => {
    const { result } = renderHook(() => useHousehold());

    act(() => {
      result.current.createHousehold({ name: 'Test' });
    });

    const memberId = result.current.members[0]?.id;

    let removed: boolean;
    act(() => {
      removed = result.current.removeMember(memberId!);
    });

    expect(removed!).toBe(true);
    expect(result.current.members).toHaveLength(0);
  });

  it('sets account sharing mode', () => {
    const { result } = renderHook(() => useHousehold());

    act(() => {
      result.current.createHousehold({ name: 'Test' });
    });

    act(() => {
      result.current.setAccountSharing({ accountId: 'acct-1', sharingMode: 'SHARED' });
    });

    expect(result.current.accountSharings).toHaveLength(1);
    expect(result.current.accountSharings[0]?.sharingMode).toBe('SHARED');

    act(() => {
      result.current.setAccountSharing({ accountId: 'acct-1', sharingMode: 'PRIVATE' });
    });

    expect(result.current.accountSharings[0]?.sharingMode).toBe('PRIVATE');
  });

  it('persists household data to localStorage', () => {
    const { result, unmount } = renderHook(() => useHousehold());

    act(() => {
      result.current.createHousehold({ name: 'Persistent Family' });
    });

    unmount();

    // Re-mount and check data is restored
    const { result: result2 } = renderHook(() => useHousehold());

    expect(result2.current.household?.name).toBe('Persistent Family');
    expect(result2.current.members).toHaveLength(1);
  });

  it('checks permissions correctly', () => {
    const { result } = renderHook(() => useHousehold());

    expect(result.current.checkPermission('OWNER', 'MANAGE_MEMBERS')).toBe(true);
    expect(result.current.checkPermission('VIEWER', 'MANAGE_MEMBERS')).toBe(false);
    expect(result.current.checkPermission('MEMBER', 'ADD_TRANSACTIONS')).toBe(true);
    expect(result.current.checkPermission('VIEWER', 'ADD_TRANSACTIONS')).toBe(false);
  });
});
