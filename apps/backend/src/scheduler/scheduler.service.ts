import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import type { Env } from '../config/env.schema';
import { JobsService } from '../generation/jobs/jobs.service';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';
import { isActiveEnough, isDueForPregeneration, localDateString } from './pregen-window';

/**
 * The scheduler (04 §5). Crons run in-process because the instance count is one;
 * the documented upgrade path moves them to a dedicated worker if we scale out
 * (04 §7).
 *
 * `pregenerate-daily` is the one that matters at Phase 7: it writes tomorrow
 * morning's moment half an hour early so that tapping play is a cache read, not
 * a 20-second generation (product 13's <300ms budget).
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient,
    private readonly jobs: JobsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Every 15 minutes: enqueue daily moments for users whose local arrival time
   * is coming up (04 §5).
   *
   * Idempotent by construction — a user who already has a moment for her local
   * date is skipped, which is also what makes the repeated DST fall-back hour
   * safe (see `pregen-window.spec.ts`).
   */
  // Every 15 minutes, and that MUST match `WINDOW_WIDTH_MINUTES`. The window is
  // 15 minutes wide, so a 30-minute cron would sample it every other time and
  // silently skip half of all users — a bug with no error and no log line,
  // visible only as "some people never get a moment".
  @Cron('*/15 * * * *')
  async pregenerateDaily(now: Date = new Date()): Promise<{ processed: number; failures: number }> {
    const skipAfterDays = this.config.get('PREGEN_INACTIVE_SKIP_DAYS', { infer: true });
    const leadMinutes = this.config.get('PREGEN_BUFFER_MINUTES', { infer: true });

    const { data: candidates, error } = await this.supabase
      .from('profiles')
      .select('user_id, timezone, arrival_time, last_active_at')
      .not('arrival_time', 'is', null)
      .not('onboarding_completed_at', 'is', null);

    if (error) {
      this.logger.error(`pregenerate-daily could not read profiles: ${error.message}`);
      return { processed: 0, failures: 1 };
    }

    let processed = 0;
    let failures = 0;

    for (const candidate of candidates ?? []) {
      const timezone = candidate.timezone ?? 'UTC';

      const due = isDueForPregeneration(
        { timezone, arrivalTime: candidate.arrival_time },
        now,
        leadMinutes,
      );
      if (!due) continue;

      // Cost guard: most of the LLM+TTS bill scales with ACTIVE users, and a
      // moment generated for someone who stopped opening the app months ago is
      // money spent on nobody (00 §D3).
      if (!isActiveEnough(candidate.last_active_at, now, skipAfterDays)) continue;

      const scheduledFor = localDateString(timezone, now);

      try {
        if (await this.hasMomentFor(candidate.user_id, scheduledFor)) continue;

        // The idempotency key is the second guard, below the row check: two cron
        // runs racing on the same local date resolve to one job (04 §3).
        await this.jobs.enqueue(
          candidate.user_id,
          'daily',
          `daily:${candidate.user_id}:${scheduledFor}`,
        );

        // Her affirmation is generated in the same sweep (04 §5, Phase 8) so
        // both beats of the morning are waiting before she opens the app. It is
        // a separate job: an affirmation failing must not cost her the moment.
        await this.jobs.enqueue(
          candidate.user_id,
          'affirmation_daily',
          `affirmation:${candidate.user_id}:${scheduledFor}`,
        );

        processed += 1;
      } catch (failure) {
        // One user's failure must not abort the sweep for everyone after her.
        failures += 1;
        this.logger.error(
          `pregenerate-daily failed for one user: ${failure instanceof Error ? failure.name : 'unknown'}`,
        );
      }
    }

    // Logged for the generation-quality dashboard (04 §5, 13 §6).
    this.logger.log(`pregenerate-daily: processed=${processed} failures=${failures}`);
    return { processed, failures };
  }

  private async hasMomentFor(userId: string, scheduledFor: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('moments')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'daily')
      .eq('scheduled_for', scheduledFor)
      .in('status', ['generating', 'ready'])
      .limit(1);

    return (data?.length ?? 0) > 0;
  }
}
