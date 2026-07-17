/**
 * The companion-voice ban lists (product 14 §6, §37–38).
 *
 * Shared because two enforcement points read them: the mobile copy-lint test
 * (every string in `src/copy/**`, 15 §5) and the backend QA gate on generated
 * content (08 §5, Phase 5). One list, or the two surfaces drift.
 *
 * These are product requirements, not guidance (cross-phase rule 3): a conflict
 * between speed and this list resolves toward the list.
 */

/** Verbatim bans from product 14 rule 6. Matched case-insensitively. */
export const BANNED_PHRASES: readonly string[] = [
  'unlock your potential',
  'on this journey',
  'self-care routine',
  'you got this',
  "don't miss out",
  'limited time',
  'the universe has plans for you',
  'manifest your best life',
];

/**
 * Guilt/urgency vocabulary (product 14: notifications carry "zero guilt/urgency
 * vocabulary"; missed days are never named; product 16: shame-free by design).
 * Broader than the phrase list on purpose — these words poison any sentence
 * they appear in, whatever surrounds them.
 */
export const GUILT_VOCABULARY: readonly string[] = [
  'streak',
  'you missed',
  "you've missed",
  'miss you', // "your future self misses you" — the exact BAD example in 14
  'last chance',
  'act now',
  'hurry',
  'before spots',
  'running out',
  "don't lose",
  'expires soon',
  'one-time offer',
];

/**
 * Affirmation negative-frame patterns (product 14 §35): brains process the
 * negative first, so "anxiety will not beat me" plants "anxiety beats me".
 * Used by the Phase 5 QA gate; listed here so the rule has one home.
 */
export const NEGATIVE_FRAME_MARKERS: readonly string[] = [
  'not ',
  "won't ",
  'will not ',
  'never ',
  'no longer ',
  'stop ',
  'without ',
];

/** Case-insensitive scan. Returns every banned/guilt term found, for a useful failure message. */
export function findBannedLanguage(text: string): string[] {
  const lowered = text.toLowerCase();
  return [...BANNED_PHRASES, ...GUILT_VOCABULARY].filter((term) => lowered.includes(term));
}

/**
 * Product 14 rule 5: no exclamation marks in emotional surfaces, at most one
 * anywhere. The copy lint applies this to every catalog string — system copy is
 * always an emotional surface in this product.
 */
export function exceedsExclamationBudget(text: string): boolean {
  return (text.match(/!/g) ?? []).length > 1;
}
