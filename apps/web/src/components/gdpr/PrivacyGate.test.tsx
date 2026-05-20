// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for PrivacyGate component.
 *
 * Tests that features are gated behind consent with proper
 * privacy explainers shown when consent is not granted.
 *
 * References: issue #1612
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacyGate } from './PrivacyGate';
import { useConsent } from '../../hooks/useConsent';
import { useConsentHistory } from '../../hooks/useConsentHistory';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../hooks/useConsent', () => ({
  useConsent: vi.fn(),
}));

vi.mock('../../hooks/useConsentHistory', () => ({
  useConsentHistory: vi.fn(),
}));

const mockedUseConsent = vi.mocked(useConsent);
const mockedUseConsentHistory = vi.mocked(useConsentHistory);

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const defaultConsentHistoryReturn = {
  history: [],
  loading: false,
  recordChange: vi.fn(),
  recordBulkChanges: vi.fn(),
  exportHistory: vi.fn(),
  clearHistory: vi.fn(),
  refresh: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseConsentHistory.mockReturnValue(defaultConsentHistoryReturn);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PrivacyGate', () => {
  it('renders children when consent is granted', () => {
    mockedUseConsent.mockReturnValue({
      consent: {
        categories: {
          essential: true,
          analytics: true,
          error_reporting: false,
          sync: false,
          marketing: false,
        },
        timestamp: '',
        policyVersion: '1.0.0',
        method: 'settings',
        hasCompletedFirstRun: true,
      },
      needsConsent: false,
      hasCompleted: true,
      updateCategory: vi.fn(),
      acceptAll: vi.fn(),
      rejectAll: vi.fn(),
      savePreferences: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <PrivacyGate
        requiredConsent="analytics"
        featureName="Analytics Dashboard"
        featureDescription="View usage stats."
      >
        <div data-testid="gated-content">Analytics Content</div>
      </PrivacyGate>,
    );

    expect(screen.getByTestId('gated-content')).toBeDefined();
  });

  it('shows privacy explainer when consent is not granted', () => {
    mockedUseConsent.mockReturnValue({
      consent: {
        categories: {
          essential: true,
          analytics: false,
          error_reporting: false,
          sync: false,
          marketing: false,
        },
        timestamp: '',
        policyVersion: '1.0.0',
        method: 'settings',
        hasCompletedFirstRun: true,
      },
      needsConsent: false,
      hasCompleted: true,
      updateCategory: vi.fn(),
      acceptAll: vi.fn(),
      rejectAll: vi.fn(),
      savePreferences: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <PrivacyGate
        requiredConsent="analytics"
        featureName="Analytics Dashboard"
        featureDescription="View usage statistics."
        dataNeeded={['Usage patterns', 'Page views']}
      >
        <div data-testid="gated-content">Analytics Content</div>
      </PrivacyGate>,
    );

    expect(screen.queryByTestId('gated-content')).toBeNull();
    expect(screen.getByText('Analytics Dashboard')).toBeDefined();
    expect(screen.getByText('View usage statistics.')).toBeDefined();
    expect(screen.getByText('Usage patterns')).toBeDefined();
    expect(screen.getByText('Page views')).toBeDefined();
  });

  it('shows custom fallback when provided', () => {
    mockedUseConsent.mockReturnValue({
      consent: {
        categories: {
          essential: true,
          analytics: false,
          error_reporting: false,
          sync: false,
          marketing: false,
        },
        timestamp: '',
        policyVersion: '1.0.0',
        method: 'settings',
        hasCompletedFirstRun: true,
      },
      needsConsent: false,
      hasCompleted: true,
      updateCategory: vi.fn(),
      acceptAll: vi.fn(),
      rejectAll: vi.fn(),
      savePreferences: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <PrivacyGate
        requiredConsent="analytics"
        featureName="Analytics"
        featureDescription="Stats"
        fallback={<div data-testid="custom-fallback">Custom Gate UI</div>}
      >
        <div>Content</div>
      </PrivacyGate>,
    );

    expect(screen.getByTestId('custom-fallback')).toBeDefined();
  });

  it('calls updateCategory when enable button is clicked', () => {
    const updateCategory = vi.fn();
    mockedUseConsent.mockReturnValue({
      consent: {
        categories: {
          essential: true,
          analytics: false,
          error_reporting: false,
          sync: false,
          marketing: false,
        },
        timestamp: '',
        policyVersion: '1.0.0',
        method: 'settings',
        hasCompletedFirstRun: true,
      },
      needsConsent: false,
      hasCompleted: true,
      updateCategory,
      acceptAll: vi.fn(),
      rejectAll: vi.fn(),
      savePreferences: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <PrivacyGate requiredConsent="analytics" featureName="Analytics" featureDescription="Stats">
        <div>Content</div>
      </PrivacyGate>,
    );

    const enableBtn = screen.getByRole('button', { name: /enable analytics/i });
    fireEvent.click(enableBtn);
    expect(updateCategory).toHaveBeenCalledWith('analytics', true);
  });

  it('records consent change in history when enabling', () => {
    const recordChange = vi.fn();
    mockedUseConsent.mockReturnValue({
      consent: {
        categories: {
          essential: true,
          sync: false,
          analytics: false,
          error_reporting: false,
          marketing: false,
        },
        timestamp: '',
        policyVersion: '1.0.0',
        method: 'settings',
        hasCompletedFirstRun: true,
      },
      needsConsent: false,
      hasCompleted: true,
      updateCategory: vi.fn(),
      acceptAll: vi.fn(),
      rejectAll: vi.fn(),
      savePreferences: vi.fn(),
      refresh: vi.fn(),
    });
    mockedUseConsentHistory.mockReturnValue({
      ...defaultConsentHistoryReturn,
      recordChange,
    });

    render(
      <PrivacyGate requiredConsent="sync" featureName="Cloud Sync" featureDescription="Sync data.">
        <div>Content</div>
      </PrivacyGate>,
    );

    fireEvent.click(screen.getByRole('button', { name: /enable cloud sync/i }));
    expect(recordChange).toHaveBeenCalledWith('sync', true, 'dashboard');
  });
});
