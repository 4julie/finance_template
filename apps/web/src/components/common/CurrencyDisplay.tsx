// SPDX-License-Identifier: BUSL-1.1

import React from 'react';

import { formatCurrencyLabel } from '../../lib/currency';
import {
  formatAmountWithSettings,
  getAmountColor,
  useMoneyDisplay,
} from '../../lib/display-settings';

export interface CurrencyDisplayProps {
  /** Amount in integer cents (e.g., 12345 = $123.45). */
  amount: number;
  /** ISO 4217 currency code (default: `"USD"`). */
  currency?: string;
  /** BCP 47 locale tag (default: `"en-US"`). */
  locale?: string;
  /** Apply positive/negative color classes. */
  colorize?: boolean;
  /** Show explicit sign for non-zero amounts. */
  showSign?: boolean;
  /** Additional CSS class names. */
  className?: string;
  /** Override the accessible label. */
  'aria-label'?: string;
}

/**
 * Renders a formatted currency amount from integer cents.
 *
 * Uses the centralized `formatCurrency` utility from `lib/currency`
 * for the accessible label, and applies user-configurable display
 * settings (decimal visibility, negative format, currency display mode,
 * and amount colors) via the `useMoneyDisplay()` hook.
 *
 * Accessibility: when `negativeFormat` is `'color-only'`, the visible
 * text omits the minus sign but the `aria-label` always includes
 * "negative" for screen readers so information is never conveyed by
 * color alone.
 */
export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency = 'USD',
  locale = 'en-US',
  colorize = false,
  showSign = false,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const displaySettings = useMoneyDisplay();

  // Format the visible text using the user's display preferences.
  const formatted = formatAmountWithSettings(amount, displaySettings, {
    currency,
    locale,
    signDisplay: showSign ? 'exceptZero' : 'auto',
  });

  // Build CSS class for color (legacy class-based approach still supported).
  let colorClass = '';
  if (colorize) {
    if (amount > 0) colorClass = 'amount--positive';
    else if (amount < 0) colorClass = 'amount--negative';
    else colorClass = 'amount--zero';
  }

  // Apply user-chosen color via inline style when colorize is enabled.
  const colorStyle: React.CSSProperties | undefined = colorize
    ? { color: getAmountColor(amount, displaySettings) }
    : undefined;

  // The accessible label always uses the standard format with explicit
  // "negative" prefix so screen readers convey sign regardless of
  // visual negative format.
  const label = ariaLabel ?? formatCurrencyLabel(amount, { currency, locale });

  return (
    <span
      className={`currency-display ${colorClass} ${className}`.trim()}
      aria-label={label}
      style={colorStyle}
    >
      {formatted}
    </span>
  );
};

export default CurrencyDisplay;
