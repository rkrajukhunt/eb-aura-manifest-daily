import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { IconTile } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

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
 * The three-beat trial timeline (2026-08-10, ref. onboarding paywall): Today →
 * a reminder → the day billing starts. It is the honest core of the offer, so
 * every beat is a fact the user can hold us to: full access now, a reminder
 * before the end, and the exact day a charge could happen.
 *
 * Rendered in Aura's own world rather than the reference's neon: the ember orb
 * gradient (the voice's colour) marks each beat, joined by a soft ember spine —
 * warmth continued from the Letter, not a new app arriving to sell.
 *
 * The `remind` beat lands two days before the end (never below day one), and all
 * day counts come from the caller's real `trialDays`, so the copy cannot promise
 * a longer trial than the store gives.
 */
export function TrialTimeline({ trialDays, testID }: TrialTimelineProps) {
  const { colors, layout, spacing } = useTheme();
  const scale = clampedFontScale();

  const remindDay = Math.max(1, trialDays - 2);
  const t = paywallCopy.trial;

  const steps: Step[] = [
    { icon: 'lock-open-outline', title: t.todayTitle, body: t.today },
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
      {/* The spine, behind the tiles: from the first tile's centre to the last.
          The tiles are opaque, so it reads as a line linking them through the
          gaps rather than crossing them. */}
      <LinearGradient
        colors={[colors.accent.emberSoft, colors.accent.ember]}
        style={{
          position: 'absolute',
          left: layout.iconTileSize / 2 - 1,
          top: layout.iconTileSize / 2,
          bottom: layout.iconTileSize / 2,
          width: 2,
        }}
      />

      <View style={{ gap: spacing.lg }}>
        {steps.map((step) => (
          <View key={step.title} style={{ flexDirection: 'row', gap: spacing.md }}>
            <IconTile tint="orb" icon={step.icon} />
            <View style={{ flex: 1, gap: spacing.xs / 2, paddingTop: spacing.xs / 2 }}>
              <Text
                allowFontScaling={false}
                style={[scaledType('listTitle', scale), { color: colors.text.primary }]}
              >
                {step.title}
              </Text>
              <Text
                allowFontScaling={false}
                style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
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
