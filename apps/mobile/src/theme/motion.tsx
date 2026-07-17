import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing, withTiming, type WithTimingConfig } from 'react-native-reanimated';

import { durations } from './tokens';

/**
 * Motion (product 13). Rule zero: every animation has a stated purpose, runs at
 * 60fps, and respects Reduce Motion.
 *
 * "Breath, not bounce" — ease-in-out, 300–500ms. Springs are reserved for sheets
 * and card presses. Nothing elastic, nothing cartoonish, nothing that draws the
 * eye for its own sake. The orb is the only performer.
 */

/** The standard curve. Symmetric ease-in-out reads as breathing. */
export const EASE = Easing.inOut(Easing.ease);

export interface MotionSettings {
  /** System Reduce Motion. When true, animations collapse to crossfades. */
  reduceMotion: boolean;
  /**
   * Time multiplier. The Letter world runs ~1.2× slower than the utility world
   * (product 13 §4: "slow down for emotion"); onboarding sits between.
   */
  scale: number;
}

const MotionContext = createContext<MotionSettings>({ reduceMotion: false, scale: 1 });

export function MotionProvider({ children, scale = 1 }: { children: ReactNode; scale?: number }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    });

    // She can toggle it while the app is open; a stale value means an animation
    // she explicitly asked not to see.
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const value = useMemo(() => ({ reduceMotion, scale }), [reduceMotion, scale]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion(): MotionSettings {
  return useContext(MotionContext);
}

/** Letter/milestone world — everything breathes 20% slower here (product 13 §4). */
export function LetterMotionProvider({ children }: { children: ReactNode }) {
  return <MotionProvider scale={1.2}>{children}</MotionProvider>;
}

const timing = (duration: number, motion: MotionSettings): WithTimingConfig => ({
  duration: Math.round(duration * motion.scale),
  easing: EASE,
});

/**
 * Letter lines, reflections: fade + 8px rise (product 13 §catalog).
 *
 * Under Reduce Motion the rise is dropped and only the fade remains — the line
 * still materializes with the spoken word, which is the UX purpose; it just
 * doesn't travel.
 */
export function fadeRise(motion: MotionSettings) {
  return {
    opacity: withTiming(1, timing(durations.fadeRise, motion)),
    translateY: motion.reduceMotion ? 0 : withTiming(0, timing(durations.fadeRise, motion)),
  };
}

/** Chip/card select: scale 0.97 + fill tint, 150ms — immediate acknowledgment. */
export function chipSelectScale(pressed: boolean, motion: MotionSettings) {
  if (motion.reduceMotion) return 1;
  return withTiming(pressed ? 0.97 : 1, timing(durations.chipSelect, motion));
}

/** Error recovery, letter→paywall: content crossfades. Never a shake or red flash. */
export function crossfade(motion: MotionSettings) {
  return withTiming(1, timing(durations.crossfade, motion));
}

/** Sheets are the one place a spring is right — it reads as "temporary task". */
export const sheetSpring = { damping: 20, stiffness: 180, mass: 0.9 } as const;

/** 8px, per the letter-line spec. */
export const FADE_RISE_DISTANCE = 8;
