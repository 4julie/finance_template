// SPDX-License-Identifier: BUSL-1.1

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUndo } from './useUndo';

describe('useUndo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('starts with empty state', () => {
    const { result } = renderHook(() => useUndo());

    expect(result.current.canUndo).toBe(false);
    expect(result.current.pendingActions).toHaveLength(0);
  });

  it('executes a destructive action and adds it to pending', () => {
    const perform = vi.fn();
    const rollback = vi.fn();

    const { result } = renderHook(() => useUndo());

    act(() => {
      result.current.execute({
        description: 'Deleted account',
        perform,
        rollback,
      });
    });

    expect(perform).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.pendingActions).toHaveLength(1);
    expect(result.current.pendingActions[0].description).toBe('Deleted account');
  });

  it('undo restores state by calling rollback', () => {
    const rollback = vi.fn();

    const { result } = renderHook(() => useUndo());

    act(() => {
      result.current.execute({
        description: 'Deleted account',
        perform: vi.fn(),
        rollback,
      });
    });

    act(() => {
      result.current.undo();
    });

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.pendingActions).toHaveLength(0);
  });

  it('auto-commits after timeout', () => {
    const { result } = renderHook(() => useUndo({ undoWindowMs: 3000 }));

    act(() => {
      result.current.execute({
        description: 'Deleted item',
        perform: vi.fn(),
        rollback: vi.fn(),
      });
    });

    expect(result.current.pendingActions).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.pendingActions).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
  });

  it('supports multiple pending undos (LIFO order)', () => {
    const rollback1 = vi.fn();
    const rollback2 = vi.fn();

    const { result } = renderHook(() => useUndo());

    act(() => {
      result.current.execute({
        description: 'First action',
        perform: vi.fn(),
        rollback: rollback1,
      });
    });

    act(() => {
      result.current.execute({
        description: 'Second action',
        perform: vi.fn(),
        rollback: rollback2,
      });
    });

    expect(result.current.pendingActions).toHaveLength(2);
    // Most recent first (LIFO)
    expect(result.current.pendingActions[0].description).toBe('Second action');
    expect(result.current.pendingActions[1].description).toBe('First action');

    // Undo should rollback the most recent (second) action
    act(() => {
      result.current.undo();
    });

    expect(rollback2).toHaveBeenCalledTimes(1);
    expect(rollback1).not.toHaveBeenCalled();
    expect(result.current.pendingActions).toHaveLength(1);
    expect(result.current.pendingActions[0].description).toBe('First action');
  });

  it('cleans up timers on unmount', () => {
    const { result, unmount } = renderHook(() => useUndo({ undoWindowMs: 5000 }));

    act(() => {
      result.current.execute({
        description: 'Test cleanup',
        perform: vi.fn(),
        rollback: vi.fn(),
      });
    });

    // Unmount should clear timers without errors
    unmount();

    // Advancing timers after unmount should not throw
    act(() => {
      vi.advanceTimersByTime(6000);
    });
  });

  it('dismiss removes a specific action from the stack', () => {
    const { result } = renderHook(() => useUndo());

    act(() => {
      result.current.execute({
        description: 'First',
        perform: vi.fn(),
        rollback: vi.fn(),
      });
    });

    act(() => {
      result.current.execute({
        description: 'Second',
        perform: vi.fn(),
        rollback: vi.fn(),
      });
    });

    const idToRemove = result.current.pendingActions[1].id; // "First" action

    act(() => {
      result.current.dismiss(idToRemove);
    });

    expect(result.current.pendingActions).toHaveLength(1);
    expect(result.current.pendingActions[0].description).toBe('Second');
  });
});
