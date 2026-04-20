// SPDX-License-Identifier: BUSL-1.1

/**
 * Dashboard customization panel component.
 *
 * Allows users to toggle widget visibility, reorder widgets, and reset
 * to defaults. Rendered as a dialog with focus trapping and keyboard support.
 *
 * References: issue #315
 * @module components/dashboard/CustomizePanel
 */

import { useCallback, useRef, type FC, type KeyboardEvent } from 'react';

import { useFocusTrap } from '../../accessibility/aria';
import { WIDGET_DEFINITION_MAP, type WidgetConfig, type WidgetId } from './widget-types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CustomizePanelProps {
  /** Whether the customization panel is open. */
  isOpen: boolean;
  /** All widget configurations, in display order. */
  widgets: readonly WidgetConfig[];
  /** Toggle a widget's visibility. */
  onToggle: (id: WidgetId) => void;
  /** Move a widget up or down. */
  onMove: (id: WidgetId, direction: 'up' | 'down') => void;
  /** Reset all widgets to default layout. */
  onReset: () => void;
  /** Close the customization panel. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CustomizePanel: FC<CustomizePanelProps> = ({
  isOpen,
  widgets,
  onToggle,
  onMove,
  onReset,
  onClose,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, { active: isOpen, restoreFocus: true });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="form-dialog" role="presentation" onKeyDown={handleKeyDown}>
      <div className="form-dialog__backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        className="form-dialog__panel customize-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customize-panel-title"
      >
        <h2 id="customize-panel-title" className="form-dialog__title">
          Customize Dashboard
        </h2>
        <p className="customize-panel__description">
          Toggle widgets on or off and reorder them to build your ideal dashboard.
        </p>

        <ul className="customize-panel__list" role="list">
          {widgets.map((widget, index) => {
            const def = WIDGET_DEFINITION_MAP.get(widget.id);
            if (!def) return null;

            return (
              <li key={widget.id} className="customize-panel__item" role="listitem">
                <label className="customize-panel__toggle">
                  <input
                    type="checkbox"
                    checked={widget.visible}
                    onChange={() => onToggle(widget.id)}
                    aria-label={`Show ${def.label} widget`}
                  />
                  <span className="customize-panel__label">
                    <span className="customize-panel__name">{def.label}</span>
                    <span className="customize-panel__desc">{def.description}</span>
                  </span>
                </label>
                <div
                  className="customize-panel__reorder"
                  role="group"
                  aria-label={`Reorder ${def.label}`}
                >
                  <button
                    type="button"
                    className="customize-panel__move-btn"
                    onClick={() => onMove(widget.id, 'up')}
                    disabled={index === 0}
                    aria-label={`Move ${def.label} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="customize-panel__move-btn"
                    onClick={() => onMove(widget.id, 'down')}
                    disabled={index === widgets.length - 1}
                    aria-label={`Move ${def.label} down`}
                  >
                    ↓
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="form-actions">
          <button type="button" className="form-button form-button--secondary" onClick={onReset}>
            Reset to Defaults
          </button>
          <button type="button" className="form-button form-button--primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
