import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { JobsService } from '../generation/jobs/jobs.service';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';
import { SchedulerService } from './scheduler.service';

/**
 * The pre-generation sweep (04 §5).
 *
 * The window maths is tested exhaustively in `pregen-window.spec.ts`; this suite
 * covers what the SWEEP adds on top: the inactive-user cost guard, the
 * already-has-a-moment idempotency check, and — the one that matters
 * operationally — that one user's failure does not abort the run for everyone
 * queued behind her.
 */
describe('SchedulerService', () => {
  let service: SchedulerService;
  let enqueue: jest.Mock;
  let profiles: Record<string, unknown>[];
  let existingMoments: Record<string, unknown>[];

  /** 06:45 UTC — the firing run for a 07:00 arrival. */
  const NOW = new Date('2026-07-20T06:45:00Z');

  const profile = (overrides: Record<string, unknown> = {}) => ({
    user_id: 'user-1',
    timezone: 'UTC',
    arrival_time: '07:00',
    last_active_at: '2026-07-20T06:00:00Z',
    ...overrides,
  });

  beforeEach(async () => {
    enqueue = jest.fn().mockResolvedValue({ jobId: 'job-1', existing: false });
    profiles = [profile()];
    existingMoments = [];
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: JobsService, useValue: { enqueue } },
        {
          provide: SUPABASE_CLIENT,
          useValue: {
            from: (table: string) => {
              const builder: Record<string, unknown> = {
                select: () => builder,
                eq: () => builder,
                in: () => builder,
                limit: () => Promise.resolve({ data: existingMoments, error: null }),
                not: () => builder,
                then: (resolve: (v: unknown) => unknown) =>
                  resolve({
                    data: table === 'profiles' ? profiles : existingMoments,
                    error: null,
                  }),
              };
              return builder;
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({ PREGEN_INACTIVE_SKIP_DAYS: 7, PREGEN_BUFFER_MINUTES: 30 })[key],
          },
        },
      ],
    }).compile();

    service = moduleRef.get(SchedulerService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('enqueues a daily moment for a user inside the window', async () => {
    const result = await service.pregenerateDaily(NOW);

    expect(enqueue).toHaveBeenCalledWith('user-1', 'daily', 'daily:user-1:2026-07-20');
    expect(result).toEqual({ processed: 1, failures: 0 });
  });

  it('skips a user whose arrival is not due yet', async () => {
    profiles = [profile({ arrival_time: '19:00' })];

    await service.pregenerateDaily(NOW);

    expect(enqueue).not.toHaveBeenCalled();
  });

  it('keys the job to HER local date, not the server’s', async () => {
    // 06:45Z is still 2026-07-19 in New York, and her 07:00 arrival there is a
    // different instant entirely — so this run is not hers.
    profiles = [profile({ timezone: 'America/New_York' })];

    await service.pregenerateDaily(NOW);

    expect(enqueue).not.toHaveBeenCalled();
  });

  describe('the cost guard (00 §D3)', () => {
    it('skips a user who has not opened the app in over a week', async () => {
      profiles = [profile({ last_active_at: '2026-06-01T00:00:00Z' })];

      await service.pregenerateDaily(NOW);

      expect(enqueue).not.toHaveBeenCalled();
    });

    it('still generates for someone who opened it yesterday', async () => {
      profiles = [profile({ last_active_at: '2026-07-19T09:00:00Z' })];

      await service.pregenerateDaily(NOW);

      expect(enqueue).toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('does not generate a second moment for a date she already has', async () => {
      existingMoments = [{ id: 'moment-1' }];

      const result = await service.pregenerateDaily(NOW);

      expect(enqueue).not.toHaveBeenCalled();
      expect(result.processed).toBe(0);
    });

    it('passes an idempotency key so two racing runs collapse to one job', async () => {
      await service.pregenerateDaily(NOW);

      expect(enqueue).toHaveBeenCalledWith(
        'user-1',
        'daily',
        expect.stringContaining('daily:user-1:'),
      );
    });
  });

  describe('resilience', () => {
    it('keeps sweeping after one user fails', async () => {
      // The whole point of a sweep: user B must still wake up to her moment
      // even if user A's enqueue blew up.
      profiles = [profile({ user_id: 'user-a' }), profile({ user_id: 'user-b' })];
      enqueue.mockRejectedValueOnce(new Error('deadlock')).mockResolvedValue({ jobId: 'job-2' });

      const result = await service.pregenerateDaily(NOW);

      expect(enqueue).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ processed: 1, failures: 1 });
    });

    it('reports a profiles read failure rather than throwing out of the cron', async () => {
      const failing = new SchedulerService(
        {
          from: () => ({
            select: () => ({
              not: () => ({
                not: () => Promise.resolve({ data: null, error: { message: 'db down' } }),
              }),
            }),
          }),
        } as never,
        { enqueue } as never,
        { get: () => 7 } as never,
      );

      await expect(failing.pregenerateDaily(NOW)).resolves.toEqual({
        processed: 0,
        failures: 1,
      });
    });

    it('never logs a user id', async () => {
      const log = jest.spyOn(Logger.prototype, 'log');

      await service.pregenerateDaily(NOW);

      for (const call of log.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('user-1');
      }
    });
  });
});
