// SPDX-License-Identifier: BUSL-1.1

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureError } from '../../lib/monitoring';

// ---------------------------------------------------------------------------
// Props & State
// ---------------------------------------------------------------------------

/** Props for the widget-level error boundary. */
export interface WidgetErrorBoundaryProps {
  /** The widget content to render. */
  children: ReactNode;
  /** Widget identifier used in error reports. */
  widgetId?: string;
  /** Human-readable widget name for the fallback UI. */
  widgetName?: string;
}

/** Internal state for the widget-level error boundary. */
export interface WidgetErrorBoundaryState {
  hasError: boolean;
}

const INITIAL_STATE: WidgetErrorBoundaryState = {
  hasError: false,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Widget-level error boundary for dashboard cards and isolated UI sections.
 *
 * Catches render errors in individual widgets so a single broken widget
 * does not take down the entire dashboard. Provides a compact inline
 * fallback with a retry action.
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  public override state: WidgetErrorBoundaryState = INITIAL_STATE;

  /** Derive error state from a child render failure. */
  public static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  /** Report the error to monitoring. */
  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    captureError(error, {
      boundary: 'WidgetErrorBoundary',
      widgetId: this.props.widgetId ?? 'unknown',
      widgetName: this.props.widgetName ?? 'unknown',
      componentStack: errorInfo.componentStack?.trim() || 'Unavailable',
    });
  }

  /** Reset error state to allow the widget to re-render. */
  private readonly handleRetry = (): void => {
    this.setState(INITIAL_STATE);
  };

  public override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const label = this.props.widgetName ?? 'Widget';

    return (
      <div className="widget-error-boundary" role="alert" aria-label={`${label} failed to load`}>
        <svg
          className="widget-error-boundary__icon"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="16" r="0.75" fill="currentColor" />
        </svg>
        <p className="widget-error-boundary__message">{label} couldn&apos;t load</p>
        <button
          type="button"
          className="widget-error-boundary__retry"
          onClick={this.handleRetry}
          aria-label={`Retry loading ${label}`}
        >
          Retry
        </button>
      </div>
    );
  }
}
