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
 * The paywall — design v5 step 23 + the trial-transparency beat (24), tested
 * against product 15's anti-resentment checklist.
 *
 * Half of these assert ABSENCE. A dark pattern is not a bug that throws; it is a
 * countdown someone added because it converted. Pinning "there is no timer, no
 * fake discount, no second offer" is the only way that stays true through the
 * next round of conversion tuning.
 */
describe('PaywallScreen', () => {
  const plan = (
    id: 'annual' | 'monthly' | 'weekly',
    overrides: Partial<OfferedPlan> = {},
  ): OfferedPlan =>
    ({
      id,
      price: id === 'annual' ? '$49.99' : id === 'monthly' ? '$12.99' : '$3.99',
      monthlyEquivalent: id === 'annual' ? '$4.17' : id === 'weekly' ? '$17.29' : null,
      hasTrial: false,
      trialDays: null,
      purchasable: true,
      pkg: {
        product: {
          identifier: `aura_premium_${id}`,
          price: id === 'annual' ? 49.99 : id === 'monthly' ? 12.99 : 3.99,
          currencyCode: 'USD',
        },
      },
      ...overrides,
    }) as OfferedPlan;

  // The real offer: the annual hero carries a 7-day trial.
  const trialPlans = [
    plan('annual', { hasTrial: true, trialDays: 7 }),
    plan('monthly'),
    plan('weekly'),
  ];
  // The store has no intro offer configured yet — the honest fallback.
  const noTrialPlans = [plan('annual'), plan('monthly')];

  const renderPaywall = (props: Partial<React.ComponentProps<typeof PaywallScreen>> = {}) =>
    render(
      <ThemeProvider>
        <LetterMotionProvider>
          <PaywallScreen
            plans={trialPlans}
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
    jest.useRealTimers();
  });

  describe('the headline', () => {
    it('always presents the trial promise and timeline', async () => {
      await renderPaywall({ goal: 'calm' });
      expect(screen.getByText(paywallCopy.trial.headline)).toBeTruthy();
      expect(screen.getByText(paywallCopy.trial.subhead)).toBeTruthy();
      expect(screen.getByTestId('paywall-timeline')).toBeTruthy();
    });

    it('presents the trial promise even with fallback plans', async () => {
      await renderPaywall({ plans: noTrialPlans });
      expect(screen.getByText(paywallCopy.trial.headline)).toBeTruthy();
      expect(screen.getByText(paywallCopy.trial.subhead)).toBeTruthy();
      expect(screen.getByTestId('paywall-timeline')).toBeTruthy();
    });
  });

  describe('the plans (honest numbers, checklist #2)', () => {
    it('leads with the yearly trial as the hero, badged, with its per-week arithmetic', async () => {
      await renderPaywall();

      expect(screen.getByText(paywallCopy.trial.cardTitle)).toBeTruthy();
      expect(screen.getByText(paywallCopy.trial.badge)).toBeTruthy();
      expect(screen.getByText('$49.99/year')).toBeTruthy();
      // 49.99 / 52 weeks.
      expect(screen.getByText(/\$0\.96/)).toBeTruthy();
    });

    it('speaks each plan with its price to assistive tech', async () => {
      await renderPaywall();
      expect(screen.getByLabelText('Yearly · 7-day trial, $49.99')).toBeTruthy();
    });
  });

  describe('the trial transparency beat (design 24)', () => {
    it('shows the exact days and amount before anything is bought', async () => {
      const onPurchase = jest.fn();
      await renderPaywall({ onPurchase });

      await fireEvent.press(screen.getByTestId('paywall-continue'));

      expect(onPurchase).not.toHaveBeenCalled();
      expect(screen.getByTestId('paywall-transparency')).toBeTruthy();
      expect(screen.getByText(paywallCopy.v5.transparency.day1Title)).toBeTruthy();
      expect(screen.getByText(/^Day 5 · /)).toBeTruthy();
      expect(screen.getByText(/^Day 7 · /)).toBeTruthy();
      expect(screen.getByText('$49.99 charged, unless you’ve cancelled.')).toBeTruthy();
    });

    it('buys the trial plan only from "Start my 7 days"', async () => {
      const onPurchase = jest.fn();
      await renderPaywall({ onPurchase });

      await fireEvent.press(screen.getByTestId('paywall-continue'));
      await fireEvent.press(screen.getByTestId('paywall-start-trial'));

      expect(onPurchase).toHaveBeenCalledWith(expect.objectContaining({ id: 'annual' }));
    });

    it('can go back to the plans', async () => {
      await renderPaywall();

      await fireEvent.press(screen.getByTestId('paywall-continue'));
      await fireEvent.press(screen.getByTestId('paywall-transparency-back'));

      expect(screen.queryByTestId('paywall-transparency')).toBeNull();
      expect(screen.getByTestId('paywall-continue')).toBeTruthy();
    });
  });

  describe('a plan without a trial', () => {
    it('buys directly on CTA without intermediate transparency', async () => {
      const onPurchase = jest.fn();
      await renderPaywall({ plans: noTrialPlans, onPurchase });

      expect(screen.getByText(paywallCopy.trial.ctaMain)).toBeTruthy();
      await fireEvent.press(screen.getByTestId('paywall-continue'));

      expect(screen.queryByTestId('paywall-transparency')).toBeNull();
      expect(onPurchase).toHaveBeenCalledWith(expect.objectContaining({ id: 'annual' }));
    });
  });

  describe('the reassurance is prominent', () => {
    it('shows no commitment reassurance above the CTA', async () => {
      await renderPaywall();
      expect(screen.getByText(paywallCopy.trial.noCommitment)).toBeTruthy();
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
      expect(screen.queryByText(/was \$|save \d+%|\d+% off|half/i)).toBeNull();
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
  });

  describe('the delayed dismiss control', () => {
    it('reveals the ✕ only after the offer has been readable', async () => {
      jest.useFakeTimers();
      const onDismiss = jest.fn();
      await renderPaywall({ onDismiss });

      expect(screen.queryByTestId('paywall-dismiss')).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(DISMISS_DELAY_MS);
      });

      await fireEvent.press(screen.getByTestId('paywall-dismiss'));
      expect(onDismiss).toHaveBeenCalled();
      expect(analytics.capture).toHaveBeenCalledWith('paywall_dismissed');
    });

    it('shows no ✕ at all when there is nowhere to dismiss to', async () => {
      jest.useFakeTimers();
      await render(
        <ThemeProvider>
          <LetterMotionProvider>
            <PaywallScreen plans={trialPlans} onPurchase={jest.fn()} onRestore={jest.fn()} />
          </LetterMotionProvider>
        </ThemeProvider>,
      );

      await act(async () => {
        jest.advanceTimersByTime(DISMISS_DELAY_MS);
      });

      expect(screen.queryByTestId('paywall-dismiss')).toBeNull();
    });
  });
});
