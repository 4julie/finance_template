// SPDX-License-Identifier: BUSL-1.1

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMilestones, type MilestoneProgress } from './useMilestones';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseProgress: MilestoneProgress = {
  transactionCount: 0,
  budgetCount: 0,
  goalCount: 0,
  goalProgress: [],
  streak: 0,
};

describe('useMilestones', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns no milestones when progress is zero', () => {
    const { result } = renderHook(() => useMilestones(baseProgress));

    expect(result.current.activeMilestones).toHaveLength(0);
  });

  it('detects first-transaction milestone', () => {
    const { result } = renderHook(() => useMilestones({ ...baseProgress, transactionCount: 1 }));

    expect(result.current.activeMilestones).toContainEqual(
      expect.objectContaining({ type: 'first-transaction' }),
    );
  });

  it('detects first-budget milestone', () => {
    const { result } = renderHook(() => useMilestones({ ...baseProgress, budgetCount: 1 }));

    expect(result.current.activeMilestones).toContainEqual(
      expect.objectContaining({ type: 'first-budget' }),
    );
  });

  it('detects first-goal milestone', () => {
    const { result } = renderHook(() => useMilestones({ ...baseProgress, goalCount: 1 }));

    expect(result.current.activeMilestones).toContainEqual(
      expect.objectContaining({ type: 'first-goal' }),
    );
  });

  it('detects goal progress milestones', () => {
    const { result } = renderHook(() =>
      useMilestones({
        ...baseProgress,
        goalCount: 1,
        goalProgress: [{ goalId: 'g1', fraction: 0.5 }],
      }),
    );

    expect(result.current.activeMilestones).toContainEqual(
      expect.objectContaining({ type: 'goal-50' }),
    );
  });

  it('detects 100% goal milestone', () => {
    const { result } = renderHook(() =>
      useMilestones({
        ...baseProgress,
        goalCount: 1,
        goalProgress: [{ goalId: 'g1', fraction: 1.0 }],
      }),
    );

    expect(result.current.activeMilestones).toContainEqual(
      expect.objectContaining({ type: 'goal-100' }),
    );
  });

  it('detects streak milestones', () => {
    const { result: result7 } = renderHook(() => useMilestones({ ...baseProgress, streak: 7 }));
    expect(result7.current.activeMilestones).toContainEqual(
      expect.objectContaining({ type: 'streak-7' }),
    );

    const { result: result30 } = renderHook(() => useMilestones({ ...baseProgress, streak: 30 }));
    expect(result30.current.activeMilestones).toContainEqual(
      expect.objectContaining({ type: 'streak-30' }),
    );

    const { result: result90 } = renderHook(() => useMilestones({ ...baseProgress, streak: 90 }));
    expect(result90.current.activeMilestones).toContainEqual(
      expect.objectContaining({ type: 'streak-90' }),
    );
  });

  it('removes milestone from active list after session dismiss', () => {
    const { result } = renderHook(() => useMilestones({ ...baseProgress, transactionCount: 1 }));

    expect(result.current.activeMilestones).toHaveLength(1);

    act(() => {
      result.current.dismiss('first-transaction');
    });

    expect(result.current.activeMilestones).toHaveLength(0);
  });

  it('persists permanently dismissed milestones to localStorage', () => {
    const { result } = renderHook(() => useMilestones({ ...baseProgress, transactionCount: 1 }));

    act(() => {
      result.current.dismissPermanently('first-transaction');
    });

    expect(result.current.activeMilestones).toHaveLength(0);

    // Verify localStorage persistence
    const stored = JSON.parse(localStorage.getItem('finance:dismissed-milestones') ?? '[]');
    expect(stored).toContain('first-transaction');
  });

  it('loads permanently dismissed milestones from localStorage on init', () => {
    localStorage.setItem('finance:dismissed-milestones', JSON.stringify(['first-transaction']));

    const { result } = renderHook(() => useMilestones({ ...baseProgress, transactionCount: 1 }));

    expect(result.current.activeMilestones).toHaveLength(0);
  });
});
