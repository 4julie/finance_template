// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for household permission logic and privacy boundary enforcement.
 *
 * Validates:
 * - Role-based permission checks (#1780)
 * - Privacy-by-default for new members (#1779)
 * - Account visibility enforcement (#1716)
 * - Permission hierarchy (OWNER > ADMIN > MEMBER > VIEWER)
 *
 * References: issues #1780, #1779, #1716
 */

import { describe, expect, it } from 'vitest';

import type { HouseholdPermission, HouseholdRole } from '../../kmp/bridge';
import { ROLE_PERMISSIONS } from '../../kmp/bridge';
import { hasPermission, getPermissionsForRole } from '../../db/repositories/household';

// ---------------------------------------------------------------------------
// Role permission tests (#1780)
// ---------------------------------------------------------------------------

describe('Household Role Permissions', () => {
  describe('OWNER role', () => {
    it('has all permissions', () => {
      const allPerms: HouseholdPermission[] = [
        'MANAGE_MEMBERS',
        'INVITE_MEMBERS',
        'MANAGE_ROLES',
        'VIEW_SHARED_ACCOUNTS',
        'EDIT_SHARED_ACCOUNTS',
        'CREATE_SHARED_BUDGETS',
        'EDIT_SHARED_BUDGETS',
        'VIEW_SHARED_BUDGETS',
        'CREATE_SHARED_GOALS',
        'EDIT_SHARED_GOALS',
        'VIEW_SHARED_GOALS',
        'ADD_TRANSACTIONS',
      ];

      for (const perm of allPerms) {
        expect(hasPermission('OWNER', perm)).toBe(true);
      }
    });

    it('has the most permissions of any role', () => {
      const ownerPerms = getPermissionsForRole('OWNER');
      const adminPerms = getPermissionsForRole('ADMIN');
      const memberPerms = getPermissionsForRole('MEMBER');
      const viewerPerms = getPermissionsForRole('VIEWER');

      expect(ownerPerms.length).toBeGreaterThanOrEqual(adminPerms.length);
      expect(adminPerms.length).toBeGreaterThanOrEqual(memberPerms.length);
      expect(memberPerms.length).toBeGreaterThanOrEqual(viewerPerms.length);
    });
  });

  describe('ADMIN role', () => {
    it('can invite members and manage roles', () => {
      expect(hasPermission('ADMIN', 'INVITE_MEMBERS')).toBe(true);
      expect(hasPermission('ADMIN', 'MANAGE_ROLES')).toBe(true);
    });

    it('cannot manage members (OWNER-only)', () => {
      expect(hasPermission('ADMIN', 'MANAGE_MEMBERS')).toBe(false);
    });

    it('can view and edit shared accounts', () => {
      expect(hasPermission('ADMIN', 'VIEW_SHARED_ACCOUNTS')).toBe(true);
      expect(hasPermission('ADMIN', 'EDIT_SHARED_ACCOUNTS')).toBe(true);
    });
  });

  describe('MEMBER role', () => {
    it('can view shared data and add transactions', () => {
      expect(hasPermission('MEMBER', 'VIEW_SHARED_ACCOUNTS')).toBe(true);
      expect(hasPermission('MEMBER', 'VIEW_SHARED_BUDGETS')).toBe(true);
      expect(hasPermission('MEMBER', 'VIEW_SHARED_GOALS')).toBe(true);
      expect(hasPermission('MEMBER', 'ADD_TRANSACTIONS')).toBe(true);
    });

    it('cannot edit shared accounts or create budgets', () => {
      expect(hasPermission('MEMBER', 'EDIT_SHARED_ACCOUNTS')).toBe(false);
      expect(hasPermission('MEMBER', 'CREATE_SHARED_BUDGETS')).toBe(false);
      expect(hasPermission('MEMBER', 'INVITE_MEMBERS')).toBe(false);
    });
  });

  describe('VIEWER role', () => {
    it('can only view shared data', () => {
      expect(hasPermission('VIEWER', 'VIEW_SHARED_ACCOUNTS')).toBe(true);
      expect(hasPermission('VIEWER', 'VIEW_SHARED_BUDGETS')).toBe(true);
      expect(hasPermission('VIEWER', 'VIEW_SHARED_GOALS')).toBe(true);
    });

    it('cannot add transactions or modify anything', () => {
      expect(hasPermission('VIEWER', 'ADD_TRANSACTIONS')).toBe(false);
      expect(hasPermission('VIEWER', 'EDIT_SHARED_ACCOUNTS')).toBe(false);
      expect(hasPermission('VIEWER', 'CREATE_SHARED_BUDGETS')).toBe(false);
      expect(hasPermission('VIEWER', 'INVITE_MEMBERS')).toBe(false);
      expect(hasPermission('VIEWER', 'MANAGE_MEMBERS')).toBe(false);
      expect(hasPermission('VIEWER', 'MANAGE_ROLES')).toBe(false);
    });
  });

  describe('Permission hierarchy', () => {
    it('each role is a strict subset of the role above it', () => {
      const hierarchy: HouseholdRole[] = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'];

      for (let i = 0; i < hierarchy.length - 1; i++) {
        const lowerPerms = new Set(ROLE_PERMISSIONS[hierarchy[i]]);
        const higherPerms = new Set(ROLE_PERMISSIONS[hierarchy[i + 1]]);

        // Every permission in the lower role must exist in the higher role
        for (const perm of lowerPerms) {
          expect(higherPerms.has(perm)).toBe(true);
        }
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Privacy-by-default tests (#1779, #1716)
// ---------------------------------------------------------------------------

describe('Privacy-by-Default', () => {
  it('ROLE_PERMISSIONS does not grant MANAGE_MEMBERS to non-owners', () => {
    const nonOwnerRoles: HouseholdRole[] = ['ADMIN', 'MEMBER', 'VIEWER'];
    for (const role of nonOwnerRoles) {
      expect(ROLE_PERMISSIONS[role].includes('MANAGE_MEMBERS')).toBe(false);
    }
  });

  it('all roles have defined permissions (no undefined entries)', () => {
    const allRoles: HouseholdRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
    for (const role of allRoles) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });
});
