// SPDX-License-Identifier: BUSL-1.1

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LAYOUT_STORAGE_KEY, LAYOUT_VERSION } from '../../components/dashboard/widget-types';
import { useWidgetLayout } from '../useWidgetLayout';

describe('useWidgetLayout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns default layout when localStorage is empty', () => {
    const { result } = renderHook(() => useWidgetLayout());
    expect(result.current.widgets.length).toBeGreaterThan(0);
    expect(result.current.visibleWidgets.length).toBe(result.current.widgets.length);
  });

  it('all widgets are visible by default', () => {
    const { result } = renderHook(() => useWidgetLayout());
    for (const widget of result.current.widgets) {
      expect(widget.visible).toBe(true);
    }
  });

  it('toggleWidget hides a visible widget', () => {
    const { result } = renderHook(() => useWidgetLayout());
    const firstWidgetId = result.current.widgets[0].id;

    act(() => {
      result.current.toggleWidget(firstWidgetId);
    });

    const toggled = result.current.widgets.find((w) => w.id === firstWidgetId);
    expect(toggled?.visible).toBe(false);
  });

  it('toggleWidget shows a hidden widget', () => {
    const { result } = renderHook(() => useWidgetLayout());
    const firstWidgetId = result.current.widgets[0].id;

    // Hide then show
    act(() => {
      result.current.toggleWidget(firstWidgetId);
    });
    act(() => {
      result.current.toggleWidget(firstWidgetId);
    });

    const toggled = result.current.widgets.find((w) => w.id === firstWidgetId);
    expect(toggled?.visible).toBe(true);
  });

  it('visibleWidgets excludes hidden widgets', () => {
    const { result } = renderHook(() => useWidgetLayout());
    const firstWidgetId = result.current.widgets[0].id;

    act(() => {
      result.current.toggleWidget(firstWidgetId);
    });

    const hiddenInVisible = result.current.visibleWidgets.find((w) => w.id === firstWidgetId);
    expect(hiddenInVisible).toBeUndefined();
    expect(result.current.visibleWidgets.length).toBe(result.current.widgets.length - 1);
  });

  it('moveWidget down swaps order with the next widget', () => {
    const { result } = renderHook(() => useWidgetLayout());
    const first = result.current.widgets[0];
    const second = result.current.widgets[1];

    act(() => {
      result.current.moveWidget(first.id, 'down');
    });

    const updated = result.current.widgets;
    expect(updated[0].id).toBe(second.id);
    expect(updated[1].id).toBe(first.id);
  });

  it('moveWidget up swaps order with the previous widget', () => {
    const { result } = renderHook(() => useWidgetLayout());
    const first = result.current.widgets[0];
    const second = result.current.widgets[1];

    act(() => {
      result.current.moveWidget(second.id, 'up');
    });

    const updated = result.current.widgets;
    expect(updated[0].id).toBe(second.id);
    expect(updated[1].id).toBe(first.id);
  });

  it('moveWidget up on the first widget is a no-op', () => {
    const { result } = renderHook(() => useWidgetLayout());
    const first = result.current.widgets[0];
    const orderBefore = result.current.widgets.map((w) => w.id);

    act(() => {
      result.current.moveWidget(first.id, 'up');
    });

    const orderAfter = result.current.widgets.map((w) => w.id);
    expect(orderAfter).toEqual(orderBefore);
  });

  it('moveWidget down on the last widget is a no-op', () => {
    const { result } = renderHook(() => useWidgetLayout());
    const last = result.current.widgets[result.current.widgets.length - 1];
    const orderBefore = result.current.widgets.map((w) => w.id);

    act(() => {
      result.current.moveWidget(last.id, 'down');
    });

    const orderAfter = result.current.widgets.map((w) => w.id);
    expect(orderAfter).toEqual(orderBefore);
  });

  it('resizeWidget updates the widget size', () => {
    const { result } = renderHook(() => useWidgetLayout());
    const firstWidgetId = result.current.widgets[0].id;

    act(() => {
      result.current.resizeWidget(firstWidgetId, 'large');
    });

    const resized = result.current.widgets.find((w) => w.id === firstWidgetId);
    expect(resized?.size).toBe('large');
  });

  it('resetLayout restores the default configuration', () => {
    const { result } = renderHook(() => useWidgetLayout());
    const firstWidgetId = result.current.widgets[0].id;

    // Make changes
    act(() => {
      result.current.toggleWidget(firstWidgetId);
      result.current.resizeWidget(firstWidgetId, 'large');
    });

    // Reset
    act(() => {
      result.current.resetLayout();
    });

    const restored = result.current.widgets.find((w) => w.id === firstWidgetId);
    expect(restored?.visible).toBe(true);
    expect(result.current.widgets.every((w) => w.visible)).toBe(true);
  });

  it('persists layout changes to localStorage', () => {
    const { result } = renderHook(() => useWidgetLayout());
    const firstWidgetId = result.current.widgets[0].id;

    act(() => {
      result.current.toggleWidget(firstWidgetId);
    });

    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.version).toBe(LAYOUT_VERSION);
    const storedWidget = parsed.widgets.find((w: { id: string }) => w.id === firstWidgetId);
    expect(storedWidget.visible).toBe(false);
  });

  it('loads persisted layout from localStorage', () => {
    // Pre-seed localStorage
    const { result: setup } = renderHook(() => useWidgetLayout());
    const firstWidgetId = setup.current.widgets[0].id;
    act(() => {
      setup.current.toggleWidget(firstWidgetId);
    });

    // Mount a new hook instance — should pick up the persisted state
    const { result: loaded } = renderHook(() => useWidgetLayout());
    const restoredWidget = loaded.current.widgets.find((w) => w.id === firstWidgetId);
    expect(restoredWidget?.visible).toBe(false);
  });

  it('falls back to defaults on invalid localStorage data', () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, 'not-valid-json');

    const { result } = renderHook(() => useWidgetLayout());
    expect(result.current.widgets.length).toBeGreaterThan(0);
    expect(result.current.widgets.every((w) => w.visible)).toBe(true);
  });

  it('resets on layout version mismatch', () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({ version: 999, widgets: [] }));

    const { result } = renderHook(() => useWidgetLayout());
    expect(result.current.widgets.length).toBeGreaterThan(0);
  });

  it('isCustomizing toggles with start/stop', () => {
    const { result } = renderHook(() => useWidgetLayout());
    expect(result.current.isCustomizing).toBe(false);

    act(() => {
      result.current.startCustomizing();
    });
    expect(result.current.isCustomizing).toBe(true);

    act(() => {
      result.current.stopCustomizing();
    });
    expect(result.current.isCustomizing).toBe(false);
  });
});
