import type { PlayableMoment } from './useMoments';

/**
 * What Home should show (product 09 §9.1 STATES).
 *
 * Product 09 is emphatic that this surface has **no empty state**: "Empty:
 * never (generation is scheduled ahead; fallback = replay yesterday's + honest
 * 'today's is still forming')". So the states below are exhaustive and none of
 * them is blank — even total failure shows yesterday's moment if one exists.
 *
 * Pure, because this is the branch that decides what she sees first thing in
 * the morning, and it is far easier to get right with a table of cases than
 * with conditionals spread through a screen.
 */
export type HomeMomentState =
  /** Today's is here. The normal morning. */
  | { kind: 'ready'; moment: PlayableMoment }
  /** Today's is being written; yesterday's is offered meanwhile. */
  | { kind: 'forming'; fallback: PlayableMoment | null }
  /** Generation failed and there is nothing newer; offer a retry. */
  | { kind: 'failed'; fallback: PlayableMoment | null }
  /** Brand new account, before the first moment exists. */
  | { kind: 'first_run' };

export interface HomeMomentInput {
  latest: PlayableMoment | null;
  /** `scheduled_for` of the latest daily moment, if it has one. */
  latestScheduledFor: string | null;
  /** Her local date, from `localDateToday`. */
  today: string;
  /** True while the on-open fallback generation is running. */
  generating: boolean;
  /** True when the last generation attempt failed outright. */
  failed: boolean;
}

export function resolveHomeMoment(input: HomeMomentInput): HomeMomentState {
  const { latest, latestScheduledFor, today, generating, failed } = input;

  // Today's moment is here — but a moment with no scheduled date (an on-demand
  // Manifest, a milestone) also counts: it is the newest thing she has, and
  // telling her it is "still forming" while a fresh moment sits there would be
  // a lie about her own library.
  if (latest && (latestScheduledFor === null || latestScheduledFor >= today)) {
    return { kind: 'ready', moment: latest };
  }

  // Nothing at all, ever. The only genuinely empty case, and it resolves
  // itself within a minute of the fallback generation.
  if (!latest && !failed) return { kind: 'first_run' };

  if (failed && !generating) return { kind: 'failed', fallback: latest };

  // Today's is late or being written; yesterday's fills the gap.
  return { kind: 'forming', fallback: latest };
}

/** Greeting key by local hour (product 11). */
export function greetingFor(now: Date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const hour = now.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}
