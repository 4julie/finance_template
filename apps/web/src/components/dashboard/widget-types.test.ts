// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import {
  buildDefaultLayout,
  DEFAULT_WIDGET_ORDER,
  LAYOUT_VERSION,
  WIDGET_DEFINITION_MAP,
  WIDGET_DEFINITIONS,
} from './widget-types';

describe('WIDGET_DEFINITIONS', () => {
  it('contains at least 8 widget definitions', () => {
    expect(WIDGET_DEFINITIONS.length).toBeGreaterThanOrEqual(8);
  });

  it('has unique IDs for every widget', () => {
    const ids = WIDGET_DEFINITIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all definitions have label and description', () => {
    for (const def of WIDGET_DEFINITIONS) {
      expect(def.label).toBeTruthy();
      expect(def.description).toBeTruthy();
    }
  });

  it('all definitions have a valid size', () => {
    for (const def of WIDGET_DEFINITIONS) {
      expect(['small', 'medium', 'large']).toContain(def.defaultSize);
    }
  });
});

describe('WIDGET_DEFINITION_MAP', () => {
  it('maps every widget ID to its definition', () => {
    for (const def of WIDGET_DEFINITIONS) {
      expect(WIDGET_DEFINITION_MAP.get(def.id)).toBe(def);
    }
  });

  it('returns undefined for unknown IDs', () => {
    expect(WIDGET_DEFINITION_MAP.get('nonexistent' as never)).toBeUndefined();
  });
});

describe('DEFAULT_WIDGET_ORDER', () => {
  it('includes all widget IDs', () => {
    const definedIds = new Set(WIDGET_DEFINITIONS.map((d) => d.id));
    for (const id of DEFAULT_WIDGET_ORDER) {
      expect(definedIds.has(id)).toBe(true);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(DEFAULT_WIDGET_ORDER).size).toBe(DEFAULT_WIDGET_ORDER.length);
  });
});

describe('buildDefaultLayout', () => {
  it('returns the current layout version', () => {
    const layout = buildDefaultLayout();
    expect(layout.version).toBe(LAYOUT_VERSION);
  });

  it('creates one config per widget in DEFAULT_WIDGET_ORDER', () => {
    const layout = buildDefaultLayout();
    expect(layout.widgets.length).toBe(DEFAULT_WIDGET_ORDER.length);
  });

  it('all widgets are visible by default', () => {
    const layout = buildDefaultLayout();
    for (const widget of layout.widgets) {
      expect(widget.visible).toBe(true);
    }
  });

  it('orders are sequential starting from 0', () => {
    const layout = buildDefaultLayout();
    const orders = layout.widgets.map((w) => w.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: orders.length }, (_, i) => i));
  });

  it('preserves the size from widget definitions', () => {
    const layout = buildDefaultLayout();
    for (const widget of layout.widgets) {
      const def = WIDGET_DEFINITION_MAP.get(widget.id);
      expect(widget.size).toBe(def?.defaultSize);
    }
  });
});
