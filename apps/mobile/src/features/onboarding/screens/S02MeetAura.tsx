import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Orb, PillButton, Screen } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

import { useConversation } from '../useConversation';

/** Between bubbles — conversation rhythm, not a wall of text (product 07 S2). */
const BUBBLE_INTERVAL_MS = 900;

/**
 * S2: meet the companion. The confidentiality line ("stays between us") is the
 * safe-space framing that unlocks honest answers on S4/S10 — it must land
 * before any question is asked.
 */
export function S02MeetAura() {
  const { colors, spacing, typography } = useTheme();
  const { reduceMotion } = useMotion();
  const { advance } = useConversation('s02-meet-aura');
  const [visibleLines, setVisibleLines] = useState(1);

  const lines = onboardingCopy.s02MeetAura.lines;
  const allShown = visibleLines >= lines.length;

  useEffect(() => {
    if (allShown) return;
    const timer = setTimeout(
      () => setVisibleLines((n) => n + 1),
      reduceMotion ? 300 : BUBBLE_INTERVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [allShown, visibleLines, reduceMotion]);

  return (
    <Screen testID="s02-meet-aura">
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
        <View style={{ alignItems: 'center' }}>
          <Orb state="listening" size={120} />
        </View>

        {lines.slice(0, visibleLines).map((line) => (
          <Animated.View
            key={line}
            entering={reduceMotion ? FadeInUp.duration(0) : FadeInUp.duration(300)}
          >
            <Text style={[typography.body, { color: colors.text.primary }]}>{line}</Text>
          </Animated.View>
        ))}
      </View>

      <View style={{ paddingBottom: spacing.lg }}>
        <PillButton
          title={onboardingCopy.s02MeetAura.primary}
          onPress={advance}
          disabled={!allShown}
        />
      </View>
    </Screen>
  );
}
