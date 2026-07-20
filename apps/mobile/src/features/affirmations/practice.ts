import type { TechniqueName } from '@aura/shared';

import { kv, STORAGE_KEYS } from '@/lib/storage';

/**
 * The 369 practice (product 09 §9.3c): write it three times this morning, six
 * times today, nine times tonight.
 *
 * Pure over a plain record so the counter's rules can be tested without a
 * clock or storage. The rule that matters: it RESETS DAILY and it does not
 * carry a failure. Yesterday's incomplete practice simply is not today's
 * problem — a counter that remembered what she did not finish would be the
 * streak mechanic product 16 bans, wearing a different hat.
 */
export const PRACTICE_TARGETS = { morning: 3, afternoon: 6, night: 9 } as const;
export type PracticeBlock = keyof typeof PRACTICE_TARGETS;

export interface PracticeState {
  /** Her local date. State for any other day is discarded rather than migrated. */
  date: string;
  morning: number;
  afternoon: number;
  night: number;
}

export function emptyPractice(date: string): PracticeState {
  return { date, morning: 0, afternoon: 0, night: 0 };
}

/** Loads today's practice, discarding any earlier day (the daily reset). */
export function loadPractice(today: string): PracticeState {
  const stored = kv.get<PracticeState>(STORAGE_KEYS.practice369);
  return stored?.date === today ? stored : emptyPractice(today);
}

export function savePractice(state: PracticeState): void {
  kv.set(STORAGE_KEYS.practice369, state);
}

/** Records one repetition, never past the block's target. */
export function increment(state: PracticeState, block: PracticeBlock): PracticeState {
  return { ...state, [block]: Math.min(PRACTICE_TARGETS[block], state[block] + 1) };
}

export function isBlockComplete(state: PracticeState, block: PracticeBlock): boolean {
  return state[block] >= PRACTICE_TARGETS[block];
}

export function isPracticeComplete(state: PracticeState): boolean {
  return (Object.keys(PRACTICE_TARGETS) as PracticeBlock[]).every((block) =>
    isBlockComplete(state, block),
  );
}

/** Which block the clock is in, so the counter opens on the relevant one. */
export function currentBlock(now: Date = new Date()): PracticeBlock {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'night';
}

/**
 * The daily ritual's three beats (product 09, Phase 8 DoD).
 *
 * `ritual_completed` fires ONLY when all three happened on the SAME DAY — the
 * DoD says so explicitly. Tracking it as three independent flags would let a
 * moment from Monday and a gratitude line from Friday count as a completed
 * ritual and quietly corrupt the retention number the whole habit loop is
 * measured on.
 */
export interface RitualProgress {
  date: string;
  moment: boolean;
  affirmation: boolean;
  gratitude: boolean;
}

export type RitualBeat = 'moment' | 'affirmation' | 'gratitude';

export function loadRitual(today: string): RitualProgress {
  const stored = kv.get<RitualProgress>(STORAGE_KEYS.ritualProgress);
  return stored?.date === today
    ? stored
    : { date: today, moment: false, affirmation: false, gratitude: false };
}

export function markBeat(progress: RitualProgress, beat: RitualBeat): RitualProgress {
  return { ...progress, [beat]: true };
}

export function isRitualComplete(progress: RitualProgress): boolean {
  return progress.moment && progress.affirmation && progress.gratitude;
}

/**
 * Records a beat and reports whether THIS beat completed the ritual — so the
 * event fires exactly once per day rather than on every subsequent beat.
 */
export function recordBeat(
  today: string,
  beat: RitualBeat,
): { progress: RitualProgress; justCompleted: boolean } {
  const before = loadRitual(today);
  const wasComplete = isRitualComplete(before);
  const progress = markBeat(before, beat);

  kv.set(STORAGE_KEYS.ritualProgress, progress);

  return { progress, justCompleted: !wasComplete && isRitualComplete(progress) };
}

/** Techniques a card may carry (product 09 §9.3c). */
export const TECHNIQUES: readonly TechniqueName[] = [
  'identity',
  'present_tense',
  'three_six_nine',
  'scripting',
];
