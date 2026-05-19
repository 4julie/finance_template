// SPDX-License-Identifier: BUSL-1.1

/**
 * CrashReportingSettings tests.
 *
 * References: issue #1673
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CrashReportingSettings } from './CrashReportingSettings';

vi.mock('../../lib/monitoring', () => ({
  initMonitoring: vi.fn(),
}));

describe('CrashReportingSettings', () => {
  const onToggleMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    onToggleMock.mockReset();
  });

  it('renders the crash reporting section with opt-in toggle', () => {
    render(<CrashReportingSettings enabled={false} onToggle={onToggleMock} />);

    expect(screen.getByText('Crash Reporting')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'Send anonymous crash reports to help improve the app',
      }),
    ).not.toBeChecked();
  });

  it('shows the toggle as checked when enabled', () => {
    render(<CrashReportingSettings enabled={true} onToggle={onToggleMock} />);

    expect(
      screen.getByRole('checkbox', {
        name: 'Send anonymous crash reports to help improve the app',
      }),
    ).toBeChecked();
  });

  it('calls onToggle when checkbox is clicked', async () => {
    const user = userEvent.setup();

    render(<CrashReportingSettings enabled={false} onToggle={onToggleMock} />);

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Send anonymous crash reports to help improve the app',
      }),
    );

    expect(onToggleMock).toHaveBeenCalledWith(true);
  });

  it('displays the never-included fields list', () => {
    render(<CrashReportingSettings enabled={false} onToggle={onToggleMock} />);

    expect(screen.getByText(/Transaction amounts/)).toBeInTheDocument();
    expect(screen.getByText(/Account balances/)).toBeInTheDocument();
    expect(screen.getByText(/Payee/)).toBeInTheDocument();
  });

  it('toggles the example payload view', async () => {
    const user = userEvent.setup();

    render(<CrashReportingSettings enabled={false} onToggle={onToggleMock} />);

    const viewButton = screen.getByRole('button', { name: /view example crash report/i });
    expect(viewButton).toBeInTheDocument();

    await user.click(viewButton);

    // After clicking, the example payload should be visible
    expect(
      screen.getByRole('region', { name: /example crash report payload/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/TypeError/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/TransactionList/).length).toBeGreaterThanOrEqual(1);

    // The button should now say "Hide"
    expect(screen.getByRole('button', { name: /hide example crash report/i })).toBeInTheDocument();
  });

  it('has accessible aria-expanded attribute on example toggle', async () => {
    const user = userEvent.setup();

    render(<CrashReportingSettings enabled={false} onToggle={onToggleMock} />);

    const button = screen.getByRole('button', { name: /view example crash report/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(screen.getByRole('button', { name: /hide example crash report/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('persists consent to localStorage when toggled on', async () => {
    const user = userEvent.setup();

    render(<CrashReportingSettings enabled={false} onToggle={onToggleMock} />);

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Send anonymous crash reports to help improve the app',
      }),
    );

    expect(localStorage.getItem('finance-monitoring-consent')).toBe('true');
  });
});
