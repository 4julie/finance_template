// SPDX-License-Identifier: BUSL-1.1

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockOpen = vi.fn();
const mockClose = vi.fn();
const mockSubmitTransaction = vi.fn();

vi.mock('../../hooks/useQuickEntry', () => ({
  useQuickEntry: vi.fn(),
}));

vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

vi.mock('../../accessibility/aria', () => ({
  announce: vi.fn(),
  useFocusTrap: vi.fn(),
}));

import { useQuickEntry } from '../../hooks/useQuickEntry';
import { QuickEntry } from './QuickEntry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMock(overrides: Partial<ReturnType<typeof useQuickEntry>> = {}) {
  vi.mocked(useQuickEntry).mockReturnValue({
    isOpen: false,
    open: mockOpen,
    close: mockClose,
    toggle: vi.fn(),
    submitTransaction: mockSubmitTransaction,
    error: null,
    accounts: [
      {
        id: 'acc-1',
        householdId: 'hh-1',
        name: 'Checking',
        type: 'CHECKING',
        currency: { code: 'USD', decimalPlaces: 2 },
        currentBalance: { amount: 100000 },
        isArchived: false,
        sortOrder: 0,
        icon: null,
        color: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        deletedAt: null,
        syncVersion: 1,
        isSynced: true,
      },
    ],
    categories: [
      {
        id: 'cat-1',
        householdId: 'hh-1',
        name: 'Food',
        icon: '🍔',
        color: '#f00',
        parentId: null,
        sortOrder: 0,
        isSystem: false,
        isIncome: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        deletedAt: null,
        syncVersion: 1,
        isSynced: true,
      },
    ],
    suggestCategory: vi.fn(),
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuickEntry', () => {
  beforeEach(() => {
    setupMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the FAB button', () => {
    render(<QuickEntry />);
    expect(screen.getByTestId('quick-entry-fab')).toBeInTheDocument();
    expect(screen.getByTestId('quick-entry-fab')).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands form panel on FAB click', () => {
    setupMock({ isOpen: true });
    render(<QuickEntry />);

    expect(screen.getByTestId('quick-entry-panel')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('does not render the panel when closed', () => {
    render(<QuickEntry />);
    expect(screen.queryByTestId('quick-entry-panel')).not.toBeInTheDocument();
  });

  it('shows validation error for missing amount', () => {
    setupMock({ isOpen: true });
    render(<QuickEntry />);

    const saveBtn = screen.getByTestId('quick-entry-save');
    fireEvent.click(saveBtn);

    expect(screen.getByText('Amount must be a positive number')).toBeInTheDocument();
  });

  it('shows validation error for negative amount', () => {
    setupMock({ isOpen: true });
    render(<QuickEntry />);

    const amountInput = screen.getByTestId('quick-entry-amount');
    fireEvent.change(amountInput, { target: { value: '-5' } });

    const saveBtn = screen.getByTestId('quick-entry-save');
    fireEvent.click(saveBtn);

    expect(screen.getByText('Amount must be a positive number')).toBeInTheDocument();
  });

  it('submits valid form data', () => {
    setupMock({ isOpen: true });
    render(<QuickEntry />);

    const amountInput = screen.getByTestId('quick-entry-amount');
    fireEvent.change(amountInput, { target: { value: '12.50' } });

    const accountSelect = screen.getByTestId('quick-entry-account');
    fireEvent.change(accountSelect, { target: { value: 'acc-1' } });

    const saveBtn = screen.getByTestId('quick-entry-save');
    fireEvent.click(saveBtn);

    expect(mockSubmitTransaction).toHaveBeenCalledTimes(1);
    expect(mockSubmitTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: { amount: 1250 },
        accountId: 'acc-1',
        type: 'EXPENSE',
      }),
    );
  });

  it('calls close on Escape key', () => {
    setupMock({ isOpen: true });
    render(<QuickEntry />);

    const panel = screen.getByTestId('quick-entry-panel');
    fireEvent.keyDown(panel, { key: 'Escape' });

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('has proper ARIA attributes', () => {
    setupMock({ isOpen: true });
    render(<QuickEntry />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');

    const amountInput = screen.getByTestId('quick-entry-amount');
    expect(amountInput).toHaveAttribute('aria-required', 'true');
  });

  it('shows submit error from hook', () => {
    setupMock({ isOpen: true, error: 'Failed to create transaction.' });
    render(<QuickEntry />);

    expect(screen.getByText('Failed to create transaction.')).toBeInTheDocument();
  });
});
