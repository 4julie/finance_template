// SPDX-License-Identifier: BUSL-1.1

/**
 * Dashboard widget container component.
 *
 * Renders a widget card with appropriate sizing, header, and ARIA semantics.
 * Used by the DashboardPage to render each visible widget in the layout.
 *
 * References: issue #315
 * @module components/dashboard/WidgetContainer
 */

import type { FC, ReactNode } from 'react';

import type { WidgetSize } from './widget-types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WidgetContainerProps {
  /** Unique widget identifier for ARIA labelling. */
  id: string;
  /** Display title shown in the widget header. */
  title: string;
  /** Size hint for grid layout. */
  size: WidgetSize;
  /** Widget body content. */
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Accessible card container for a dashboard widget.
 *
 * Uses `<article>` with `aria-label` for screen reader identification.
 * The `data-widget-size` attribute drives the CSS grid column span.
 */
export const WidgetContainer: FC<WidgetContainerProps> = ({ id, title, size, children }) => (
  <article
    className={`widget widget--${size}`}
    data-widget-size={size}
    data-widget-id={id}
    aria-label={title}
  >
    <div className="widget__header">
      <h3 className="widget__title">{title}</h3>
    </div>
    <div className="widget__body">{children}</div>
  </article>
);
