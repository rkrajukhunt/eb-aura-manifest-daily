import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { paywallCopy } from '@/copy/paywall';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LetterMotionProvider } from '@/theme/motion';

import { DISMISS_DELAY_MS, PaywallScreen } from './PaywallScreen';
import type { OfferedPlan } from './purchases';

jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));

const { analytics } = jest.requireMock('@/lib/analytics') as { analytics: { capture: jest.Mock } };

/**
 * The post-Letter paywall, tested against product 15's anti-resentment
 * checklist — which the plan copies into the Definition of Done verbatim.
 *
 * Half of these assert ABSENCE. A dark pattern is not a bug that throws; it is a
 * countdown someone added because it converted. Pinning "there is no timer, no
 * fake discount, no second offer" is the only way that stays true through the
 * next round of conversion tuning.
 */
describe('PaywallScreen', () => {
  const plan = (id: 'annual' | 'weekly', overrides: Partial<OfferedPlan> = {}): OfferedPlan =>
    ({
      id,
      price: id === 'annual' ? '$39.99' : '$6.99',
      monthlyEquivalent: id === 'annual' ? '$3.33' : '$30.29',
      hasTrial: id === 'weekly',
      pkg: { product: { identifier: `aura_premium_${id}` } },
      ...overrides,
    }) as OfferedPlan;

  const plans = [plan('annual'), plan('weekly')];

  const renderPaywall = (props: Partial<React.ComponentProps<typeof PaywallScreen>> = {}) =>
    render(
      <ThemeProvider>
        <LetterMotionProvider>
          <PaywallScreen
            plans={plans}
            onPurchase={jest.fn()}
            onDismiss={jest.fn()}
            onRestore={jest.fn()}
            {...props}
          />
        </LetterMotionProvider>
      </ThemeProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('the offer', () => {
    it('leads with the headline that mirrors the letter’s close', async () => {
      await renderPaywall();

      expect(screen.getByText(paywallCopy.headline)).toBeTruthy();
    });

    it('shows the honest contrast block', async () => {
      await renderPaywall();

      expect(screen.getByText(paywallCopy.contrast.today)).toBeTruthy();
      expect(screen.getByText(paywallCopy.contrast.everyDay)).toBeTruthy();
    });

    it('offers both plans', async () => {
      await renderPaywall();

      expect(screen.getByTestId('paywall-plan-annual')).toBeTruthy();
      expect(screen.getByTestId('paywall-plan-weekly')).toBeTruthy();
    });

    it('pre-selects annual (12 §1)', async () => {
      await renderPaywall();

      expect(screen.getByTestId('paywall-plan-annual').props.accessibilityState.selected).toBe(
        true,
      );
      expect(screen.getByTestId('paywall-plan-weekly').props.accessibilityState.selected).toBe(
        false,
      );
    });

    it('lets her choose weekly instead', async () => {
      await renderPaywall();

      await fireEvent.press(screen.getByTestId('paywall-plan-weekly'));

      expect(screen.getByTestId('paywall-plan-weekly').props.accessibilityState.selected).toBe(
        true,
      );
    });
  });

  describe('checklist #2 — the monthly equivalent is PRINTED', () => {
    it('prints it beside the weekly price', async () => {
      await renderPaywall();

      expect(screen.getByText(/\$6\.99\/week · about \$30\.29\/month/)).toBeTruthy();
    });

    it('prints it beside the annual price too', async () => {
      await renderPaywall();

      expect(screen.getByText(/\$39\.99\/year · about \$3\.33\/month/)).toBeTruthy();
    });
  });

  describe('checklist #3 — trial terms restated on the card', () => {
    it('states the trial on the plan that has one', async () => {
      await renderPaywall();

      expect(screen.getByText(paywallCopy.plans.trialNote)).toBeTruthy();
    });

    it('states the renewal terms', async () => {
      await renderPaywall();

      expect(screen.getAllByText(paywallCopy.plans.renewalNote).length).toBeGreaterThan(0);
    });
  });

  describe('dismissal — a real outcome, not a trap', () => {
    it('hides the dismiss control until the offer has been readable for a moment', async () => {
      jest.useFakeTimers();
      await renderPaywall();

      expect(screen.queryByTestId('paywall-dismiss')).toBeNull();

      jest.useRealTimers();
    });

    it('reveals it after the delay', async () => {
      jest.useFakeTimers();
      await renderPaywall();

      await act(async () => {
        jest.advanceTimersByTime(DISMISS_DELAY_MS);
      });

      expect(screen.getByTestId('paywall-dismiss')).toBeTruthy();
      jest.useRealTimers();
    });

    it('lets her leave for the free tier', async () => {
      jest.useFakeTimers();
      const onDismiss = jest.fn();
      await renderPaywall({ onDismiss });

      await act(async () => {
        jest.advanceTimersByTime(DISMISS_DELAY_MS);
      });
      jest.useRealTimers();
      await fireEvent.press(screen.getByTestId('paywall-dismiss'));

      expect(onDismiss).toHaveBeenCalled();
    });

    it('waits only two seconds — long enough to read, short enough not to coerce', () => {
      expect(DISMISS_DELAY_MS).toBe(2_000);
    });
  });

  describe('no dark patterns (product 01 §10, release-blocking)', () => {
    it('shows no countdown or expiring offer', async () => {
      await renderPaywall();

      expect(screen.queryByText(/\d+:\d\d/)).toBeNull();
      expect(screen.queryByText(/expires|ends in|hurry|only today|limited/i)).toBeNull();
    });

    it('shows no struck-through or discounted price', async () => {
      await renderPaywall();

      expect(screen.queryByText(/was \$|save \d+%|\d+% off/i)).toBeNull();
    });

    it('claims no social proof we have not earned', async () => {
      await renderPaywall();

      expect(screen.queryByText(/join \d|\d+[km]? (people|users|members)/i)).toBeNull();
    });

    it('never implies the letter is at stake', async () => {
      await renderPaywall();

      expect(screen.queryByText(/lose|delete|forfeit|expire/i)).toBeNull();
    });
  });

  describe('footer', () => {
    it('offers restore, so nobody pays twice for the same subscription', async () => {
      const onRestore = jest.fn();
      await renderPaywall({ onRestore });

      await fireEvent.press(screen.getByTestId('paywall-restore'));

      expect(onRestore).toHaveBeenCalled();
    });
  });

  describe('analytics', () => {
    it('reports the view with its surface', async () => {
      await renderPaywall();

      expect(analytics.capture).toHaveBeenCalledWith('paywall_viewed', {
        surface: 'post_letter',
      });
    });

    it('reports a plan selection with the store sku', async () => {
      await renderPaywall();

      await fireEvent.press(screen.getByTestId('paywall-plan-weekly'));

      expect(analytics.capture).toHaveBeenCalledWith('paywall_plan_selected', {
        sku: 'aura_premium_weekly',
      });
    });

    it('reports a dismissal — declining is a measured outcome, not a failure', async () => {
      jest.useFakeTimers();
      await renderPaywall();
      await act(async () => {
        jest.advanceTimersByTime(DISMISS_DELAY_MS);
      });
      jest.useRealTimers();

      await fireEvent.press(screen.getByTestId('paywall-dismiss'));

      expect(analytics.capture).toHaveBeenCalledWith('paywall_dismissed');
    });
  });

  describe('purchase', () => {
    it('buys the selected plan', async () => {
      const onPurchase = jest.fn();
      await renderPaywall({ onPurchase });

      await fireEvent.press(screen.getByTestId('paywall-continue'));

      expect(onPurchase).toHaveBeenCalledWith(expect.objectContaining({ id: 'annual' }));
    });

    it('buys weekly once she has switched to it', async () => {
      const onPurchase = jest.fn();
      await renderPaywall({ onPurchase });

      await fireEvent.press(screen.getByTestId('paywall-plan-weekly'));
      await fireEvent.press(screen.getByTestId('paywall-continue'));

      expect(onPurchase).toHaveBeenCalledWith(expect.objectContaining({ id: 'weekly' }));
    });
  });
});
