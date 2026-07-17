/**
 * Product limits (product 09 §9.2, 04 §86).
 *
 * These are DEFAULTS. The backend reads the matching env vars and falls back to
 * these, so limits stay tunable without a redeploy (04 §86, product 20 Q4).
 * Mobile imports them to render "credits remaining" style copy optimistically —
 * the server is always the authority on whether a spend is allowed.
 */
export const LIMITS = {
  /** Manifest Anything: on-demand moments per rolling week. Env: MANIFEST_WEEKLY_LIMIT. */
  MANIFEST_WEEKLY_LIMIT: 3,
  /** Refine: regenerations allowed per moment. Env: REFINE_PER_MOMENT. */
  REFINE_PER_MOMENT: 1,
  /** Pre-generation skips users inactive longer than this (cost guard, 00 §D3). Env: PREGEN_INACTIVE_SKIP_DAYS. */
  PREGEN_INACTIVE_SKIP_DAYS: 7,
  /** Daily moment is generated this many minutes before arrival_time (00 §D3). Env: PREGEN_BUFFER_MINUTES. */
  PREGEN_BUFFER_MINUTES: 30,
  /** Manifest desire free-text bounds (07 §1). */
  DESIRE_TEXT_MIN: 1,
  DESIRE_TEXT_MAX: 280,
} as const;

/** Free tier (product 05, 15): a small real tier, not a teaser. */
export const FREE_TIER = {
  MOMENTS_PER_DAY: 1,
  AFFIRMATIONS_PER_DAY: 1,
  /** Gratitude is never gated, and the Letter is kept forever — product 15 anti-resentment #6. */
  GRATITUDE_GATED: false,
  LETTER_KEPT_ON_LAPSE: true,
} as const;
