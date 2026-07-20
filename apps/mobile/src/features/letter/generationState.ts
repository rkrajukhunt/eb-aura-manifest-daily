import type { JobStatusResponse } from '@aura/shared';

import { kv, STORAGE_KEYS } from '@/lib/storage';

export type RitualPhase = 'working' | 'ready' | 'failed';

/**
 * The ritual's decision logic, kept out of the hook so it can be tested without
 * a renderer. Both rules here are subtle enough to be worth pinning:
 *
 *  - the attempt counter is what makes "try again" actually try again;
 *  - the phase mapping decides whether she sees the wow or the retry line.
 */

/**
 * The idempotency key for one generation attempt (07 §1).
 *
 * The backend dedupes a replayed key back to the SAME job, which is exactly what
 * we want for a dropped response and exactly what we do not want for a retry: a
 * fixed key would hand her the already-failed job forever. Including the attempt
 * is what separates the two cases.
 */
export function idempotencyKeyFor(userId: string, attempt: number): string {
  return `letter:${userId}:${attempt}`;
}

/**
 * The current attempt, starting at 1 and PERSISTED — a relaunch mid-generation
 * must resume the attempt it was on rather than replaying a dead one.
 */
export function readAttempt(): number {
  const stored = kv.get<number>(STORAGE_KEYS.letterAttempt);
  if (typeof stored === 'number' && stored > 0) return stored;
  kv.set(STORAGE_KEYS.letterAttempt, 1);
  return 1;
}

/** Moves to a fresh attempt. Called only by an explicit retry, never by a remount. */
export function bumpAttempt(): number {
  const next = readAttempt() + 1;
  kv.set(STORAGE_KEYS.letterAttempt, next);
  return next;
}

/**
 * Job status → what the ritual shows.
 *
 * `succeeded` without a `momentId` deliberately stays `working` rather than
 * advancing: routing to a Letter that has no moment behind it would replace the
 * wow with an empty screen, and waiting is the better failure.
 */
export function derivePhase(
  job: Pick<JobStatusResponse, 'status' | 'momentId'> | undefined,
  requestFailed: boolean,
): RitualPhase {
  if (requestFailed) return 'failed';
  if (!job) return 'working';
  if (job.status === 'failed' || job.status === 'qa_failed') return 'failed';
  if (job.status === 'succeeded' && job.momentId) return 'ready';
  return 'working';
}
