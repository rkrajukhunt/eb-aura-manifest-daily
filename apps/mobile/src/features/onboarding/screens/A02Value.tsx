import { Text, View } from 'react-native';

import { Orb, PillButton, Screen, SerifDisplay } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { useConversation } from '../useConversation';

/** The orb size — increased to a hero mark for prominent visual elegance. */
const MARK_SIZE = 130;

/**
 * 02 — what makes this different. The contract, stated before the first ask:
 * a serif claim closing on an ember mark, and the promise in italic under it.
 * Carries no answer; Continue goes straight to the first question.
 */
export function A02Value() {
  const { colors, spacing } = useTheme();
  const { advance } = useConversation('a02-value');
  const c = onboardingCopy.a02Value;

  return (
    <Screen testID="a02-value">
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xl,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Orb state="idle" size={MARK_SIZE} />

        <View style={{ gap: spacing.md, alignItems: 'center' }}>
          <SerifDisplay variant="display" center>
            {c.title}
          </SerifDisplay>
          <Text
            style={{
              fontFamily: fonts.serifItalic,
              fontStyle: 'italic',
              fontSize: 24,
              lineHeight: 34,
              letterSpacing: -0.1,
              textAlign: 'center',
              color: colors.text.body,
              paddingHorizontal: spacing.sm,
            }}
          >
            {c.body}
          </Text>
        </View>
      </View>

      <View style={{ paddingBottom: spacing.lg }}>
        <PillButton title={c.primary} onPress={advance} />
      </View>
    </Screen>
  );
}
