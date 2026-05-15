// SPDX-License-Identifier: BUSL-1.1

import React from 'react';

import './ErrorBanner.css';

/** Props for the {@link ErrorBanner} component. */
export interface ErrorBannerProps {
  /** Human-readable error message to display. */
  message: string;
  /** Optional callback for retrying the failed operation. */
  onRetry?: () => void;
  /** Optional callback for dismissing the banner. */
  onDismiss?: () => void;
  /** Additional CSS class names to apply to the root element. */
  className?: string;
}

/**
 * Accessible error banner that announces errors via `role="alert"`.
 *
 * Uses semantic design tokens so colours adapt automatically to light,
 * dark, OLED-dark, and high-contrast modes.
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  onDismiss,
  className = '',
}) => (
  <div className={`error-banner ${className}`.trim()} role="alert">
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="error-banner__icon"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    <p className="error-banner__message">{message}</p>
    {onRetry && (
      <button type="button" className="error-banner__retry" onClick={onRetry}>
        Retry
      </button>
    )}
    {onDismiss && (
      <button
        type="button"
        className="error-banner__dismiss"
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        &times;
      </button>
    )}
  </div>
);

export default ErrorBanner;
