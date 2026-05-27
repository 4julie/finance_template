// SPDX-License-Identifier: BUSL-1.1

/** Result returned by a platform biometric/PIN/passcode adapter. */
export interface FreshAuthResult {
  readonly granted: boolean;
  readonly method: 'biometric' | 'pin' | 'passcode';
}

/** Platform adapter capable of requiring a fresh authentication ceremony. */
export interface FreshAuthProvider {
  authenticate: (reason: string) => Promise<FreshAuthResult>;
}

/** A category protection toggle after anti-tampering authentication. */
export interface CategoryProtectionToggleResult {
  readonly categoryId: string;
  readonly protectedCategory: boolean;
  readonly method: FreshAuthResult['method'];
}

const BIOMETRIC_CACHE_MS = 30_000;

/** Session cache for protected-category detail entry; expires after 30 seconds. */
export class BiometricAccessCache {
  private readonly unlockedAtByCategory = new Map<string, number>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  /** Mark a category as freshly authenticated for this session. */
  grant(categoryId: string): void {
    this.unlockedAtByCategory.set(categoryId, this.now());
  }

  /** Return true only while the 30-second fresh-auth window is active. */
  isFresh(categoryId: string): boolean {
    const unlockedAt = this.unlockedAtByCategory.get(categoryId);
    return unlockedAt !== undefined && this.now() - unlockedAt < BIOMETRIC_CACHE_MS;
  }

  /** Clear one category or all cached entries. */
  revoke(categoryId?: string): void {
    if (categoryId) this.unlockedAtByCategory.delete(categoryId);
    else this.unlockedAtByCategory.clear();
  }
}

/** Require fresh auth before entering a protected category detail view. */
export async function requireFreshCategoryAccess(
  categoryId: string,
  isProtected: boolean,
  authProvider: FreshAuthProvider,
  cache: BiometricAccessCache,
): Promise<boolean> {
  if (!isProtected || cache.isFresh(categoryId)) {
    return true;
  }

  const result = await authProvider.authenticate(
    'Authenticate to view protected category details.',
  );
  if (result.granted) {
    cache.grant(categoryId);
  }
  return result.granted;
}

/** Toggle category protection only after a fresh biometric/PIN/passcode check. */
export async function toggleCategoryProtectionWithFreshAuth(
  categoryId: string,
  currentlyProtected: boolean,
  authProvider: FreshAuthProvider,
): Promise<CategoryProtectionToggleResult> {
  const result = await authProvider.authenticate(
    currentlyProtected
      ? 'Authenticate to remove category protection.'
      : 'Authenticate to protect this category.',
  );

  if (!result.granted) {
    throw new Error('Fresh authentication is required to change protected-category settings.');
  }

  return {
    categoryId,
    protectedCategory: !currentlyProtected,
    method: result.method,
  };
}
