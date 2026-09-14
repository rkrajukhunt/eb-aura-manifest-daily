import type { JobArtifact, JobStatus, Json } from '@aura/shared';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { SUPABASE_CLIENT, type ServiceRoleClient } from '../../supabase/supabase.module';
import { ConcurrencyQueue } from './concurrency-queue';

/** Per-artifact-class concurrency caps (04 §4). */
const CONCURRENCY: Record<'letter' | 'daily' | 'ondemand', number> = {
  letter: 4,
  daily: 8,
  ondemand: 4,
};

/** Provider-error backoff schedule: ≤2 retries at 2s then 8s (04 §4). */
const PROVIDER_RETRY_BACKOFF_MS = [2000, 8000];
/** QA failure gets exactly one corrective regeneration (08 §5). */
const MAX_QA_RETRIES = 1;
/** On boot, `running` jobs older than this are re-queued — the worker died mid-flight (04 §4). */
const STALE_RUNNING_MS = 5 * 60 * 1000;

/** Postgres unique-violation — a racing request inserted the same idempotency key first. */
function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === '23505' || /duplicate key|already exists/i.test(error.message ?? '');
}

export interface JobRow {
  id: string;
  user_id: string;
  artifact: JobArtifact;
  status: JobStatus;
  moment_id: string | null;
  attempt: number;
  /**
   * Per-artifact input (refine direction/note, manifest desire). Persisted on
   * the row rather than held in memory so a crash re-queue still knows what the
   * generation was for (04 §4).
   */
  input: unknown;
}

/**
 * A job as handed to the runner: the row, plus how many retries of each KIND
 * are still available.
 *
 * The two counters are what make "is this the last attempt" answerable. They
 * cannot be derived from `attempt`, which is a single column incremented on
 * every pass of either lane — a provider retry followed by a QA failure puts
 * `attempt` at 2 with the QA lane untouched. The pipeline refunds a Manifest
 * credit on its terminal failure, and reading `attempt` there refunded on a job
 * that then went on to succeed, handing out a free manifest.
 */
export interface RunningJob extends JobRow {
  /** Corrective QA regenerations still available after this attempt. */
  qaRetriesLeft: number;
  /** Provider backoff retries still available after this attempt. */
  providerRetriesLeft: number;
}

/**
 * The work a pipeline does for one job. Returns the created moment/affirmation
 * id (or null for artifacts that don't produce one). Throws `QaFailedError` for
 * a QA failure (drives the corrective retry) or any other error for a provider
 * failure (drives the backoff retry).
 */
export type JobRunner = (job: RunningJob) => Promise<{ momentId: string | null }>;

/** Thrown by the runner when the QA gate rejects output — retried differently. */
export class QaFailedError extends Error {
  constructor(readonly rules: string[]) {
    super(`QA failed: ${rules.join(', ')}`);
    this.name = 'QaFailedError';
  }
}

/**
 * The generation_jobs state machine (04 §4): the durable, in-process job runner.
 *
 * `queued → running → succeeded`, with two retry lanes:
 *   - QA failure → one corrective regeneration → else `qa_failed`
 *   - provider error → up to two backoff retries → else `failed`
 *
 * The job table is the source of truth; this queue is ephemeral. On boot, jobs
 * left `running` by a crashed instance are re-queued (04 §4) so no request is
 * silently lost.
 */
