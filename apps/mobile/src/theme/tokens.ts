import { palette } from './palette';

/**
 * Semantic tokens (05 §4) — Aura Design v3 "Ember & Bone". Feature code uses
 * THESE names — never a raw colour.
 *
 * Semantic naming is what makes dark mode a day-one property instead of a Phase
 * 12 retrofit: `text.primary` is meaningful in both worlds, `#1B1810` is not.
 */

export type ColorScheme = 'light' | 'dark';

export interface ColorTokens {
  bg: { base: string; gradientTop: string; gradientMid: string; gradientBottom: string };
  surface: {
    card: string;
    cardGlassy: string;
    border: string;
    /** Separator between rows inside a grouped card — lighter than `border`. */
    divider: string;
    sheet: string;
    scrim: string;
  };
  text: {
    primary: string;
    /** Long-form paragraphs — one step softer than primary. */
    body: string;
    secondary: string;
    label: string;
    disabled: string;
    onCta: string;
    destructive: string;
  };
  cta: { background: string; pressed: string; disabled: string; link: string };
  accent: {
    /** Voice & audio ONLY — ember is earned, never decoration. */
    ember: string;
    emberSoft: string;
    /** Links, progress, the voice serif. */
    emberDeep: string;
    /** Inactive waveform bars. */
    emberFaint: string;
    /** Active-tab capsule fill in the bottom bar. */
    tabCapsule: string;
    /** Selected chips, "today" marks. */
    olive: string;
    /** Hairline borders, resting chips. */
    oliveSoft: string;
    /** Dashed future outlines, empty checkmarks. */
    oliveFaint: string;
    /** Hairline on the player's skip pills (v4 §player). */
    oliveLine: string;
    /** Marked days, gratitude fills. */
    blush: string;
    /** Gentle banners. */
    blushSoft: string;
    blushDeep: string;
    /** Favourite hearts. */
    heart: string;
    /** Affirmation surfaces. */
    parchment: string;
  };
  orb: {
    /**
     * The sphere's lit face — the gradient's innermost stop.
     *
     * NOT `bg.base`: in dark v4 lights the orb off the CARD colour (#242019),
     * not off the near-black page, so the sphere still reads as lit rather
     * than as a hole cut in the background.
     */
    base: string;
    core: string;
    halo: string;
    shimmer: string;
  };
}

const light: ColorTokens = {
  bg: {
    base: palette.bone,
    // V3 screens sit on bone; the gradient only whispers — bone settling into
    // a slightly deeper bone at the foot of the screen.
    gradientTop: palette.bone,
    gradientMid: palette.bone,
    gradientBottom: palette.boneDeep,
  },
  surface: {
    card: palette.white,
    cardGlassy: 'rgba(255, 255, 255, 0.72)',
    border: palette.oliveSoft,
    divider: palette.divider,
    sheet: palette.white,
    scrim: 'rgba(27, 24, 16, 0.4)',
  },
  text: {
    primary: palette.ink,
    body: palette.inkBody,
    secondary: palette.inkMuted,
    label: palette.olive,
    disabled: palette.oliveDisabledText,
    onCta: palette.cream,
    destructive: palette.rust,
  },
  cta: {
    // Actions are ink-black pills (v3 rule). Press: opacity .85, scale .98.
    background: palette.ink,
    pressed: 'rgba(27, 24, 16, 0.85)',
    disabled: palette.oliveDisabledFill,
    link: palette.emberDeep,
  },
  accent: {
    ember: palette.ember,
    emberSoft: palette.emberSoft,
    emberDeep: palette.emberDeep,
    emberFaint: palette.emberFaint,
    tabCapsule: palette.emberFaint,
    olive: palette.olive,
    oliveSoft: palette.oliveSoft,
    oliveFaint: palette.oliveFaint,
    oliveLine: palette.oliveLine,
    blush: palette.blush,
    blushSoft: palette.blushSoft,
    blushDeep: palette.blushDeep,
    heart: palette.heart,
    parchment: palette.parchment,
  },
  // The orb is the one place the full ember range lives: blush highlight,
  // soft-ember body, ember edge (v3 orb gradient).
  orb: {
    base: palette.bone,
    core: palette.emberSoft,
    halo: palette.ember,
    shimmer: palette.blush,
  },
};

/**
 * V3 defines light only; dark is the same warm world after sundown — ink-brown
 * bases (never grey, never black), cream pills for action, ember untouched.
 */
