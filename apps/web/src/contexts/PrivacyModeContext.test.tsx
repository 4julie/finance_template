// SPDX-License-Identifier: BUSL-1.1

/**
 * Privacy mode context tests.
 *
 * Validates that the PrivacyModeProvider persists state to localStorage,
 * the toggle works, and the maskValue helper masks/unmasks correctly.
 *
 * References: issue #1616
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  MASKED_AMOUNT,
  MASKED_LABEL,
  PrivacyModeProvider,
  usePrivacyMode,
} from './PrivacyModeContext';

// ---------------------------------------------------------------------------
// Test helper component
// ---------------------------------------------------------------------------

function TestConsumer() {
  const { isPrivacyMode, togglePrivacyMode, maskValue } = usePrivacyMode();

  return (
    <div>
      <span data-testid="status">{isPrivacyMode ? 'ON' : 'OFF'}</span>
      <span data-testid="masked">{maskValue('$1,234.56', MASKED_AMOUNT)}</span>
      <span data-testid="masked-label">{maskValue('My Savings Account')}</span>
      <button onClick={togglePrivacyMode}>Toggle</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PrivacyModeContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to privacy mode off', () => {
    render(
      <PrivacyModeProvider>
        <TestConsumer />
      </PrivacyModeProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('OFF');
    expect(screen.getByTestId('masked')).toHaveTextContent('$1,234.56');
    expect(screen.getByTestId('masked-label')).toHaveTextContent('My Savings Account');
  });

  it('toggles privacy mode on and masks values', async () => {
    const user = userEvent.setup();

    render(
      <PrivacyModeProvider>
        <TestConsumer />
      </PrivacyModeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Toggle' }));

    expect(screen.getByTestId('status')).toHaveTextContent('ON');
    expect(screen.getByTestId('masked')).toHaveTextContent(MASKED_AMOUNT);
    expect(screen.getByTestId('masked-label')).toHaveTextContent(MASKED_LABEL);
  });

  it('persists state to localStorage', async () => {
    const user = userEvent.setup();

    render(
      <PrivacyModeProvider>
        <TestConsumer />
      </PrivacyModeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Toggle' }));

    expect(localStorage.getItem('finance-privacy-mode')).toBe('true');
  });

  it('reads persisted state from localStorage on mount', () => {
    localStorage.setItem('finance-privacy-mode', 'true');

    render(
      <PrivacyModeProvider>
        <TestConsumer />
      </PrivacyModeProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('ON');
    expect(screen.getByTestId('masked')).toHaveTextContent(MASKED_AMOUNT);
  });

  it('respects initialValue prop for testing', () => {
    render(
      <PrivacyModeProvider initialValue={true}>
        <TestConsumer />
      </PrivacyModeProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('ON');
  });

  it('throws when used outside provider', () => {
    // Suppress console.error for the expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      'usePrivacyMode must be used within a <PrivacyModeProvider>.',
    );

    spy.mockRestore();
  });

  it('toggles back to off and unmasks values', async () => {
    const user = userEvent.setup();

    render(
      <PrivacyModeProvider initialValue={true}>
        <TestConsumer />
      </PrivacyModeProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('ON');

    await user.click(screen.getByRole('button', { name: 'Toggle' }));

    expect(screen.getByTestId('status')).toHaveTextContent('OFF');
    expect(screen.getByTestId('masked')).toHaveTextContent('$1,234.56');
  });
});
