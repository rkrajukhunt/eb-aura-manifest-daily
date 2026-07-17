import { palette } from './palette';

/**
 * Semantic tokens (05 §4). Feature code uses THESE names — never a raw colour.
 *
 * Semantic naming is what makes dark mode a day-one property instead of a Phase
 * 12 retrofit: `text.primary` is meaningful in both worlds, `#2A2540` is not.
 */

export type ColorScheme = 'light' | 'dark';

export interface ColorTokens {
  bg: { base: string; gradientTop: string; gradientMid: string; gradientBottom: string };
  surface: { card: string; cardGlassy: string; border: string; sheet: string; scrim: string };
  text: { primary: string; secondary: string; label: string; onCta: string; destructive: string };
  cta: { background: string; pressed: string; disabled: string };
  accent: { lavender: string; sky: string; sage: string; blush: string };
  orb: { core: string; halo: string; shimmer: string };
}

const light: ColorTokens = {
  bg: {
    base: palette.warmWhite,
    // Vertical, warm-white → lavender → dusk (product 12 §gradients).
    gradientTop: palette.warmWhite,
    gradientMid: '#EFE9F5',
    gradientBottom: '#DCD3EC',
  },
  surface: {
    card: palette.sand,
    cardGlassy: 'rgba(251, 249, 246, 0.72)',
    border: 'rgba(42, 37, 64, 0.08)',
    sheet: palette.warmWhite,
    scrim: 'rgba(0, 0, 0, 0.4)',
  },
  text: {
    primary: palette.ink,
    secondary: palette.inkSoft,
    label: palette.inkSoft,
    onCta: palette.white,
    destructive: palette.quietRed,
  },
  cta: {
    background: palette.periwinkle,
    pressed: '#5B53A1',
    disabled: 'rgba(108, 99, 181, 0.35)',
  },
  accent: {
    lavender: palette.lavender,
    sky: palette.sky,
    sage: palette.sage,
    blush: palette.blush,
  },
  orb: { core: palette.lavender, halo: palette.sky, shimmer: palette.blush },
};

const dark: ColorTokens = {
  bg: {
    base: palette.darkBase,
    gradientTop: palette.darkBase,
    gradientMid: '#241F38',
    gradientBottom: palette.dusk,
  },
  surface: {
    // Lavender-tinted surfaces, not grey (product 12 §dark mode).
    card: palette.dusk,
    cardGlassy: 'rgba(42, 37, 64, 0.72)',
    border: 'rgba(181, 169, 214, 0.14)',
    sheet: palette.dusk,
    scrim: 'rgba(0, 0, 0, 0.4)',
  },
  text: {
    // Soft lavender rather than pure white: warm, never harsh.
    primary: '#EDE7F5',
    secondary: '#B9B2CC',
    label: '#B9B2CC',
    onCta: palette.white,
    destructive: '#D08A8F',
  },
  cta: {
    // Lifted slightly so periwinkle keeps contrast against the plum base.
    background: '#8279D4',
    pressed: '#6C63B5',
    disabled: 'rgba(130, 121, 212, 0.35)',
  },
  accent: {
    lavender: palette.lavender,
    sky: palette.sky,
    sage: palette.sage,
    blush: palette.blush,
  },
  orb: { core: palette.lavender, halo: palette.sky, shimmer: palette.blush },
};

export const colorSchemes: Record<ColorScheme, ColorTokens> = { light, dark };

/**
 * 8pt grid (product 12 §spacing). Generous by default — whitespace is the
 * premium signal; when in doubt add space and cut an element.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  /** Standard screen margin. */
  lg: 24,
  /** Section gap. */
  xl: 32,
  xxl: 40,
} as const;

export const radii = {
  chip: 14,
  card: 22,
  /** 52pt-tall pill button. */
  pill: 26,
  sheet: 28,
} as const;

export const layout = {
  screenMargin: spacing.lg,
  cardPadding: spacing.lg,
  sectionGap: spacing.xl,
  buttonHeight: 52,
} as const;

/** Durations (product 13). Breath, not bounce: ease-in-out, 300–500ms. */
export const durations = {
  chipSelect: 150,
  fadeRise: 300,
  push: 350,
  crossfade: 400,
  reveal: 400,
  /** Nothing exceeds this (13 §performance budget). */
  max: 500,
} as const;