const dark: ColorTokens = {
  bg: {
    base: '#171410',
    gradientTop: '#171410',
    gradientMid: '#1B1810',
    gradientBottom: '#211D15',
  },
  surface: {
    card: '#242019',
    cardGlassy: 'rgba(36, 32, 25, 0.72)',
    border: 'rgba(245, 242, 232, 0.14)',
    divider: 'rgba(245, 242, 232, 0.09)',
    sheet: '#242019',
    scrim: 'rgba(0, 0, 0, 0.5)',
  },
  text: {
    primary: palette.cream,
    body: '#DDD8C6',
    secondary: palette.oliveDisabledText,
    label: palette.olive,
    disabled: palette.inkMuted,
    onCta: palette.ink,
    destructive: '#D97E58',
  },
  cta: {
    // The ink pill inverts to cream so action keeps its contrast at night.
    background: palette.cream,
    pressed: 'rgba(245, 242, 232, 0.85)',
    disabled: 'rgba(245, 242, 232, 0.16)',
    link: palette.emberSoft,
  },
  accent: {
    ember: palette.ember,
    emberSoft: palette.emberSoft,
    emberDeep: palette.emberDeep,
    emberFaint: '#4E3A2C',
    tabCapsule: '#4E3A2C',
    olive: palette.olive,
    oliveSoft: '#3A362B',
    oliveFaint: '#57523F',
    oliveLine: '#5F5A46',
    blush: palette.blush,
    blushSoft: '#3B2C33',
    blushDeep: palette.blushDeep,
    heart: palette.heart,
    parchment: '#2E2818',
  },
  orb: {
    // The card colour, per v4's dark Home and dark Letter.
    base: '#242019',
    core: palette.emberSoft,
    halo: palette.ember,
    shimmer: palette.blush,
  },
};

export const colorSchemes: Record<ColorScheme, ColorTokens> = { light, dark };

/**
 * 4pt grid (v3 foundations). Generous by default — whitespace is the premium
 * signal; when in doubt add space and cut an element.
 */
export const spacing = {
  xs: 4,
  /** Chip gaps. */
  sm: 8,
  /** Inside rows, gutters. */
  md: 12,
  /** Card padding, screen margins. */
  lg: 20,
  /** Section gaps. */
  xl: 32,
  /** Hero breathing room. */
  xxl: 56,
} as const;

export const radii = {
  chip: 14,
  /** Inputs, checklist rows. */
  field: 16,
  card: 22,
  /** Grouped row cards — Profile and Settings sit a step tighter than a card. */
  group: 20,
  /** Fully-round pills and the FAB (999 in the design; any value ≥ height/2). */
  pill: 999,
  sheet: 28,
} as const;

export const layout = {
  screenMargin: spacing.lg,
  cardPadding: spacing.lg,
  sectionGap: spacing.xl,
  /** Primary ink pill. Secondary outline is 50, text link 44 (v3 buttons). */
  buttonHeight: 54,
  /** Paired actions inside a card sit lower than the primary pill (v4 §affirmation). */
  cardButtonHeight: 44,
  /**
   * Single-line input height. Fixed rather than padding-derived so every field
   * in the app is the same height and the text can be centred against a known
   * box — a padding-derived field drifts with the platform's font metrics, which
   * is how text ends up sitting off-centre. Sits between the 44pt row and the
   * 54pt primary pill, and clears the 44pt minimum tap target.
   */
  fieldHeight: 50,
  /**
   * Composer fields (gratitude, "describe yourself") open at three lines of
   * `body` plus padding. A multiline field that opens one line tall reads as a
   * single-line field and asks for a sentence when the screen asked for a
   * paragraph.
   */
  fieldHeightMultiline: 96,
  /**
   * Home stacks its sections closer than the 32pt section rhythm (v4 §home).
   * Off the 4pt grid because v4 is: the screen carries five sections and the
   * grid spacing pushed the last one below the fold.
   */
  homeSectionGap: 18,
  /** Today's-moment card — one step tighter than a standard card (v4 §home). */
  momentCardPadding: 18,
  /** Compact rows and tiles: 12 vertical, 14 horizontal (v4 §home). */
  rowPaddingV: 12,
  rowPaddingH: 14,
  /** Grouped list rows (v4 §profile/settings): 14 vertical, 16 horizontal. */
  listRowPaddingV: 14,
  listRowPaddingH: 16,
  /** The leading tile of a v4 list row (IconTile): 32pt square. Lives here so
   *  ListRow's hairline inset and TrialTimeline's column are measured from the
   *  same token instead of a constant exported by a sibling component. */
  iconTileSize: 32,
  /** Full-screen covers breathe wider than a tab screen (v4 §player). */
  coverMargin: 24,
  /** Collection tiles sit a hair taller than a list row (v4 §home grid). */
  tilePaddingV: 13,
  /** v4's affirmation card breathes one step more than a standard card. */
  affirmationCardPaddingV: 22,
} as const;

/**
 * Elevation (v3 §radius & elevation): one soft ink shadow — `0 12 32 ink/10`.
 * Shadow colour stays ink in both schemes; shadows are absence of light, not a
 * themed surface.
 */
export const shadows = {
  card: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
    shadowOpacity: 0.1,
    elevation: 8,
  },
  /** Softer lift for focused fields and small floating controls. */
  field: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    shadowOpacity: 0.05,
    elevation: 4,
  },
  /**
   * The focus "breath" around inputs. Deliberately colourless — the use site
   * supplies `shadowColor` from an accent token so the glow follows the scheme.
   */
  focusGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.35,
  },
} as const;

/**
 * Glyph sizes for text-rendered icons (✕, ♥, ⌄, play). One scale so an icon
 * never invents its own size inline.
 */
export const iconSizes = {
  /** Chevrons, small affordances. */
  md: 20,
  /** Close, hearts, inline play/pause. */
  lg: 22,
  /** The player's main transport glyph. */
  xl: 34,
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
  /** Orb ambience — loops, not transitions, so the 500ms cap doesn't govern them. */
  orbGlow: 600,
  orbShimmer: 1800,
} as const;
