import { containsEmotionWord } from './stopwords';

/**
 * Emotional weight, set at write (09 §3).
 *
 * Used ONLY as sampling priority — never surfaced to her. There is no UI that
 * shows a number against something she told us, and there never should be.
 *
 * Heuristic:
 *   base 2
 *   +1 if from the struggle/S10 or it contains an emotion-lexicon word
 *   +1 if user-authored free text (rather than a choice chip)
 *   5 reserved for the onboarding struggle
 */

export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 5;

/** Reserved: the S10 struggle is the single heaviest thing she gives us (09 §3). */
export const STRUGGLE_WEIGHT = 5;

export interface WeightInput {
  text: string;
  /** True for typed free text; false for a chip or card selection. */
  userAuthored: boolean;
  /** True only for the onboarding struggle (S10). */
  isStruggle?: boolean;
}

export function emotionalWeight({ text, userAuthored, isStruggle = false }: WeightInput): number {
  if (isStruggle) return STRUGGLE_WEIGHT;

  let weight = 2;
  if (containsEmotionWord(text)) weight += 1;
  if (userAuthored) weight += 1;

  return clamp(weight);
}

function clamp(value: number): number {
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, value));
}
