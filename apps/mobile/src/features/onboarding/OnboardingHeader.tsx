import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { SegmentedProgressBar } from '@/components/SegmentedProgressBar';
import { onboardingCopy } from '@/copy/onboarding';
import { chipSelectScale, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

/**
 * Design v5: a 44pt frosted-glass back button, segmented capsule track, an
 * optional Skip.
 */
const BACK_SIZE = 44;

/** Custom chevron geometry — rounded 2.6pt arms at 45°, drawn, not font-cast. */
const CHEVRON_ARM_W = 12;
const CHEVRON_ARM_H = 2.6;
const CHEVRON_LEFT = 5;
const CHEVRON_TOP_UPPER = 4.46;
const CHEVRON_TOP_LOWER = 12.94;
const CHEVRON_BOX = 20;

/**
 * A bespoke back chevron: two rounded bars meeting at a left vertex. Font
 * chevrons (‹, Ionicons) render thin and off-centre at small sizes across
 * platforms; a drawn mark stays identical everywhere and reads premium.
 */
function BackChevron({ color }: { color: string }) {
  const arm = {
    position: 'absolute' as const,
    left: CHEVRON_LEFT,
    width: CHEVRON_ARM_W,
    height: CHEVRON_ARM_H,
    borderRadius: CHEVRON_ARM_H / 2,
    backgroundColor: color,
  };
  return (
    <View style={{ width: CHEVRON_BOX, height: CHEVRON_BOX }}>
      <View style={[arm, { top: CHEVRON_TOP_UPPER, transform: [{ rotate: '-45deg' }] }]} />
      <View style={[arm, { top: CHEVRON_TOP_LOWER, transform: [{ rotate: '45deg' }] }]} />
    </View>
  );
}
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
 * The conversation's wayfinding: a frosted-glass back circle with a bespoke
 * chevron, a 5-segment capsule-pill track filling with ember as the
 * conversation deepens, and "Skip" where the question allows it.
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
  const { colors, spacing } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
          onPressIn={() => {
            scale.value = chipSelectScale(true, motion);
          }}
          onPressOut={() => {
            scale.value = chipSelectScale(false, motion);
          }}
          style={({ pressed }) => ({
            width: BACK_SIZE,
            height: BACK_SIZE,
            borderRadius: BACK_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface.cardGlassy,
            borderWidth: 1,
            borderColor: colors.surface.border,
            opacity: pressed ? 0.85 : 1,
            shadowColor: colors.text.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 16,
            shadowOpacity: 0.08,
            elevation: 3,
          })}
        >
          <Animated.View style={animatedStyle}>
            <BackChevron color={colors.text.primary} />
          </Animated.View>
          {/* Liquid-glass specular catchlight — the top-edge gleam. */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 7,
              width: 20,
              height: 1.5,
              borderRadius: 1,
              backgroundColor: colors.surface.card,
              opacity: 0.7,
            }}
          />
        </Pressable>
      ) : (
        <View style={{ width: BACK_SIZE, height: BACK_SIZE }} />
      )}

      <SegmentedProgressBar
        progress={progress}
        segments={segments}
        fillMode={fillMode}
        height={SEGMENT_HEIGHT}
        gap={SEGMENT_GAP}
        label={onboardingCopy.header.progress}
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
