import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Label, Orb, PillButton, Screen, SerifDisplay } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { loadPlans } from '@/features/paywall/purchases';
import { analytics } from '@/lib/analytics';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';

import { useConversation } from '../useConversation';

/**
 * S1 (product 07): tone + consent. Price honesty on the FIRST screen — the
 * anti-bait position is the brand (product 01 §radical pricing honesty), which
 * is why the line sits directly under the title, not in fine print.
 *
 * The price itself comes from the RevenueCat offering, which is LOCALIZED. A
 * hardcoded "$39.99" would be wrong in every other storefront, and being wrong
 * about price on the screen whose whole job is price honesty would be worse than
 * saying nothing — hence the honest fallback while the offering loads.
 *
 * "Restore purchase" is still absent rather than inert: it belongs on the
 * paywall footer and in Settings, where a returning user actually looks.
 */
export function S01Welcome() {
  const { spacing } = useTheme();
  const { advance } = useConversation('s01-welcome');
  const start = useOnboardingDraft((s) => s.start);
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    void loadPlans().then((plans) => {
      const annual = plans.find((plan) => plan.id === 'annual');
      if (annual) setPrice(annual.price);
    });
  }, []);

  const priceLine = price
    ? onboardingCopy.s01Welcome.priceHonesty.replace('{price}', `${price}/year`)
    : onboardingCopy.s01Welcome.priceUnknown;

  return (
    <Screen testID="s01-welcome">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
        <Orb state="idle" />
        <SerifDisplay variant="title">{onboardingCopy.s01Welcome.title}</SerifDisplay>
        <Label>{priceLine}</Label>
      </View>

      <View style={{ paddingBottom: spacing.lg }}>
        <PillButton
          title={onboardingCopy.s01Welcome.primary}
          onPress={() => {
            // The funnel clock starts at consent, not at install (product 17).
            // `onboarding_started` fires exactly once — startedAt is the guard,
            // so a resume that lands back on S1 cannot double-count the funnel.
            if (useOnboardingDraft.getState().startedAt === null) {
              analytics.capture('onboarding_started');
            }
            start();
            advance();
          }}
        />
      </View>
    </Screen>
  );
}
