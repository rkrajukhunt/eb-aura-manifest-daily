import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';

import type { OfferedPlan } from './purchases';

// The route lives under `app/`, but the test imports it from here rather than
// letting expo-router's require.context pull @testing-library into the bundle
// (same reason as signInGate.test.tsx).
import PaywallRoute from '../../../app/paywall';

// ── Mocks ──────────────────────────────────────────────────────────────────
// `mock`-prefixed names are the only closures jest.mock factories may capture.
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: { from?: string } = {};
let mockPremium = false;

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const mockLoadPlans = jest.fn();
jest.mock('@/features/paywall/purchases', () => ({
  loadPlans: () => mockLoadPlans(),
  purchasePlan: jest.fn(),
  restorePurchases: jest.fn(),
}));

jest.mock('@/features/paywall/useEntitlement', () => ({
  useEntitlement: () => ({ premium: mockPremium }),
}));

const mockMarkPaywallSeen = jest.fn();
jest.mock('@/features/paywall/paywallSeen', () => ({
  markPaywallSeen: () => mockMarkPaywallSeen(),
}));

jest.mock('@/features/paywall/claim', () => ({
  appleAuthAvailable: jest.fn(async () => true),
}));

jest.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ data: { name: 'Maya', values: ['Calm & less anxiety'] } }),
}));
jest.mock('@/features/gratitude/useGratitude', () => ({
  useGratitude: () => ({ todaysEntry: null }),
}));
jest.mock('@/stores/appState', () => ({
  useAppState: (selector: (s: { status: string; userId: string }) => unknown) =>
    selector({ status: 'ready', userId: 'user-1' }),
}));
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn(), register: jest.fn() },
}));

// The cover and the claim sheet are exercised by their own suites; here the
// cover is stubbed so the test observes only the route's gating decision (show
// cover vs. escape to Home) and the dismissal wiring. `onDismiss` is forwarded
// to a real button so the route's dismiss→free-tier path can be invoked.
jest.mock('@/features/paywall/PaywallScreen', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    PaywallScreen: (props: { onDismiss?: () => void }) =>
      React.createElement(
        Pressable,
        { testID: 'paywall-cover', onPress: () => props.onDismiss?.() },
        [React.createElement(Text, { key: 't' }, 'cover')],
      ),
    DISMISS_DELAY_MS: 2000,
  };
});
jest.mock('@/features/paywall/ClaimSheet', () => {
  const React = require('react');
  return { ClaimSheet: React.forwardRef(() => null) };
});

// ── Helpers ─────────────────────────────────────────────────────────────────
const plan = (overrides: Partial<OfferedPlan> = {}): OfferedPlan =>
  ({
    id: 'annual',
    pkg: null,
    price: '$39.99',
    monthlyEquivalent: '$3.33',
    hasTrial: false,
    trialDays: null,
    purchasable: false,
    ...overrides,
  }) as OfferedPlan;

/** What `loadPlans` returns with no store behind it: nothing (no hardcoded prices). */
const none: OfferedPlan[] = [];
/** A real, purchasable offering. */
const real = [plan({ pkg: {} as OfferedPlan['pkg'], purchasable: true })];

const renderRoute = () =>
  render(
    <ThemeProvider>
      <PaywallRoute />
    </ThemeProvider>,
  );

describe('PaywallRoute — no purchasable offering (the $39.99 fallback)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockPremium = false;
  });

  it('HARD mode: routes to Home when no offering resolves — no fake prices', async () => {
    mockParams = {}; // no `from` → the hard gate
    mockLoadPlans.mockResolvedValue(none);

    renderRoute();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home'));
    // Marked seen so the escape hatch is a real pass-through, not a bounce.
    expect(mockMarkPaywallSeen).toHaveBeenCalled();
    // No cover is ever mounted; the holding view shows instead.
    expect(screen.queryByTestId('paywall-cover')).toBeNull();
    expect(screen.getByTestId('paywall-unavailable')).toBeTruthy();
  });

  it('HARD mode: shows the cover when the offering IS purchasable', async () => {
    mockParams = {};
    mockLoadPlans.mockResolvedValue(real);

    renderRoute();

    await waitFor(() => expect(screen.getByTestId('paywall-cover')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/home');
  });

  it('HARD mode: dismissing the cover leaves to the free tier, marking it seen — no discount chase', async () => {
    mockParams = {};
    mockLoadPlans.mockResolvedValue(real);

    renderRoute();

    await waitFor(() => expect(screen.getByTestId('paywall-cover')).toBeTruthy());
    // The ✕ on the real cover calls the route's onDismiss; that must send her
    // to Home with the flag set, never to a second, quieter offer.
    fireEvent.press(screen.getByTestId('paywall-cover'));

    expect(mockMarkPaywallSeen).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
  });

  it('SOFT mode (from=settings): shows "plans unavailable", never a fake-priced cover', async () => {
    mockParams = { from: 'settings' };
    mockLoadPlans.mockResolvedValue(none);

    renderRoute();

    // Opened deliberately from Settings, so it stays put with an honest message
    // and a way back — rather than yanking her to Home, and never inventing prices.
    await waitFor(() => expect(screen.getByTestId('paywall-unavailable-message')).toBeTruthy());
    expect(screen.queryByTestId('paywall-cover')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/home');
  });
});
