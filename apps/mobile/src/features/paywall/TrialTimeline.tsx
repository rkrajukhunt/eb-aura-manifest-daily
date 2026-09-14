import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { paywallCopy } from '@/copy/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, fonts, scaledType } from '@/theme/typography';

export interface TrialTimelineProps {
  /** The real trial length in days, from the store's intro offer. */
  trialDays: number;
  testID?: string;
}

interface Step {
  icon: 'lock-open-outline' | 'notifications-outline' | 'sparkles-outline';
  title: string;
  body: string;
}

/**
 * The three-beat trial timeline: Today → a reminder → the day billing starts.
 * Sizing, placement, and spine gradient match the trial-reminder design reference,
 * rendered in Aura's own tokenized theme palette.
 */
const DOT = 40;

export function TrialTimeline({ trialDays, testID }: TrialTimelineProps) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const remindDay = Math.max(1, trialDays - 2);
  const t = paywallCopy.trial;

  const steps: Step[] = [
    {
      icon: 'lock-open-outline',
      title: t.todayTitle,
      body: t.today.includes('{days}') ? t.today.replace('{days}', String(trialDays)) : t.today,
    },
    {
      icon: 'notifications-outline',
      title: t.remindTitle.replace('{remind}', String(remindDay)),
      body: t.remind,
    },
    {
      icon: 'sparkles-outline',
      title: t.billTitle.replace('{days}', String(trialDays)),
      body: t.bill,
    },
  ];

  return (
    <View testID={testID} style={{ position: 'relative' }}>
      {/* The spine, behind the dots: from the first dot's centre through to the last,
          fading softly down past the bottom dot matching the reference design. */}
      <LinearGradient
        colors={[colors.accent.ember, colors.accent.ember, colors.accent.emberSoft, 'transparent']}
        style={{
          position: 'absolute',
          left: DOT / 2 - 1.5,
          top: DOT / 2,
          bottom: -10,
          width: 3,
          borderRadius: 1.5,
        }}
      />

      <View style={{ gap: spacing.lg + 4 }}>
        {steps.map((step) => (
          <View
            key={step.title}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md + 2 }}
          >
            <View
              style={{
                width: DOT,
                height: DOT,
                borderRadius: DOT / 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.accent.ember,
              }}
            >
              <Ionicons name={step.icon} size={20} color={colors.text.onCta} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: fonts.sansBold,
                  fontSize: 17,
                  lineHeight: 22,
                  color: colors.text.primary,
                }}
              >
                {step.title}
              </Text>
              <Text
                allowFontScaling={false}
                style={[
                  scaledType('bodySmall', scale),
                  {
                    fontFamily: fonts.sans,
                    fontSize: 13.5,
                    lineHeight: 18,
                    color: colors.text.secondary,
                  },
                ]}
              >
                {step.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
