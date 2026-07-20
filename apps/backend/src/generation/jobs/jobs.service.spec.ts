import { Logger } from '@nestjs/common';

import { fakeJobsTable } from '../__fixtures__/fake-jobs-table';
import { JobsService, QaFailedError, type JobRunner } from './jobs.service';

/**
 * Job state machine suite (15 §2, 04 §4).
 *
 * The two retry lanes are the point: a QA failure means the model was reachable
 * but wrong (one corrective regeneration), a provider error means the vendor was
 * unreachable (two backoff retries). Conflating them would either burn money
 * re-rolling a deterministic failure or give up on a blip. Backoff runs on fake
 * timers so the 2s/8s schedule is asserted rather than waited out.
 */
describe('JobsService', () => {
  let table: ReturnType<typeof fakeJobsTable>;
  let service: JobsService;

  const build = (seed: Parameters<typeof fakeJobsTable>[0] = []) => {
    table = fakeJobsTable(seed);
    service = new JobsService(table.client);
    return service;
  };

  /** Runs pending microtasks and timers until the job reaches a terminal state. */
  const settle = async (jobId: string, ticks = 20) => {
    for (let i = 0; i < ticks; i++) {
      const status = table.get(jobId)?.status;
      if (status && ['succeeded', 'failed', 'qa_failed'].includes(status)) return;
      await jest.advanceTimersByTimeAsync(10_000);
    }
  };

  const enqueueAndSettle = async (runner: JobRunner) => {
    service.registerRunner(runner);
    const { jobId } = await service.enqueue('user-1', 'letter');
    await settle(jobId);
    return jobId;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    build();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('enqueue', () => {
    it('creates a queued job and returns its id', async () => {
      service.registerRunner(async () => new Promise(() => {})); // never settles

      const { jobId, existing } = await service.enqueue('user-1', 'letter');

      expect(existing).toBe(false);
      expect(table.get(jobId)).toMatchObject({ user_id: 'user-1', artifact: 'letter' });
    });

    it('returns the existing job for a replayed idempotency key (04 §3)', async () => {
      service.registerRunner(async () => new Promise(() => {}));

      const first = await service.enqueue('user-1', 'letter', 'key-abc');
      const replay = await service.enqueue('user-1', 'letter', 'key-abc');

      expect(replay).toEqual({ jobId: first.jobId, existing: true });
      expect(table.rows).toHaveLength(1);
    });

    it('scopes idempotency to the user — two users may reuse a key', async () => {
      service.registerRunner(async () => new Promise(() => {}));

      const mine = await service.enqueue('user-1', 'letter', 'key-abc');
      const theirs = await service.enqueue('user-2', 'letter', 'key-abc');

      expect(theirs.jobId).not.toBe(mine.jobId);
      expect(theirs.existing).toBe(false);
    });

    it('creates a fresh job every time when no key is given', async () => {
      service.registerRunner(async () => new Promise(() => {}));

      const a = await service.enqueue('user-1', 'letter');
      const b = await service.enqueue('user-1', 'letter');

      expect(a.jobId).not.toBe(b.jobId);
      expect(table.rows).toHaveLength(2);
    });

    it('throws when the row cannot be created', async () => {
      table.failNextInsert('permission denied');

      await expect(service.enqueue('user-1', 'letter')).rejects.toThrow('permission denied');
    });
  });

  describe('the happy path', () => {
    it('records success with the moment id, latency and first attempt', async () => {
      const jobId = await enqueueAndSettle(async () => ({ momentId: 'moment-1' }));

      expect(table.get(jobId)).toMatchObject({
        status: 'succeeded',
        moment_id: 'moment-1',
        attempt: 1,
        error: null,
      });
      expect(table.get(jobId)?.finished_at).not.toBeNull();
      expect(table.get(jobId)?.latency_ms).toBeGreaterThanOrEqual(0);
    });

    it('hands the runner the job with its incremented attempt', async () => {
      const runner = jest.fn().mockResolvedValue({ momentId: null });
      await enqueueAndSettle(runner);

      expect(runner).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 1, artifact: 'letter' }),
      );
    });
  });

  describe('the QA lane — reachable but wrong', () => {
    it('takes exactly one corrective regeneration, then succeeds', async () => {
      const runner = jest
        .fn()
        .mockRejectedValueOnce(new QaFailedError(['name_first']))
        .mockResolvedValue({ momentId: 'moment-2' });

      const jobId = await enqueueAndSettle(runner);

      expect(runner).toHaveBeenCalledTimes(2);
      expect(table.get(jobId)).toMatchObject({ status: 'succeeded', attempt: 2 });
    });

    it('gives up as qa_failed after the second miss, naming the rules', async () => {
      const runner = jest.fn().mockRejectedValue(new QaFailedError(['name_first', 'length']));

      const jobId = await enqueueAndSettle(runner);

      expect(runner).toHaveBeenCalledTimes(2);
      expect(table.get(jobId)).toMatchObject({
        status: 'qa_failed',
        error: 'qa:name_first,length',
      });
    });

    it('does not wait out a provider backoff for a QA failure', async () => {
      const runner = jest
        .fn()
        .mockRejectedValueOnce(new QaFailedError(['length']))
        .mockResolvedValue({ momentId: 'moment-3' });
      service.registerRunner(runner);

      const { jobId } = await service.enqueue('user-1', 'letter');
      // No timer advance at all — only microtasks.
      await jest.advanceTimersByTimeAsync(0);

      expect(table.get(jobId)?.status).toBe('succeeded');
    });
  });

  describe('the provider lane — unreachable vendor', () => {
    it('retries twice on the 2s then 8s schedule, then succeeds', async () => {
      const runner = jest
        .fn()
        .mockRejectedValueOnce(new Error('502'))
        .mockRejectedValueOnce(new Error('502'))
        .mockResolvedValue({ momentId: 'moment-4' });
      service.registerRunner(runner);

      const { jobId } = await service.enqueue('user-1', 'letter');

      await jest.advanceTimersByTimeAsync(0);
      expect(runner).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(2_000);
      expect(runner).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(8_000);
      expect(runner).toHaveBeenCalledTimes(3);
      expect(table.get(jobId)).toMatchObject({ status: 'succeeded', attempt: 3 });
    });

    it('fails with a code only — never user content (04 §4)', async () => {
      const runner = jest.fn().mockRejectedValue(new Error('upstream said: Maya wants Lisbon'));

      const jobId = await enqueueAndSettle(runner);

      expect(runner).toHaveBeenCalledTimes(3);
      expect(table.get(jobId)).toMatchObject({ status: 'failed', error: 'provider_error' });
      expect(table.get(jobId)?.error).not.toContain('Maya');
    });

    it('counts the two lanes separately — a QA miss does not spend a provider retry', async () => {
      const runner = jest
        .fn()
        .mockRejectedValueOnce(new QaFailedError(['length'])) // QA retry 1 of 1
        .mockRejectedValueOnce(new Error('502')) // provider retry 1 of 2
        .mockRejectedValueOnce(new Error('502')) // provider retry 2 of 2
        .mockResolvedValue({ momentId: 'moment-5' });

      const jobId = await enqueueAndSettle(runner);

      expect(runner).toHaveBeenCalledTimes(4);
      expect(table.get(jobId)?.status).toBe('succeeded');
    });

    it('marks the job retrying rather than running on later attempts', async () => {
      const seen: string[] = [];
      const runner = jest.fn().mockImplementation(async (job: { id: string }) => {
        seen.push(table.get(job.id)?.status ?? 'missing');
        if (seen.length === 1) throw new Error('502');
        return { momentId: 'moment-6' };
      });

      await enqueueAndSettle(runner);

      expect(seen).toEqual(['running', 'retrying']);
    });
  });

  describe('crash recovery on boot (04 §4)', () => {
    it('re-queues a job left running by a dead instance', async () => {
      const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      build([{ id: 'job-stale', status: 'running', created_at: stale }]);
      service.registerRunner(async () => ({ momentId: 'moment-recovered' }));

      await service.onModuleInit();
      await settle('job-stale');

      expect(table.get('job-stale')).toMatchObject({
        status: 'succeeded',
        moment_id: 'moment-recovered',
      });
    });

    it('re-queues a job left retrying too', async () => {
      const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      build([{ id: 'job-stale', status: 'retrying', created_at: stale }]);
      service.registerRunner(async () => ({ momentId: 'moment-recovered' }));

      await service.onModuleInit();
      await settle('job-stale');

      expect(table.get('job-stale')?.status).toBe('succeeded');
    });

    it('leaves a job that is still within the stale window alone', async () => {
      const fresh = new Date(Date.now() - 30 * 1000).toISOString();
      build([{ id: 'job-fresh', status: 'running', created_at: fresh }]);
      const runner = jest.fn().mockResolvedValue({ momentId: 'x' });
      service.registerRunner(runner);

      await service.onModuleInit();
      await jest.advanceTimersByTimeAsync(1_000);

      expect(runner).not.toHaveBeenCalled();
      expect(table.get('job-fresh')?.status).toBe('running');
    });

    it('leaves finished jobs alone', async () => {
      const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      build([{ id: 'job-done', status: 'succeeded', created_at: stale }]);
      const runner = jest.fn().mockResolvedValue({ momentId: 'x' });
      service.registerRunner(runner);

      await service.onModuleInit();
      await jest.advanceTimersByTimeAsync(1_000);

      expect(runner).not.toHaveBeenCalled();
    });
  });

  describe('queue routing (04 §4 caps)', () => {
    // Artifacts share three concurrency pools: the expensive flagship lane
    // (letter/milestone), the high-volume daily lane, and the on-demand lane.
    // Every artifact must land in one of them and run to completion.
    it.each<[string, string]>([
      ['letter', 'letter lane'],
      ['milestone', 'letter lane'],
      ['daily', 'daily lane'],
      ['affirmation_daily', 'daily lane'],
      ['ondemand', 'on-demand lane'],
      ['refine', 'on-demand lane'],
      ['affirmation_guided', 'on-demand lane'],
      ['winback', 'on-demand lane'],
    ])('runs a %s job through the %s', async (artifact) => {
      service.registerRunner(async () => ({ momentId: 'moment-1' }));

      const { jobId } = await service.enqueue('user-1', artifact as never);
      await settle(jobId);

      expect(table.get(jobId)?.status).toBe('succeeded');
    });
  });

  describe('misconfiguration', () => {
    it('logs and stops rather than crashing when no runner was registered', async () => {
      const error = jest.spyOn(Logger.prototype, 'error');

      const { jobId } = await service.enqueue('user-1', 'letter');
      await jest.advanceTimersByTimeAsync(1_000);

      expect(error).toHaveBeenCalledWith(expect.stringContaining('No job runner registered'));
      expect(table.get(jobId)?.status).toBe('queued');
    });
  });
});
