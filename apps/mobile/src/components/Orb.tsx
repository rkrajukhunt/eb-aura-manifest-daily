import { BlurMask, Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { View } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The Orb — Aura's body, and the app's only performer (product 12 §signature,
 * 05 §5). It appears in onboarding, the generation ritual, and the player.
 * Never bounces, never cartoons: every state is a variation of breathing.
 *
 * All motion lives in Reanimated shared values consumed directly by Skia, so
 * nothing here touches the JS thread per frame (05 §5: UI thread only — the
 * 60fps budget is release-blocking, product 13).
 *
 * States (05 §5):
 *   idle       4s breath, scale 1.0↔1.04
 *   listening  breath + gentle highlight shimmer
 *   generating 3s breath + inner glow — anticipation, not urgency
 *   speaking   glow follows the voice via the player's metering callback
 *
 * Reduce Motion: breath amplitude → 0 (a still, softly glowing sphere);
 * state changes read as crossfades because nothing else moves.
 */
export type OrbState = 'idle' | 'listening' | 'generating' | 'speaking';

export interface OrbProps {
  state: OrbState;
  /** Diameter in pt. The canvas adds margin for the halo. */
  size?: number;
  /**
   * 0..1 loudness from PlayerService's metering callback (10 §5). Only read in
   * the `speaking` state. A shared value, so audio drives the glow without a
   * single React render.
   */
  amplitude?: SharedValue<number>;
  testID?: string;
}

/** Breath cycle lengths (product 13 catalog): idle 4s; generating "slightly faster" 3s. */
const BREATH_MS: Record<OrbState, number> = {
  idle: 4000,
  listening: 4000,
  generating: 3000,
  speaking: 4000,
};

const BREATH_SCALE_MAX = 1.04;

/** The halo needs room to breathe outside the sphere itself. */
const CANVAS_OVERSCAN = 1.6;

export function Orb({ state, size = 160, amplitude, testID }: OrbProps) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotion();

  // 0..1 breath phase; scale and glow derive from it so they stay in step.
  const breath = useSharedValue(0);
  // 0..1 extra glow layered on top of breath (generating / speaking).
  const glow = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      // Still, softly lit. withTiming (not a snap) so turning the setting on
      // mid-animation eases out instead of jumping.
      breath.value = withTiming(0.5, { duration: 400 });
      glow.value = withTiming(state === 'generating' || state === 'speaking' ? 0.5 : 0.2, {
        duration: 400,
      });
      shimmer.value = withTiming(0, { duration: 400 });
      return;
    }

    breath.value = withRepeat(
      withTiming(1, { duration: BREATH_MS[state] / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    glow.value = withTiming(state === 'generating' ? 1 : state === 'speaking' ? 0.4 : 0.15, {
      duration: 600,
    });

    shimmer.value =
      state === 'listening'
        ? withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }), -1, true)
        : withTiming(0, { duration: 400 });

    return () => {
      // Repeating animations outlive unmount unless cancelled — and a leaked
      // infinite loop is exactly the kind of quiet CPU cost 05 §5 caps.
      cancelAnimation(breath);
      cancelAnimation(glow);
      cancelAnimation(shimmer);
    };
  }, [state, reduceMotion, breath, glow, shimmer]);

  const canvasSize = size * CANVAS_OVERSCAN;
  const center = canvasSize / 2;
  const baseRadius = size / 2;

  const radius = useDerivedValue(
    () => baseRadius * (1 + breath.value * (BREATH_SCALE_MAX - 1)),
    [baseRadius],
  );

  // Halo: soft light the sphere sits in. Speaking adds the voice on top of the
  // breath so the orb is always alive under the audio, never strobing with it.
  const haloRadius = useDerivedValue(() => {
    const speakingBoost = amplitude ? amplitude.value * 0.25 : 0;
    return baseRadius * (1.12 + 0.1 * glow.value + 0.06 * breath.value + speakingBoost);
  }, [baseRadius, amplitude]);

  const haloOpacity = useDerivedValue(() => {
    const speakingBoost = amplitude ? amplitude.value * 0.35 : 0;
    return Math.min(1, 0.25 + 0.45 * glow.value + speakingBoost);
  }, [amplitude]);

  // Inner light (generating): a smaller, brighter core rising with the breath.
  const coreOpacity = useDerivedValue(() => 0.15 + 0.5 * glow.value * (0.6 + 0.4 * breath.value));

  // Listening shimmer: an off-centre highlight drifting across the surface.
  const shimmerOpacity = useDerivedValue(() => shimmer.value * 0.35);
  const shimmerX = useDerivedValue(
    () => center + baseRadius * 0.35 * (shimmer.value - 0.5),
    [center, baseRadius],
  );

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      // The orb is presence, not information — VoiceOver users get the screen's
      // in-voice copy instead of a mysterious unlabeled image.
      style={{ width: canvasSize, height: canvasSize }}
    >
      <Canvas style={{ width: canvasSize, height: canvasSize }}>
        {/* Halo */}
        <Circle cx={center} cy={center} r={haloRadius} opacity={haloOpacity}>
          <RadialGradient
            c={vec(center, center)}
            r={haloRadius}
            colors={[colors.orb.halo, 'transparent']}
          />
          <BlurMask blur={18} style="normal" />
        </Circle>

        {/* Body */}
        <Circle cx={center} cy={center} r={radius}>
          <RadialGradient
            // Light source sits high-left — a sphere, not a flat disc.
            c={vec(center - baseRadius * 0.25, center - baseRadius * 0.3)}
            r={baseRadius * 1.5}
            colors={[colors.bg.base, colors.orb.core, colors.orb.halo]}
          />
        </Circle>

        {/* Inner light — generating */}
        <Circle cx={center} cy={center} r={baseRadius * 0.55} opacity={coreOpacity}>
          <RadialGradient
            c={vec(center, center)}
            r={baseRadius * 0.55}
            colors={[colors.orb.shimmer, 'transparent']}
          />
          <BlurMask blur={12} style="normal" />
        </Circle>

        {/* Shimmer — listening */}
        <Circle cx={shimmerX} cy={center} r={baseRadius * 0.4} opacity={shimmerOpacity}>
          <RadialGradient
            c={vec(center, center - baseRadius * 0.2)}
            r={baseRadius * 0.6}
            colors={[colors.bg.base, 'transparent']}
          />
          <BlurMask blur={10} style="normal" />
        </Circle>
      </Canvas>
    </View>
  );
}
