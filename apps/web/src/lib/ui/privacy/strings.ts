// SPDX-License-Identifier: BUSL-1.1

/** User-facing strings owned by the privacy trio foundation. */
export const PRIVACY_STRINGS = {
  firstActivation:
    'Privacy mode hides exact amounts on this device. Use it in public or when sharing your screen; turn it off to see full financial details again.',
  widgetFirstAdd: 'Show exact amounts on widget? Widgets are visible from a locked device.',
  protectedCategoryToggle: 'Require biometric to view details',
  protectedRollupLabel: 'Protected',
  quickActionUnavailable:
    'Use this shortcut to hide exact amounts quickly. Platform quick-settings integrations can call the same privacy state API.',
} as const;
