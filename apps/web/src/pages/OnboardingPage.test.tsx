// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for OnboardingPage.
 *
 * Tests the two-path onboarding flow: Local Only and Create Account.
 *
 * References: issue #1621
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OnboardingPage from './OnboardingPage';
import { useLocalOnlyMode } from '../hooks/useLocalOnlyMode';
import { useConsent } from '../hooks/useConsent';
import { useConsentHistory } from '../hooks/useConsentHistory';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../hooks/useLocalOnlyMode', () => ({
  useLocalOnlyMode: vi.fn(),
}));

vi.mock('../hooks/useConsent', () => ({
  useConsent: vi.fn(),
}));

vi.mock('../hooks/useConsentHistory', () => ({
  useConsentHistory: vi.fn(),
}));

const mockedUseLocalOnlyMode = vi.mocked(useLocalOnlyMode);
const mockedUseConsent = vi.mocked(useConsent);
const mockedUseConsentHistory = vi.mocked(useConsentHistory);

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const defaultLocalOnlyReturn = {
  isLocalOnly: false,
  onboardingComplete: false,
  features: [
    {
      id: 'accounts',
      name: 'Account Tracking',
      description: 'Track bank accounts.',
      availableLocalOnly: true,
      requiresAccount: false,
    },
    {
      id: 'sync',
      name: 'Cloud Sync',
      description: 'Sync across devices.',
      availableLocalOnly: false,
      requiresAccount: true,
    },
  ],
  enableLocalOnly: vi.fn(),
  disableLocalOnly: vi.fn(),
  completeOnboarding: vi.fn(),
  isFeatureAvailable: vi.fn(() => true),
  refresh: vi.fn(),
};

const defaultConsentReturn = {
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
    method: 'first_run' as const,
    hasCompletedFirstRun: false,
  },
  needsConsent: true,
  hasCompleted: false,
  updateCategory: vi.fn(),
  acceptAll: vi.fn(),
  rejectAll: vi.fn(),
  savePreferences: vi.fn(),
  refresh: vi.fn(),
};

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
  mockedUseLocalOnlyMode.mockReturnValue(defaultLocalOnlyReturn);
  mockedUseConsent.mockReturnValue(defaultConsentReturn);
  mockedUseConsentHistory.mockReturnValue(defaultConsentHistoryReturn);
});

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OnboardingPage', () => {
  it('renders the welcome title', () => {
    renderWithRouter(<OnboardingPage />);
    expect(screen.getByRole('heading', { name: /welcome to finance/i })).toBeDefined();
  });

  it('shows two path options: Local Only and Create Account', () => {
    renderWithRouter(<OnboardingPage />);
    expect(screen.getByRole('heading', { name: /local only/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /create account/i })).toBeDefined();
  });

  it('navigates to signup when Create Account is clicked', () => {
    renderWithRouter(<OnboardingPage />);
    const accountBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(accountBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });

  it('shows privacy preferences step when Local Only is clicked', () => {
    renderWithRouter(<OnboardingPage />);
    const localBtn = screen.getByRole('button', { name: /start local only/i });
    fireEvent.click(localBtn);
    expect(screen.getByRole('heading', { name: /privacy preferences/i })).toBeDefined();
  });

  it('renders feature comparison table', () => {
    renderWithRouter(<OnboardingPage />);
    expect(screen.getByText('Account Tracking')).toBeDefined();
    expect(screen.getByText('Cloud Sync')).toBeDefined();
  });

  it('completes onboarding with essential-only privacy', () => {
    const enableLocalOnly = vi.fn();
    const completeOnboarding = vi.fn();
    const rejectAll = vi.fn();

    mockedUseLocalOnlyMode.mockReturnValue({
      ...defaultLocalOnlyReturn,
      enableLocalOnly,
      completeOnboarding,
    });

    mockedUseConsent.mockReturnValue({
      ...defaultConsentReturn,
      rejectAll,
    });

    renderWithRouter(<OnboardingPage />);

    // Step 1: Choose Local Only
    fireEvent.click(screen.getByRole('button', { name: /start local only/i }));

    // Step 2: Choose Essential Only
    fireEvent.click(screen.getByRole('button', { name: /essential only/i }));

    expect(rejectAll).toHaveBeenCalled();
    expect(enableLocalOnly).toHaveBeenCalled();
    expect(completeOnboarding).toHaveBeenCalled();
  });
});
