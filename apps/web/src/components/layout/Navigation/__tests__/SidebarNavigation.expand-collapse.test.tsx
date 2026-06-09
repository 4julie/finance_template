// SPDX-License-Identifier: BUSL-1.1

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../auth/auth-context', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 'test-user', email: 'test@example.com', hasPasskey: false },
    error: null,
    logout: vi.fn(),
  }),
}));

import { SidebarNavigation } from '../../Navigation';

describe('SidebarNavigation expand/collapse regression', () => {
  it('collapses and re-expands a group even when that group contains the active route', () => {
    render(<SidebarNavigation activePath="/subscriptions" onNavigate={vi.fn()} />);

    const moneyToggle = screen.getByRole('button', { name: 'Money section' });
    const moneyList = document.getElementById('sidebar-group-money');

    expect(moneyToggle).toHaveAttribute('aria-expanded', 'true');
    expect(moneyList).not.toHaveClass('sidebar-nav__list--collapsed');

    fireEvent.click(moneyToggle);

    expect(moneyToggle).toHaveAttribute('aria-expanded', 'false');
    expect(moneyList).toHaveAttribute('hidden');
    expect(moneyList).toHaveAttribute('aria-hidden', 'true');
    expect(moneyList).toHaveClass('sidebar-nav__list--collapsed');

    fireEvent.click(moneyToggle);

    expect(moneyToggle).toHaveAttribute('aria-expanded', 'true');
    expect(moneyList).not.toHaveAttribute('hidden');
    expect(moneyList).toHaveAttribute('aria-hidden', 'false');
    expect(moneyList).not.toHaveClass('sidebar-nav__list--collapsed');
  });
});
