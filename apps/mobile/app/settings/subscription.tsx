import { PREMIUM_ENTITLEMENT_ID } from '@aura/shared';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { Screen } from '@/components';
import { SubscriptionScreen } from '@/features/paywall/SubscriptionScreen';
import { openManageSubscriptions, restorePurchases } from '@/features/paywall/purchases';
import { useEntitlement } from '@/features/paywall/useEntitlement';

/**
 * `settings/subscription` — one tap from Settings, and Manage is one tap from
 * here. That is checklist #5's "cancel in 2 taps", counted honestly.
 */
export default function SubscriptionRoute() {
  const router = useRouter();
  const { premium, inTrial, info } = useEntitlement();

  const entitlement = info?.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  const renewalDate = entitlement?.expirationDate
    ? new Date(entitlement.expirationDate).toLocaleDateString()
    : null;

  const onRestore = useCallback(() => void restorePurchases(), []);

  return (
    <Screen testID="settings-subscription">
      <SubscriptionScreen
        premium={premium}
        inTrial={inTrial}
        renewalDate={renewalDate}
        willRenew={Boolean(entitlement?.willRenew)}
        billingIssue={entitlement?.billingIssueDetectedAt != null}
        onManage={() => void openManageSubscriptions()}
        onRestore={onRestore}
        onSeePlans={() => router.push('/paywall')}
      />
    </Screen>
  );
}
