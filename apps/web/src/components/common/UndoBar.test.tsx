// SPDX-License-Identifier: BUSL-1.1

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UndoBar, type UndoBarProps } from './UndoBar';
import type { UndoableAction } from '../../hooks/useUndo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createAction(overrides: Partial<UndoableAction> = {}): UndoableAction {
  return {
    id: 'undo-1',
    description: 'Account deleted',
    rollback: vi.fn(),
    expiresAt: Date.now() + 5000,
    ...overrides,
  };
}

function renderUndoBar(overrides: Partial<UndoBarProps> = {}) {
  const onUndo = overrides.onUndo ?? vi.fn();
  const onDismiss = overrides.onDismiss ?? vi.fn();
  const pendingActions = overrides.pendingActions ?? [createAction()];

  render(
    <UndoBar
      pendingActions={pendingActions}
      onUndo={onUndo}
      onDismiss={onDismiss}
      {...overrides}
    />,
  );

  return { onUndo, onDismiss };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UndoBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders nothing when no pending actions', () => {
    render(<UndoBar pendingActions={[]} onUndo={vi.fn()} onDismiss={vi.fn()} />);

    expect(screen.queryByTestId('undo-bar-container')).not.toBeInTheDocument();
  });

  it('renders undo bar after a destructive action', () => {
    renderUndoBar();

    expect(screen.getByTestId('undo-bar')).toBeInTheDocument();
    expect(screen.getByText('Account deleted')).toBeInTheDocument();
  });

  it('calls onUndo when Undo button is clicked', () => {
    const { onUndo } = renderUndoBar();

    fireEvent.click(screen.getByTestId('undo-bar-button'));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('shows countdown timer', () => {
    renderUndoBar();

    // The countdown text should show remaining seconds (5)
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('stacks multiple undo bars', () => {
    const actions = [
      createAction({ id: 'undo-1', description: 'First deleted' }),
      createAction({ id: 'undo-2', description: 'Second deleted' }),
    ];

    renderUndoBar({ pendingActions: actions });

    const bars = screen.getAllByTestId('undo-bar');
    expect(bars).toHaveLength(2);
  });

  it('supports Ctrl+Z keyboard shortcut', () => {
    const { onUndo } = renderUndoBar();

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('supports Cmd+Z keyboard shortcut', () => {
    const { onUndo } = renderUndoBar();

    fireEvent.keyDown(document, { key: 'z', metaKey: true });

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('does not fire Ctrl+Z when no pending actions', () => {
    const onUndo = vi.fn();
    render(<UndoBar pendingActions={[]} onUndo={onUndo} onDismiss={vi.fn()} />);

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });

    expect(onUndo).not.toHaveBeenCalled();
  });

  it('has proper ARIA attributes', () => {
    renderUndoBar();

    const bar = screen.getByTestId('undo-bar');
    expect(bar).toHaveAttribute('role', 'status');
    expect(bar).toHaveAttribute('aria-live', 'polite');
  });
});
