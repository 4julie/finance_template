// SPDX-License-Identifier: BUSL-1.1

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

const captureErrorMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/monitoring', () => ({
  captureError: captureErrorMock,
}));

/** Throw during render to trigger the error boundary. */
function ThrowError({ message = 'Widget crash' }: { message?: string }): never {
  throw new Error(message);
}

describe('WidgetErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    captureErrorMock.mockReset();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <WidgetErrorBoundary widgetId="net-worth" widgetName="Net Worth">
        <div>Widget content</div>
      </WidgetErrorBoundary>,
    );

    expect(screen.getByText('Widget content')).toBeInTheDocument();
  });

  it('shows compact fallback when a child throws', () => {
    render(
      <WidgetErrorBoundary widgetId="net-worth" widgetName="Net Worth">
        <ThrowError message="Chart render failure" />
      </WidgetErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/net worth couldn't load/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry loading net worth/i })).toBeInTheDocument();
  });

  it('uses generic label when widgetName is not provided', () => {
    render(
      <WidgetErrorBoundary>
        <ThrowError />
      </WidgetErrorBoundary>,
    );

    expect(screen.getByText(/widget couldn't load/i)).toBeInTheDocument();
  });

  it('recovers after retry when the error is transient', () => {
    let shouldThrow = true;

    function RecoverableChild() {
      if (shouldThrow) {
        throw new Error('Transient widget failure');
      }

      return <div>Recovered widget</div>;
    }

    render(
      <WidgetErrorBoundary widgetId="budget" widgetName="Budget">
        <RecoverableChild />
      </WidgetErrorBoundary>,
    );

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /retry loading budget/i }));

    expect(screen.getByText('Recovered widget')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports error to monitoring with widget context', () => {
    render(
      <WidgetErrorBoundary widgetId="spending-chart" widgetName="Spending Chart">
        <ThrowError message="Chart crash" />
      </WidgetErrorBoundary>,
    );

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Chart crash' }),
      expect.objectContaining({
        boundary: 'WidgetErrorBoundary',
        widgetId: 'spending-chart',
        widgetName: 'Spending Chart',
        componentStack: expect.any(String),
      }),
    );
  });

  it('does not affect sibling widgets when one crashes', () => {
    render(
      <div>
        <WidgetErrorBoundary widgetId="broken" widgetName="Broken">
          <ThrowError message="This widget crashes" />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary widgetId="healthy" widgetName="Healthy">
          <div>Healthy widget content</div>
        </WidgetErrorBoundary>
      </div>,
    );

    // Broken widget shows fallback
    expect(screen.getByText(/broken couldn't load/i)).toBeInTheDocument();
    // Healthy widget still renders
    expect(screen.getByText('Healthy widget content')).toBeInTheDocument();
  });
});
