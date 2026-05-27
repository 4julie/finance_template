// SPDX-License-Identifier: BUSL-1.1

import { isMaskingMode, MaskingMode } from './masking';

export const WIDGET_MASKING_STORAGE_KEY = 'finance:widget-masking-modes';
export const DEFAULT_WIDGET_MASKING_MODE = MaskingMode.Bucketed;

/** Copy shown the first time a widget asks whether exact amounts are acceptable. */
export const WIDGET_FIRST_ADD_PROMPT =
  'Show exact amounts on widget? Widgets are visible from a locked device.';

/** Storage shape for per-widget privacy config. */
export type WidgetMaskingConfig = Readonly<Record<string, MaskingMode>>;

function readRawConfig(
  storage: Storage | undefined = globalThis.localStorage,
): WidgetMaskingConfig {
  try {
    const raw = storage?.getItem(WIDGET_MASKING_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const config: Record<string, MaskingMode> = {};
    for (const [widgetId, mode] of Object.entries(parsed)) {
      if (isMaskingMode(mode)) {
        config[widgetId] = mode;
      }
    }
    return config;
  } catch {
    return {};
  }
}

function writeRawConfig(
  config: WidgetMaskingConfig,
  storage: Storage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(WIDGET_MASKING_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Widgets keep the safer default when storage is unavailable.
  }
}

/** Return the configured masking mode for a widget, defaulting new widgets to Bucketed. */
export function getWidgetMaskingMode(
  widgetId: string,
  storage: Storage | undefined = globalThis.localStorage,
): MaskingMode {
  return readRawConfig(storage)[widgetId] ?? DEFAULT_WIDGET_MASKING_MODE;
}

/** Persist the masking mode for a widget instance. */
export function setWidgetMaskingMode(
  widgetId: string,
  mode: MaskingMode,
  storage: Storage | undefined = globalThis.localStorage,
): WidgetMaskingConfig {
  const next = { ...readRawConfig(storage), [widgetId]: mode };
  writeRawConfig(next, storage);
  return next;
}

/** Return all stored per-widget masking modes. */
export function listWidgetMaskingModes(
  storage: Storage | undefined = globalThis.localStorage,
): WidgetMaskingConfig {
  return readRawConfig(storage);
}
