import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import type { Env } from '../config/env.schema';
import { AnalyticsService } from '../analytics/analytics.service';
import { JobsService } from '../generation/jobs/jobs.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  arrivalDedupeKey,
  isMilestoneDue,
  isWinbackDue,
  maySendArrival,
  recordIgnored,
} from '../notifications/policy';
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
    private readonly notifications: NotificationsService,
    private readonly analytics: AnalyticsService,
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

  /**
   * Sends the arrival note for moments that finished generating (11 §3).
   *
   * Runs AFTER pre-generation rather than inside it, because a notification may
   * only go out once there is real content behind it (11 §7) — notifying about
   * a generation that then failed would be the one unrecoverable version of
   * this feature getting it wrong.
   */
  @Cron('*/15 * * * *')
  async sendArrivals(now: Date = new Date()): Promise<{ sent: number }> {
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('user_id, timezone, arrival_time, name')
      .not('arrival_time', 'is', null);

    let sent = 0;

    for (const profile of profiles ?? []) {
      const timezone = profile.timezone ?? 'UTC';

      // The note lands AT her arrival time, so the window is the arrival itself
      // rather than the 30-minute lead the generation used.
      if (!isDueForPregeneration({ timezone, arrivalTime: profile.arrival_time }, now, 15)) {
        continue;
      }

      const scheduledFor = localDateString(timezone, now);

      const { data: moment } = await this.supabase
        .from('moments')
        .select('id, title')
        .eq('user_id', profile.user_id)
        .eq('type', 'daily')
        .eq('scheduled_for', scheduledFor)
        .eq('status', 'ready')
        .limit(1)
        .maybeSingle();

      // Nothing ready: stay silent and let the on-open fallback handle it.
      if (!moment) continue;

      // Prefs are read at SEND time so a preference changed since the cron
      // queued anything still wins (11 §4).
      const prefs = await this.notifications.prefsFor(profile.user_id);
      const localWeekday = new Date(`${scheduledFor}T12:00:00Z`).getUTCDay();
      if (!maySendArrival(prefs, prefs, localWeekday)) continue;

      const result = await this.notifications.send({
        userId: profile.user_id,
        kind: 'moment_arrival',
        dedupeKey: arrivalDedupeKey(scheduledFor),
        momentId: moment.id,
        input: { name: profile.name, momentTitle: moment.title, momentId: moment.id },
      });

      if (result.sent) sent += 1;
    }

    this.logger.log(`send-arrivals: sent=${sent}`);
    return { sent };
  }

  /**
   * D7 milestone letters (04 §5, 11 §3).
   *
   * Daily rather than every 15 minutes: a milestone is a day-level event, and
   * the letter arrives full-screen on next open regardless of when the push
   * lands.
   */
  @Cron('0 * * * *')
  async milestoneLetters(now: Date = new Date()): Promise<{ enqueued: number }> {
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('user_id, created_at')
      .not('onboarding_completed_at', 'is', null);

    let enqueued = 0;

    for (const profile of profiles ?? []) {
      const day = isMilestoneDue(profile.created_at, now);
      if (day === null) continue;

      try {
        // The idempotency key carries the day, so the hourly sweep enqueues one
        // milestone per user per milestone day however often it runs.
        await this.jobs.enqueue(
          profile.user_id,
          'milestone',
          `milestone:${profile.user_id}:d${day}`,
        );
        enqueued += 1;

        // A milestone letter that is written and never announced is the whole
        // point of the feature missed. The push only goes out once the letter
        // is actually `ready` (11 §7), which is why this is a separate lookup
        // rather than a send fired alongside the enqueue.
        const { data: letter } = await this.supabase
          .from('moments')
          .select('id, title')
          .eq('user_id', profile.user_id)
          .eq('type', 'milestone')
          .eq('status', 'ready')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (letter) {
          const { data: named } = await this.supabase
            .from('profiles')
            .select('name')
            .eq('user_id', profile.user_id)
            .maybeSingle();

          await this.notifications.send({
            userId: profile.user_id,
            kind: 'milestone',
            dedupeKey: `d${day}`,
            momentId: letter.id,
            input: { name: named?.name ?? null, momentId: letter.id, milestoneDay: day },
          });
        }
      } catch {
        // One user's failure must not abort the sweep.
      }
    }

    if (enqueued > 0) this.logger.log(`milestone-letters: enqueued=${enqueued}`);
    return { enqueued };
  }

  /**
   * `soften-notifications` (04 §5, 11 §5).
   *
   * The half of auto-soften the app cannot do. Mobile reports an OPEN and resets
   * the counter; only the server can see a send that was never opened. Without
   * this sweep `recordIgnored` had no caller at all, so `softened` could never
   * become true and the whole respect-over-re-engagement behaviour was inert.
   *
   * Softening is silent — nothing here notifies her, and no copy anywhere names
   * the absence it is reacting to (11 §5).
   */
  @Cron('0 4 * * *')
  async softenNotifications(now: Date = new Date()): Promise<{ softened: number }> {
    const cutoff = new Date(now.getTime() - 36 * 3_600_000).toISOString();

    // Arrival sends old enough that an open would already have happened.
    const { data: sends } = await this.supabase
      .from('notification_sends')
      .select('user_id, opened_at')
      .eq('kind', 'moment_arrival')
      .lt('sent_at', cutoff)
      .is('opened_at', null);

    const ignoredBy = new Map<string, number>();
    for (const send of sends ?? []) {
      ignoredBy.set(send.user_id, (ignoredBy.get(send.user_id) ?? 0) + 1);
    }

    let softened = 0;

    for (const [userId] of ignoredBy) {
      const prefs = await this.notifications.prefsFor(userId);
      // Already softened: nothing further to do. The count stops mattering
      // once the cadence has dropped, and letting it climb forever would only
      // make the eventual reset look like a bigger forgiveness than it is.
      if (prefs.softened) continue;

      const next = recordIgnored(prefs);

      await this.supabase.from('notification_prefs').upsert(
        {
          user_id: userId,
          ignored_arrival_count: next.ignoredArrivalCount,
          softened: next.softened,
        },
        { onConflict: 'user_id' },
      );

      if (next.softened) {
        softened += 1;
        this.analytics.capture(userId, 'notification_softened', {});
      }
    }

    if (softened > 0) this.logger.log(`soften-notifications: softened=${softened}`);
    return { softened };
  }

  /**
   * `trial-reminder` (04 §5, 12 §6) — anti-resentment checklist #3.
   *
   * "Trial terms restated at the moment of confirmation; reminder notification
   * day 5 of any trial." This is the half of #3 that is not on the paywall, and
   * it is the half that decides whether a trial converting feels like a choice
   * or an ambush. The copy says both keeping and cancelling are fine, because
   * they are.
   */
  @Cron('0 6 * * *')
  async trialReminders(now: Date = new Date()): Promise<{ sent: number }> {
    const { data: trials } = await this.supabase
      .from('subscription_state')
      .select('user_id, expires_at, period_type')
      .eq('period_type', 'trial')
      .eq('entitlement', 'premium');

    let sent = 0;

    for (const trial of trials ?? []) {
      if (!trial.expires_at) continue;

      const daysLeft = Math.floor(
        (new Date(trial.expires_at).getTime() - now.getTime()) / 86_400_000,
      );
      // Two days out — "converts in 2 days" has to be true when she reads it.
      if (daysLeft !== 2) continue;

      const { data: profile } = await this.supabase
        .from('profiles')
        .select('name')
        .eq('user_id', trial.user_id)
        .maybeSingle();

      const result = await this.notifications.send({
        userId: trial.user_id,
        kind: 'trial_reminder',
        // One per trial, keyed to its end date.
        dedupeKey: `trial:${trial.expires_at}`,
        input: { name: profile?.name ?? null },
      });

      if (result.sent) sent += 1;
    }

    if (sent > 0) this.logger.log(`trial-reminder: sent=${sent}`);
    return { sent };
  }

  /**
   * `winback-note` (04 §5, 11 §3) — lapse +3 days, once, never repeating.
   *
   * References her dream area only; the copy never mentions that she left
   * (product 16). The send log's unique key is what makes "once" structural
   * rather than a flag someone has to remember to set.
   */
  @Cron('0 5 * * *')
  async winbackNotes(now: Date = new Date()): Promise<{ sent: number }> {
    const { data: lapsed } = await this.supabase
      .from('subscription_state')
      .select('user_id, lapsed_at')
      .not('lapsed_at', 'is', null);

    let sent = 0;

    for (const row of lapsed ?? []) {
      if (!isWinbackDue(row.lapsed_at, now, false)) continue;

      const { data: moment } = await this.supabase
        .from('moments')
        .select('id, title')
        .eq('user_id', row.user_id)
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Never notify about nothing (11 §7).
      if (!moment) continue;

      const { data: profile } = await this.supabase
        .from('profiles')
        .select('name')
        .eq('user_id', row.user_id)
        .maybeSingle();

      const result = await this.notifications.send({
        userId: row.user_id,
        kind: 'winback',
        // Keyed to the lapse, so it can only ever fire once for that lapse.
        dedupeKey: `lapse:${row.lapsed_at}`,
        momentId: moment.id,
        input: { name: profile?.name ?? null, momentTitle: moment.title, momentId: moment.id },
      });

      if (result.sent) sent += 1;
    }

    if (sent > 0) this.logger.log(`winback-note: sent=${sent}`);
    return { sent };
  }

  /**
   * `anon-sweep` (04 §5, 03 §2.3) — anonymous users inactive >90 days.
   *
   * A hard delete, cascading through every table. An anonymous account has no
   * credential to recover with (03 §2.1), so a dormant one is not a user we can
   * ever reach again — keeping her data forever would be hoarding, and product
   * 18's "delete means delete" cuts both ways.
   */
  @Cron('0 3 * * 0')
  async anonSweep(now: Date = new Date()): Promise<{ deleted: number }> {
    const cutoff = new Date(now.getTime() - 90 * 86_400_000).toISOString();

    const { data: dormant } = await this.supabase
      .from('profiles')
      .select('user_id')
      .eq('is_anonymous', true)
      .lt('last_active_at', cutoff);

    let deleted = 0;

    for (const profile of dormant ?? []) {
      try {
        await this.supabase.auth.admin.deleteUser(profile.user_id);
        deleted += 1;
      } catch {
        // One failure must not abort the sweep.
      }
    }

    if (deleted > 0) this.logger.log(`anon-sweep: deleted=${deleted}`);
    return { deleted };
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
