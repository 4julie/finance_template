// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';
import { MaskingMode } from '../masking';
import {
  getWidgetMaskingMode,
  setWidgetMaskingMode,
  WIDGET_FIRST_ADD_PROMPT,
} from '../widget-storage';

describe('widget masking storage', () => {
  it('defaults new widgets to Bucketed and stores explicit opt-in modes', () => {
    localStorage.clear();
    expect(getWidgetMaskingMode('widget-1')).toBe(MaskingMode.Bucketed);
    setWidgetMaskingMode('widget-1', MaskingMode.Visible);
    expect(getWidgetMaskingMode('widget-1')).toBe(MaskingMode.Visible);
  });

  it('ships first-add privacy prompt copy', () => {
    expect(WIDGET_FIRST_ADD_PROMPT).toContain('locked device');
  });
});
