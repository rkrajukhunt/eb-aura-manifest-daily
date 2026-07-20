import { fireEvent, render, screen } from '@testing-library/react-native';

import { paywallCopy } from '@/copy/paywall';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MotionProvider } from '@/theme/motion';

import { SubscriptionScreen } from './SubscriptionScreen';

/**
 * Settings → Subscription, against checklist #5 and #6.
 *
 * The retention-maze test is the important one: there is no confirm step, no
 * "here's what you'll lose", no counter-offer between her and Apple's manage
 * sheet. Every one of those is a normal thing to add for retention and every one
 * is banned by product 15.
 */
describe('SubscriptionScreen', () => {
  const renderScreen = (props: Partial<React.ComponentProps<typeof SubscriptionScreen>> = {}) =>
    render(
      <ThemeProvider>
        <MotionProvider>
          <SubscriptionScreen
            premium
            inTrial={false}
            renewalDate="20 July 2027"
            willRenew
            onManage={jest.fn()}
            onRestore={jest.fn()}
            onSeePlans={jest.fn()}
            {...props}
          />
        </MotionProvider>
      </ThemeProvider>,
    );

  describe('status', () => {
    it('says plainly that she has premium', async () => {
      await renderScreen();

      expect(screen.getByText(paywallCopy.subscription.premium)).toBeTruthy();
    });

    it('names a trial as a trial', async () => {
      await renderScreen({ inTrial: true });

      expect(screen.getByText(paywallCopy.subscription.trial)).toBeTruthy();
    });

    it('says she is on the free plan without dressing it up', async () => {
      await renderScreen({ premium: false, renewalDate: null });

      expect(screen.getByText(paywallCopy.subscription.free)).toBeTruthy();
    });

    it('shows the renewal date when it will renew', async () => {
      await renderScreen({ willRenew: true });

      expect(screen.getByText(/Renews 20 July 2027/)).toBeTruthy();
    });

    it('shows an end date when it will not renew — cancelled but still hers', async () => {
      await renderScreen({ willRenew: false });

      expect(screen.getByText(/Ends 20 July 2027/)).toBeTruthy();
    });
  });

  describe('checklist #5 — cancel in two taps, no maze', () => {
    it('offers manage/cancel directly', async () => {
      const onManage = jest.fn();
      await renderScreen({ onManage });

      await fireEvent.press(screen.getByTestId('subscription-manage'));

      expect(onManage).toHaveBeenCalledTimes(1);
    });

    it('puts nothing between her and the manage sheet', async () => {
      const onManage = jest.fn();
      await renderScreen({ onManage });

      await fireEvent.press(screen.getByTestId('subscription-manage'));

      // No confirm dialog, no "are you sure", no second screen.
      expect(screen.queryByText(/are you sure|before you go|wait/i)).toBeNull();
      expect(onManage).toHaveBeenCalled();
    });

    it('makes no retention offer at the moment of cancelling', async () => {
      await renderScreen();

      expect(screen.queryByText(/discount|% off|special|stay with us|one more/i)).toBeNull();
    });
  });

  describe('checklist #6 — lapsing costs her nothing she has already been given', () => {
    it('says her letter and memory stay hers, right where she will read it', async () => {
      await renderScreen();

      expect(screen.getByText(paywallCopy.subscription.lapsedKeepsData)).toBeTruthy();
    });

    it('says it on the free plan too', async () => {
      await renderScreen({ premium: false, renewalDate: null });

      expect(screen.getByText(paywallCopy.subscription.lapsedKeepsData)).toBeTruthy();
    });
  });

  describe('billing trouble', () => {
    it('shows one quiet line and no more (12 §3)', async () => {
      await renderScreen({ billingIssue: true });

      expect(screen.getByTestId('subscription-billing-issue')).toBeTruthy();
    });

    it('stays silent when there is no problem', async () => {
      await renderScreen({ billingIssue: false });

      expect(screen.queryByTestId('subscription-billing-issue')).toBeNull();
    });

    it('does not nag or threaten', async () => {
      await renderScreen({ billingIssue: true });

      expect(screen.queryByText(/urgent|immediately|suspended|act now/i)).toBeNull();
    });
  });

  describe('restore', () => {
    it('is always available, so nobody pays twice', async () => {
      const onRestore = jest.fn();
      await renderScreen({ premium: false, renewalDate: null, onRestore });

      await fireEvent.press(screen.getByTestId('subscription-restore'));

      expect(onRestore).toHaveBeenCalled();
    });
  });

  describe('a free user', () => {
    it('is offered the plans rather than a manage button', async () => {
      await renderScreen({ premium: false, renewalDate: null });

      expect(screen.getByTestId('subscription-see-plans')).toBeTruthy();
      expect(screen.queryByTestId('subscription-manage')).toBeNull();
    });
  });
});
