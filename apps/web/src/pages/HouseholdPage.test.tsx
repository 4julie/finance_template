// SPDX-License-Identifier: BUSL-1.1

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useHousehold } from '../hooks/useHousehold';
import type { UseHouseholdResult } from '../hooks/useHousehold';
import { HouseholdPage } from './HouseholdPage';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../hooks/useHousehold', () => ({
  useHousehold: vi.fn(),
}));

const mockedUseHousehold = vi.mocked(useHousehold);

function mockHouseholdResult(overrides: Partial<UseHouseholdResult> = {}): UseHouseholdResult {
  return {
    household: null,
    members: [],
    invitations: [],
    accountSharings: [],
    sharedBudgets: [],
    sharedGoals: [],
    loading: false,
    error: null,
    createHousehold: vi.fn(),
    inviteMember: vi.fn(),
    acceptInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    checkPermission: vi.fn().mockReturnValue(false),
    setAccountSharing: vi.fn(),
    isAccountVisible: vi.fn().mockReturnValue(false),
    setSharedBudget: vi.fn(),
    removeSharedBudget: vi.fn(),
    setSharedGoal: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helper — creates a standard household for tests that need one
// ---------------------------------------------------------------------------

function makeHousehold(overrides: Record<string, unknown> = {}) {
  return {
    id: 'hh-1',
    name: 'Smith Family',
    ownerId: 'user-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    deletedAt: null,
    syncVersion: 1,
    isSynced: true,
    ...overrides,
  };
}

function makeOwnerMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mem-1',
    householdId: 'hh-1',
    userId: 'user-1-abcdef',
    displayName: null,
    role: 'OWNER' as const,
    joinedAt: '2025-01-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    deletedAt: null,
    syncVersion: 1,
    isSynced: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HouseholdPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockedUseHousehold.mockReturnValue(mockHouseholdResult({ loading: true }));

    render(<HouseholdPage />);

    expect(screen.getByText('Loading household data…')).toBeInTheDocument();
  });

  it('shows creation form when no household exists', () => {
    mockedUseHousehold.mockReturnValue(mockHouseholdResult());

    render(<HouseholdPage />);

    expect(screen.getByText('Create Your Household')).toBeInTheDocument();
    expect(screen.getByLabelText(/household name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create household/i })).toBeInTheDocument();
  });

  it('mentions privacy-by-default in creation form', () => {
    mockedUseHousehold.mockReturnValue(mockHouseholdResult());

    render(<HouseholdPage />);

    expect(screen.getByText(/privacy-by-default/i)).toBeInTheDocument();
  });

  it('renders household management when household exists', () => {
    mockedUseHousehold.mockReturnValue(
      mockHouseholdResult({
        household: makeHousehold(),
        members: [makeOwnerMember()],
      }),
    );

    render(<HouseholdPage />);

    expect(screen.getByText('Smith Family')).toBeInTheDocument();
    expect(screen.getByText('Family Plan')).toBeInTheDocument();
    expect(screen.getByText('Members & Roles')).toBeInTheDocument();
    expect(screen.getByText('Invite Member')).toBeInTheDocument();
    expect(screen.getByText('Account Sharing')).toBeInTheDocument();
    expect(screen.getByText('Shared Budgets')).toBeInTheDocument();
    expect(screen.getByText('Shared Goals')).toBeInTheDocument();
    expect(screen.getByText('Permission Reference')).toBeInTheDocument();
  });

  it('displays error banner when error exists', () => {
    mockedUseHousehold.mockReturnValue(
      mockHouseholdResult({
        household: makeHousehold({ name: 'Test' }),
        error: 'Something went wrong',
      }),
    );

    render(<HouseholdPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('shows pending invitations section when invitations exist', () => {
    mockedUseHousehold.mockReturnValue(
      mockHouseholdResult({
        household: makeHousehold({ name: 'Test' }),
        invitations: [
          {
            id: 'inv-1',
            householdId: 'hh-1',
            invitedBy: 'user-1',
            email: 'partner@example.com',
            role: 'ADMIN',
            status: 'PENDING',
            inviteCode: 'abc12345',
            expiresAt: '2025-01-08T00:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            deletedAt: null,
            syncVersion: 1,
            isSynced: true,
          },
        ],
      }),
    );

    render(<HouseholdPage />);

    expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
    expect(screen.getByText('partner@example.com')).toBeInTheDocument();
    expect(screen.getByText('Code: abc12345')).toBeInTheDocument();
  });

  it('renders account sharing toggles with privacy labels', () => {
    mockedUseHousehold.mockReturnValue(
      mockHouseholdResult({
        household: makeHousehold({ name: 'Test' }),
        accountSharings: [
          {
            id: 'as-1',
            accountId: 'acct-checking',
            householdId: 'hh-1',
            ownerId: 'user-1',
            sharingMode: 'SHARED',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            deletedAt: null,
            syncVersion: 1,
            isSynced: true,
          },
        ],
      }),
    );

    render(<HouseholdPage />);

    // Account sharing section exists
    expect(screen.getByText('Account Sharing')).toBeInTheDocument();
    expect(screen.getByText('Checking Account')).toBeInTheDocument();

    // Privacy boundary note exists
    expect(screen.getByText(/privacy boundary/i)).toBeInTheDocument();

    // Shared account has toggle
    const toggles = screen.getAllByRole('switch');
    expect(toggles.length).toBeGreaterThan(0);
  });

  it('renders shared budget controls with mode selector', () => {
    mockedUseHousehold.mockReturnValue(
      mockHouseholdResult({
        household: makeHousehold({ name: 'Test' }),
        sharedBudgets: [
          {
            id: 'sb-1',
            householdId: 'hh-1',
            budgetId: 'budget-groceries',
            mode: 'FLEX',
            isActive: true,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            deletedAt: null,
            syncVersion: 1,
            isSynced: true,
          },
        ],
      }),
    );

    render(<HouseholdPage />);

    expect(screen.getByText('Shared Budgets')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('renders shared goals with toggle', () => {
    mockedUseHousehold.mockReturnValue(
      mockHouseholdResult({
        household: makeHousehold({ name: 'Test' }),
        sharedGoals: [
          {
            id: 'sg-1',
            householdId: 'hh-1',
            goalId: 'goal-vacation',
            isShared: true,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
            deletedAt: null,
            syncVersion: 1,
            isSynced: true,
          },
        ],
      }),
    );

    render(<HouseholdPage />);

    expect(screen.getByText('Shared Goals')).toBeInTheDocument();
    expect(screen.getByText('Family Vacation')).toBeInTheDocument();
    expect(screen.getByText('Shared with household')).toBeInTheDocument();
  });

  it('shows role permission reference table', () => {
    mockedUseHousehold.mockReturnValue(
      mockHouseholdResult({
        household: makeHousehold({ name: 'Test' }),
        checkPermission: vi.fn().mockReturnValue(true),
      }),
    );

    render(<HouseholdPage />);

    expect(screen.getByText('Permission Reference')).toBeInTheDocument();
    expect(screen.getByLabelText('Role permissions matrix')).toBeInTheDocument();
  });
});
