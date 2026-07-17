/**
 * The raw palette (product 12 §colors). RAW VALUES LIVE ONLY HERE.
 *
 * Feature code must never import from this file — it imports semantic tokens from
 * `./tokens`, which resolve per colour scheme. A hex in a screen is a bug: it
 * cannot respond to dark mode, and it quietly forks the brand.
 *
 * Grounded in the research palette (lavender = blue's calm + pink's warmth) but
 * deliberately more restrained than the competitor world.
 */
export const palette = {
  // Primary family
  lavender: '#B5A9D6',
  sky: '#A8D0E6',
  /** Growth/becoming accents. */
  sage: '#B7C9A8',

  // Neutrals — warm, never clinical.
  warmWhite: '#FBF9F6',
  sand: '#EDE6DD',

  /** Used sparingly, for self-compassion moments only. */
  blush: '#F3D9DE',

  /** The single high-contrast colour: buttons, active tab, play. */
  periwinkle: '#6C63B5',

  // Dark-world bases. Warm plum-charcoal, never harsh black.
  dusk: '#2A2540',
  darkBase: '#1E1B2E',

  // Ink
  ink: '#2A2540',
  inkSoft: '#5A5470',

  /**
   * Destructive text inside confirmation sheets only (product 12 §buttons).
   * Muted rather than alarm-red: saturated red triggers fight-or-flight, which
   * is the opposite of everything this product is for.
   */
  quietRed: '#A3565B',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * Not in the palette, on purpose (product 12 §avoid): saturated red, neon,
 * stark clinical white, and anything celebratory near vulnerable content.
 */