@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);
  private readonly queues = {
    letter: new ConcurrencyQueue(CONCURRENCY.letter),
    daily: new ConcurrencyQueue(CONCURRENCY.daily),
    ondemand: new ConcurrencyQueue(CONCURRENCY.ondemand),
  };
  private runner: JobRunner | null = null;

  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient) {}

  /** GenerationService registers the pipeline runner — avoids a DI cycle. */
  registerRunner(runner: JobRunner): void {
    this.runner = runner;
  }

  async onModuleInit(): Promise<void> {
    await this.requeueStaleJobs();
  }

  /**
   * Creates a job (or returns the existing one for a replayed idempotency key,
   * 04 §3) and starts it running in the background. Returns immediately with the
   * job id — the endpoint responds 202 while the pipeline runs (04 §2).
   */
  async enqueue(
    userId: string,
    artifact: JobArtifact,
    idempotencyKey?: string,
    input?: unknown,
  ): Promise<{ jobId: string; existing: boolean }> {
    if (idempotencyKey) {
      const { data: existing } = await this.supabase
        .from('generation_jobs')
        .select('id')
        .eq('user_id', userId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) return { jobId: existing.id, existing: true };
    }

    const { data, error } = await this.supabase
      .from('generation_jobs')
      .insert({
        user_id: userId,
        artifact,
        status: 'queued',
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
        ...(input === undefined ? {} : { input: input as Json }),
      })
      .select('id')
      .single();

    // Two requests with the same key can both miss the read above and reach the
    // insert; the unique index turns the loser's insert into a `23505`. That is
    // not an error — it is the duplicate we are here to prevent — so re-read and
    // return the winner's job instead of a 500.
    if (error && idempotencyKey && isUniqueViolation(error)) {
      const { data: raced } = await this.supabase
        .from('generation_jobs')
        .select('id')
        .eq('user_id', userId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (raced) return { jobId: raced.id, existing: true };
    }

    if (error || !data) throw new Error(`Failed to create job: ${error?.message}`);

    // Fire-and-forget: the endpoint answers 202 while this runs (04 §2).
    // `runWithRetries` handles pipeline failures, but its own bookkeeping —
    // `loadJob`, `setStatus` — can still reject, and an unhandled rejection
    // there takes the process down rather than losing one job.
    void this.process(data.id, artifact).catch((processError: unknown) => {
      this.logger.error(
        `Job ${data.id} failed outside its retry lanes: ${errorName(processError)}`,
      );
    });

    return { jobId: data.id, existing: false };
  }

  /** Picks the queue for an artifact class (04 §4 caps). */
  private queueFor(artifact: JobArtifact): ConcurrencyQueue {
    if (artifact === 'letter' || artifact === 'milestone') return this.queues.letter;
    if (artifact === 'daily' || artifact === 'affirmation_daily') return this.queues.daily;
    return this.queues.ondemand;
  }

  private async process(jobId: string, artifact: JobArtifact): Promise<void> {
    await this.queueFor(artifact).run(() => this.runWithRetries(jobId));
  }

  /**
   * Runs a job through both retry lanes. QA and provider failures are counted
   * separately: a QA failure means the output was reachable but wrong (one
   * corrective retry), a provider error means the vendor was unreachable
   * (backoff retries).
   */
  private async runWithRetries(jobId: string): Promise<void> {
    if (!this.runner) {
      this.logger.error('No job runner registered — GenerationService did not wire up');
      return;
    }

    const start = Date.now();
    let qaRetries = 0;
    let providerRetries = 0;

    for (;;) {
      const job = await this.loadJob(jobId);
      if (!job) return;

      // `started_at` is stamped on every pass, so the stale-job cutoff measures
      // the CURRENT attempt rather than when the job was first queued.
      await this.setStatus(jobId, job.attempt + 1 > 1 ? 'retrying' : 'running', {
        attempt: job.attempt + 1,
        startedAt: new Date().toISOString(),
      });

      try {
        const { momentId } = await this.runner({
          ...job,
          attempt: job.attempt + 1,
          qaRetriesLeft: MAX_QA_RETRIES - qaRetries,
          providerRetriesLeft: PROVIDER_RETRY_BACKOFF_MS.length - providerRetries,
        });
        await this.finish(jobId, 'succeeded', { momentId, latencyMs: Date.now() - start });
        return;
      } catch (error) {
        if (error instanceof QaFailedError) {
          if (qaRetries < MAX_QA_RETRIES) {
            qaRetries += 1;
            this.logger.warn(`Job ${jobId} QA retry ${qaRetries} (${error.rules.join(',')})`);
            continue;
          }
          await this.finish(jobId, 'qa_failed', { error: `qa:${error.rules.join(',')}` });
          return;
        }

        if (providerRetries < PROVIDER_RETRY_BACKOFF_MS.length) {
          const delay = PROVIDER_RETRY_BACKOFF_MS[providerRetries] ?? 0;
          providerRetries += 1;
          this.logger.warn(`Job ${jobId} provider retry ${providerRetries} in ${delay}ms`);
          await sleep(delay);
          continue;
        }

        // Exhausted. `error` stores a code only — never user content (04 §4).
        await this.finish(jobId, 'failed', { error: 'provider_error' });
        return;
      }
    }
  }

  /**
   * Re-queues jobs a crashed instance left `running` (04 §4).
   *
   * Keyed on `started_at`, not `created_at`. `created_at` is the QUEUE time and
   * never moves, so a job that sat behind a full concurrency queue and only just
   * began running already looked older than the cutoff — a boot would re-queue
   * work that was actively in flight and generate it twice.
   */
  private async requeueStaleJobs(): Promise<void> {
    const cutoff = new Date(Date.now() - STALE_RUNNING_MS).toISOString();
    const { data } = await this.supabase
      .from('generation_jobs')
      .select('id, artifact')
      .in('status', ['running', 'retrying'])
      .lt('started_at', cutoff);

    for (const job of data ?? []) {
      this.logger.warn(`Re-queuing stale job ${job.id} left running by a prior instance`);
      void this.process(job.id, job.artifact).catch((error: unknown) => {
        this.logger.error(
          `Re-queued job ${job.id} failed outside its retry lanes: ${errorName(error)}`,
        );
      });
    }
  }

  private async loadJob(jobId: string): Promise<JobRow | null> {
    const { data } = await this.supabase
      .from('generation_jobs')
      .select('id, user_id, artifact, status, moment_id, attempt, input')
      .eq('id', jobId)
      .single();
    return data;
  }

  private async setStatus(
    jobId: string,
    status: JobStatus,
    extra: { attempt?: number; startedAt?: string } = {},
  ): Promise<void> {
    await this.supabase
      .from('generation_jobs')
      .update({
        status,
        ...(extra.attempt !== undefined ? { attempt: extra.attempt } : {}),
        ...(extra.startedAt !== undefined ? { started_at: extra.startedAt } : {}),
      })
      .eq('id', jobId);
  }

  private async finish(
    jobId: string,
    status: Extract<JobStatus, 'succeeded' | 'failed' | 'qa_failed'>,
    result: { momentId?: string | null; latencyMs?: number; error?: string },
  ): Promise<void> {
    await this.supabase
      .from('generation_jobs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        ...(result.momentId ? { moment_id: result.momentId } : {}),
        ...(result.latencyMs !== undefined ? { latency_ms: result.latencyMs } : {}),
        ...(result.error ? { error: result.error } : {}),
      })
      .eq('id', jobId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms).unref());
}

/** Error shape for a log line — never the message, which can echo content. */
function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown';
}
