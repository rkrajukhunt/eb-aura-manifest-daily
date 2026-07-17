import { PixelRatio, type TextStyle } from 'react-native';

/**
 * Typography (product 12 §type). "Typography is the hero" — affirmations and
 * letters ARE the product, so type gets the budget.
 */

export const fonts = {
  /** Bundled via @expo-google-fonts/fraunces. Letters, titles, affirmations. */
  serif: 'Fraunces_400Regular',
  serifItalic: 'Fraunces_400Regular_Italic',
  serifSemiBold: 'Fraunces_600SemiBold',
  /** System SF Pro on iOS — humanist and already familiar. */
  sans: undefined as string | undefined,
} as const;

/**
 * Dynamic Type clamps.
 *
 * All text scales (product 12), but the serif surfaces clamp: a Letter line at
 * 3× would reflow to two words per screen and destroy the karaoke rhythm the
 * whole wow depends on (product 08). UI sans text is left to scale freely —
 * it has no such constraint, and clamping it would be an accessibility failure.
 */
export const FONT_SCALE_CLAMP = { min: 0.85, max: 1.4 } as const;

/** Above this, chips reflow to lists (05 §4, product 12). */
export const CHIP_REFLOW_FONT_SCALE = 1.3;

/** Clamped scale for serif display surfaces. `getFontScale` is injectable for tests. */
export function clampedFontScale(getFontScale: () => number = PixelRatio.getFontScale): number {
  const scale = getFontScale();
  return Math.min(FONT_SCALE_CLAMP.max, Math.max(FONT_SCALE_CLAMP.min, scale));
}

/** True when chips should render as a vertical list instead (Dynamic Type reflow). */
export function shouldReflowChips(getFontScale: () => number = PixelRatio.getFontScale): boolean {
  return getFontScale() > CHIP_REFLOW_FONT_SCALE;
}

type Variant =
  | 'letterLine'
  | 'affirmationHero'
  | 'momentTitle'
  | 'title'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'button';

/**
 * `allowFontScaling` is left ON everywhere (RN default). Serif variants apply
 * their own clamp at render time via `clampedFontScale`.
 */
export const typography: Record<Variant, TextStyle> = {
  /** 28–34pt, large and airy (product 12). */
  letterLine: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 42 },
  /** 26–30pt. */
  affirmationHero: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 38 },
  /** Italic serif — the signature for moment titles. */
  momentTitle: { fontFamily: fonts.serifItalic, fontStyle: 'italic', fontSize: 22, lineHeight: 30 },
  title: { fontFamily: fonts.serifSemiBold, fontSize: 24, lineHeight: 32 },

  body: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 25 },
  bodySmall: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },

  /**
   * The category's signature wayfinding: uppercase, letter-spaced, 11–12pt, 60%
   * opacity ("TODAY'S MOMENT"). Opacity is applied by the Label component so the
   * token stays a pure text style.
   */
  label: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  button: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 22, fontWeight: '600' },
};

/** 60% per product 12 §label style. */
export const LABEL_OPACITY = 0.6;
