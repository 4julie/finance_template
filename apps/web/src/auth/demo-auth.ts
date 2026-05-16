// SPDX-License-Identifier: BUSL-1.1

/**
 * Demo Auth Module (#1436)
 *
 * Provides an in-memory + localStorage-backed auth implementation for local
 * development when no Supabase backend is configured.
 *
 * Activates automatically when the Supabase URL contains "placeholder".
 *
 * SECURITY:
 *   - This module is for LOCAL DEVELOPMENT ONLY.
 *   - Passwords are stored as plain text in localStorage — acceptable for
 *     demo purposes, never for production.
 *   - The generated JWT is a structurally valid but unsigned token.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DemoUser {
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'finance_demo_users';

/** Token lifetime in seconds (1 hour). */
const TOKEN_LIFETIME_SECONDS = 3600;

// ---------------------------------------------------------------------------
// Storage Helpers
// ---------------------------------------------------------------------------

/** Load demo users from localStorage. */
function loadUsers(): DemoUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DemoUser[];
  } catch {
    return [];
  }
}

/** Save demo users to localStorage. */
function saveUsers(users: DemoUser[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// ---------------------------------------------------------------------------
// JWT Helper
// ---------------------------------------------------------------------------

/**
 * Generate a structurally valid (but unsigned) JWT for demo mode.
 *
 * The token has the correct three-part structure so that
 * `parseTokenPayload` in `auth-context.tsx` and `decodeJwtPayload` in
 * `token-storage.ts` can extract `sub`, `email`, and `exp` claims.
 */
function generateDemoToken(email: string): string {
  const header = { alg: 'none', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: `demo-${email.replace(/[^a-zA-Z0-9]/g, '-')}`,
    email,
    iat: now,
    exp: now + TOKEN_LIFETIME_SECONDS,
    iss: 'finance-demo',
  };

  const encode = (obj: object): string =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${encode(header)}.${encode(payload)}.demo-signature`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether the app should run in demo auth mode.
 *
 * @param supabaseUrl The configured Supabase URL.
 * @returns `true` if the URL is missing or contains "placeholder".
 */
export function isDemoMode(supabaseUrl: string): boolean {
  return !supabaseUrl || supabaseUrl.includes('placeholder');
}

/**
 * Register a new demo user.
 *
 * @throws {Error} If the email is already registered.
 */
export function demoSignup(email: string, password: string): void {
  const users = loadUsers();
  const normalizedEmail = email.toLowerCase().trim();

  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error('An account with this email already exists.');
  }

  users.push({ email: normalizedEmail, password });
  saveUsers(users);
}

/**
 * Authenticate a demo user and return a fake JWT + user info.
 *
 * @throws {Error} If credentials are invalid.
 */
export function demoLogin(
  email: string,
  password: string,
): { accessToken: string; user: { id: string; email: string } } {
  const users = loadUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const found = users.find((u) => u.email === normalizedEmail && u.password === password);

  if (!found) {
    throw new Error('Invalid email or password.');
  }

  const token = generateDemoToken(found.email);
  const sub = `demo-${found.email.replace(/[^a-zA-Z0-9]/g, '-')}`;

  return {
    accessToken: token,
    user: { id: sub, email: found.email },
  };
}

/**
 * Refresh a demo token — generates a fresh token for the given email.
 *
 * @returns A new demo JWT, or `null` if no email is provided.
 */
export function demoRefreshToken(email: string | null): string | null {
  if (!email) return null;
  return generateDemoToken(email);
}
