import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';

import {
  bumpAttempt,
  derivePhase,
  idempotencyKeyFor,
  readAttempt,
  type RitualPhase,
} from './generationState';
import { useGenerationJob } from './useGenerationJob';

/**
 * Past this, the ritual adds its fourth line (product 08 §2). Not a timeout —
 * nothing is cancelled, she is simply told the truth.
 */
export const PATIENCE_THRESHOLD_MS = 45_000;

const TICK_MS = 1_000;

export type { RitualPhase };

export interface LetterGeneration {
  phase: RitualPhase;
  /** Set once the job succeeds — the moment to open. */
  momentId: string | null;
  elapsedMs: number;
  /** True past the patience threshold while still working. */
  takingLonger: boolean;
  retry: () => void;
}

/**
 * Drives the Letter's generation from the ritual screen.
 *
 * The idempotency key is `letter:{userId}:{attempt}` with the attempt PERSISTED,
 * which matters more than it looks. The backend dedupes a replayed key to the
 * same job, so a fixed key would pin a retry to the job that already failed —
 * she would tap "try again" and be handed the same failure forever. Bumping the
 * attempt is what makes retry mean retry. Persisting it means a killed app
 * resumes on the right attempt rather than replaying a dead one.
 *
 * The backend separately enforces one letter per user and ignores failed jobs
 * when it does, so this can never spawn a second live letter (07 §1).
 */
export function useLetterGeneration(userId: string | undefined): LetterGeneration {
  const [jobId, setJobId] = useState<string | undefined>();
  const [startFailed, setStartFailed] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef(Date.now());

  const start = useCallback(
    async (attempt: number) => {
      if (!userId) return;
      setStartFailed(false);
      startedAt.current = Date.now();
      setElapsedMs(0);

      try {
        const { jobId: id } = await api.requestLetter(idempotencyKeyFor(userId, attempt));
        setJobId(id);
      } catch {
        // The retry copy is in-voice and carries no code (product 08 §2), so the
        // reason stays here rather than reaching her. Sentry has the detail.
        setStartFailed(true);
      }
    },
    [userId],
  );

  // Kick off on first mount for this user. The persisted attempt is reused, not
  // bumped: a remount is not a retry, and bumping here would start a second job
  // every time the screen re-rendered from scratch.
  useEffect(() => {
    if (!userId) return;
    void start(readAttempt());
  }, [userId, start]);

  // Elapsed clock for the fourth line. Cleared on unmount — a leaked interval
  // outliving the ritual is exactly the leak the mobile suite force-exits on.
  useEffect(() => {
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt.current), TICK_MS);
    return () => clearInterval(id);
  }, [jobId]);

  const { data: job } = useGenerationJob(jobId);

  const retry = useCallback(() => {
    setJobId(undefined);
    void start(bumpAttempt());
  }, [start]);

  const phase = derivePhase(job, startFailed);

  return {
    phase,
    momentId: job?.momentId ?? null,
    elapsedMs,
    takingLonger: phase === 'working' && elapsedMs >= PATIENCE_THRESHOLD_MS,
    retry,
  };
}
