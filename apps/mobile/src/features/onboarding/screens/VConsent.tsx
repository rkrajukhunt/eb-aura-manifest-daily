import { Text, View } from 'react-native';

import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/** A dot per point: olive for the flow, ember for what stays home, muted for the off switch. */
const DOT = 6;

/**
 * AI consent — explicit and unbundled, before anything is generated (Apple
 * 5.1.2(i)). Records `model` or `library`; either way the flow continues.
 */
export function VConsent() {
  const { colors, radii, shadows, spacing, typography } = useTheme();
  const { submit } = useConversation('v-consent');
  const c = onboardingCopy.vConsent;
  const dots = [colors.accent.olive, colors.accent.emberDeep, colors.text.label];

  return (
    <ConversationScreen
      testID="v-consent"
      screenId="v-consent"
      center
      question={c.question}
      helper={c.helper}
      primaryTitle={c.primary}
      onPrimary={() => void submit('model')}
      secondaryTitle={c.secondary}
      onSecondary={() => void submit('library')}
      secondaryVariant="outline"
    >
      <View
        style={{
          borderRadius: radii.group,
          borderWidth: 1,
          borderColor: colors.surface.border,
          backgroundColor: colors.surface.card,
          overflow: 'hidden',
          ...shadows.card,
        }}
      >
        {c.points.map((point, i) => (
          <View
            key={point}
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              paddingVertical: spacing.md + 4,
              paddingHorizontal: spacing.md + 6,
              borderBottomWidth: i < c.points.length - 1 ? 1 : 0,
              borderBottomColor: colors.surface.divider,
            }}
          >
            <View
              style={{
                width: DOT,
                height: DOT,
                borderRadius: DOT / 2,
                backgroundColor: dots[i],
                marginTop: 8,
              }}
            />
            <Text style={[typography.body, { flex: 1, color: colors.text.primary }]}>{point}</Text>
          </View>
        ))}
      </View>
    </ConversationScreen>
  );
}
