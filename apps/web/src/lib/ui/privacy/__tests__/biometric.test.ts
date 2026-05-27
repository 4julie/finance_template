// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it, vi } from 'vitest';
import {
  BiometricAccessCache,
  requireFreshCategoryAccess,
  toggleCategoryProtectionWithFreshAuth,
  type FreshAuthProvider,
} from '../biometric';

describe('biometric protected categories', () => {
  it('expires detail-view cache after 30 seconds', async () => {
    let now = 10_000;
    const cache = new BiometricAccessCache(() => now);
    const authProvider: FreshAuthProvider = {
      authenticate: vi.fn(async () => ({ granted: true, method: 'biometric' as const })),
    };

    expect(await requireFreshCategoryAccess('cat-1', true, authProvider, cache)).toBe(true);
    expect(authProvider.authenticate).toHaveBeenCalledTimes(1);
    now += 29_999;
    expect(await requireFreshCategoryAccess('cat-1', true, authProvider, cache)).toBe(true);
    expect(authProvider.authenticate).toHaveBeenCalledTimes(1);
    now += 1;
    expect(await requireFreshCategoryAccess('cat-1', true, authProvider, cache)).toBe(true);
    expect(authProvider.authenticate).toHaveBeenCalledTimes(2);
  });

  it('requires fresh auth to enable and disable protection', async () => {
    const authProvider: FreshAuthProvider = {
      authenticate: vi.fn(async () => ({ granted: true, method: 'pin' as const })),
    };

    await expect(
      toggleCategoryProtectionWithFreshAuth('cat-1', false, authProvider),
    ).resolves.toMatchObject({
      protectedCategory: true,
      method: 'pin',
    });
    await expect(
      toggleCategoryProtectionWithFreshAuth('cat-1', true, authProvider),
    ).resolves.toMatchObject({
      protectedCategory: false,
    });
    expect(authProvider.authenticate).toHaveBeenCalledTimes(2);
  });

  it('never bypasses denied authentication', async () => {
    const authProvider: FreshAuthProvider = {
      authenticate: vi.fn(async () => ({ granted: false, method: 'passcode' as const })),
    };

    await expect(
      toggleCategoryProtectionWithFreshAuth('cat-1', false, authProvider),
    ).rejects.toThrow(/Fresh authentication/);
  });
});
