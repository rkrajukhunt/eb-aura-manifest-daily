import type { JobArtifact, JobStatus } from '@aura/shared';
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

export interface JobRow {
  id: string;
  user_id: string;
  artifact: JobArtifact;
  status: JobStatus;
  moment_id: string | null;
  attempt: number;
}

/**
 * The work a pipeline does for one job. Returns the created moment/affirmation
 * id (or null for artifacts that don't produce one). Throws `QaFailedError` for
 * a QA failure (drives the corrective retry) or any other error for a provider
 * failure (drives the backoff retry).
 */
export type JobRunner = (job: JobRow) => Promise<{ momentId: string | null }>;

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
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(`Failed to create job: ${error?.message}`);

    void this.process(data.id, artifact);
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

      await this.setStatus(jobId, job.attempt + 1 > 1 ? 'retrying' : 'running', {
        attempt: job.attempt + 1,
      });

      try {
        const { momentId } = await this.runner({ ...job, attempt: job.attempt + 1 });
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

  private async requeueStaleJobs(): Promise<void> {
    const cutoff = new Date(Date.now() - STALE_RUNNING_MS).toISOString();
    const { data } = await this.supabase
      .from('generation_jobs')
      .select('id, artifact')
      .in('status', ['running', 'retrying'])
      .lt('created_at', cutoff);

    for (const job of data ?? []) {
      this.logger.warn(`Re-queuing stale job ${job.id} left running by a prior instance`);
      void this.process(job.id, job.artifact);
    }
  }

  private async loadJob(jobId: string): Promise<JobRow | null> {
    const { data } = await this.supabase
      .from('generation_jobs')
      .select('id, user_id, artifact, status, moment_id, attempt')
      .eq('id', jobId)
      .single();
    return data;
  }

  private async setStatus(
    jobId: string,
    status: JobStatus,
    extra: { attempt?: number } = {},
  ): Promise<void> {
    await this.supabase
      .from('generation_jobs')
      .update({ status, ...(extra.attempt !== undefined ? { attempt: extra.attempt } : {}) })
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
