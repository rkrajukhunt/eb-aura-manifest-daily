import { Pressable, Text, View } from 'react-native';

import { SegmentedProgressBar } from '@/components/SegmentedProgressBar';
import { onboardingCopy } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

/** Design v5: a 34pt circular back button, segmented capsule track, an optional Skip. */
const BACK_SIZE = 34;
const SEGMENT_HEIGHT = 6;
const SEGMENT_GAP = 6;

export interface OnboardingHeaderProps {
  /** 0..1 — how far along the conversation she is. */
  progress: number;
  /** The back circle. Omit to reserve its slot without drawing it. */
  onBack?: (() => void) | undefined;
  /** What the circle does, for screen readers ("Fix an earlier answer"). */
  backLabel?: string | undefined;
  /** Header Skip — only the design's skippable questions pass it. */
  onSkip?: (() => void) | undefined;
  /** Number of pill segments. Defaults to 5. */
  segments?: number | undefined;
  /** Fill mode: 'smooth' | 'discrete'. Defaults to 'smooth'. */
  fillMode?: ('smooth' | 'discrete') | undefined;
  testID?: string | undefined;
}

/**
 * The conversation's wayfinding: a white back circle on a hairline,
 * a 5-segment capsule-pill track filling with ember as the conversation deepens,
 * and "Skip" where the question allows it.
 */
export function OnboardingHeader({
  progress,
  onBack,
  backLabel,
  onSkip,
  segments = 5,
  fillMode = 'smooth',
  testID,
}: OnboardingHeaderProps) {
  const { colors, shadows, spacing } = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View
      {...(testID ? { testID } : {})}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md + 2,
        paddingVertical: spacing.md,
      }}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel ?? onboardingCopy.header.back}
          hitSlop={spacing.sm}
          onPress={onBack}
          style={({ pressed }) => ({
            width: BACK_SIZE,
            height: BACK_SIZE,
            borderRadius: BACK_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface.card,
            borderWidth: 1,
            borderColor: colors.surface.border,
            opacity: pressed ? 0.85 : 1,
            ...shadows.card,
          })}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 18,
              lineHeight: 22,
              color: colors.text.primary,
              // Optical centring of the glyph inside the circle.
              marginLeft: -2,
            }}
          >
            ‹
          </Text>
        </Pressable>
      ) : (
        <View style={{ width: BACK_SIZE, height: BACK_SIZE }} />
      )}

      <SegmentedProgressBar
        progress={clamped}
        segments={segments}
        fillMode={fillMode}
        height={SEGMENT_HEIGHT}
        gap={SEGMENT_GAP}
        activeColor={colors.accent.emberDeep}
        inactiveColor={colors.surface.border}
        {...(testID ? { testID: `${testID}-track` } : {})}
        style={{ flex: 1 }}
      />

      {onSkip ? (
        <Pressable accessibilityRole="button" hitSlop={spacing.sm} onPress={onSkip}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13.5, color: colors.text.secondary }}>
            {onboardingCopy.header.skip}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
