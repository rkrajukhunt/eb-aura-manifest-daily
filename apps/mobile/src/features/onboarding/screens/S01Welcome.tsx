import { View } from 'react-native';

import { Label, Orb, PillButton, Screen, SerifDisplay } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';

import { useConversation } from '../useConversation';

/**
 * S1 (product 07): tone + consent. Price honesty on the FIRST screen — the
 * anti-bait position is the brand (product 01 §radical pricing honesty), which
 * is why the line sits directly under the title, not in fine print.
 *
 * "Restore purchase" (returning-user path) lands with RevenueCat in Phase 10 —
 * a dead button today would be dishonest, so it is absent rather than inert.
 */
export function S01Welcome() {
  const { spacing } = useTheme();
  const { advance } = useConversation('s01-welcome');
  const start = useOnboardingDraft((s) => s.start);

  return (
    <Screen testID="s01-welcome">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
        <Orb state="idle" />
        <SerifDisplay variant="title">{onboardingCopy.s01Welcome.title}</SerifDisplay>
        <Label>{onboardingCopy.s01Welcome.priceHonesty}</Label>
      </View>

      <View style={{ paddingBottom: spacing.lg }}>
        <PillButton
          title={onboardingCopy.s01Welcome.primary}
          onPress={() => {
            // The funnel clock starts at consent, not at install (product 17).
            start();
            advance();
          }}
        />
      </View>
    </Screen>
  );
}
