import {
  affirmationDailyRequestSchema,
  affirmationGuidedRequestSchema,
  jobAcceptedSchema,
  letterRequestSchema,
  manifestAcceptedSchema,
  manifestRequestSchema,
  momentRequestSchema,
  refineRequestSchema,
  type JobStatusResponse,
} from '@aura/shared';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Inject } from '@nestjs/common';

import { UserId } from '../auth/user-id.decorator';
import { ApiException } from '../common/api.exception';
import { CrisisDetectionService } from '../safety/crisis-detection.service';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';
import { EntitlementGuard, RequiresPremium } from '../subscriptions/entitlement.guard';
import { CreditsService } from './credits.service';
import { JobsService } from './jobs/jobs.service';

/**
 * Generation endpoints (07 §1). Every generation is async: 202 + a job id;
 * the result lands in a `moments` row read via Supabase (04 §2).
 *
 * At Phase 5 only the Letter and job-polling are live — the moment/manifest/
 * (Phases 7/8 filled in moment/refine/manifest/affirmation; the original note
 * honest; a 501 stub would imply they are coming through this same controller,
 * which is not decided). The Letter is what Phase 6 needs.
 */
@Controller({ path: 'generation', version: '1' })
export class GenerationController {
  constructor(
    private readonly jobs: JobsService,
    private readonly credits: CreditsService,
    private readonly crisis: CrisisDetectionService,
    @Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient,
  ) {}

  /**
   * `POST /v1/generation/letter` (07 §1). One letter per user — a replayed
   * request returns the existing job rather than a second letter.
   */
  @Post('letter')
  @HttpCode(HttpStatus.ACCEPTED)
  async letter(
    @UserId() userId: string,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    letterRequestSchema.parse(body ?? {});

    // One letter per user (07 §1): if one already exists, return its job.
    const existingLetter = await this.findExistingLetterJob(userId);
    if (existingLetter) return jobAcceptedSchema.parse({ jobId: existingLetter });

    const { jobId } = await this.jobs.enqueue(userId, 'letter', idempotencyKey);
    return jobAcceptedSchema.parse({ jobId });
  }

  /**
   * `POST /v1/generation/moment` (07 §1) — the ON-OPEN FALLBACK.
   *
   * The primary path is the `pregenerate-daily` cron (04 §5). This exists so a
   * cron failure costs her a few seconds of "still forming" rather than a
   * missing morning — which is why it is free and ungated: the daily moment is
   * the free tier's whole substance (product 15).
   */
  @Post('moment')
  @HttpCode(HttpStatus.ACCEPTED)
  async moment(@UserId() userId: string, @Body() body: unknown) {
    const { scheduledFor } = momentRequestSchema.parse(body ?? {});

    // 409 rather than a second generation: two moments for one morning is both
    // a cost leak and a confusing Home.
    if (await this.hasMomentFor(userId, scheduledFor)) {
      throw new ApiException('already_ready', `A moment already exists for ${scheduledFor}`);
    }

    const { jobId } = await this.jobs.enqueue(userId, 'daily', `daily:${userId}:${scheduledFor}`);
    return jobAcceptedSchema.parse({ jobId });
  }

  /**
   * `POST /v1/generation/refine` (07 §1). Premium, one per moment.
   *
   * Ungated by credits on purpose — refine is capped by LINEAGE, not by the
   * weekly allowance, so reshaping a moment never competes with asking for a
   * new one.
   */
  @Post('refine')
  @RequiresPremium()
  @UseGuards(EntitlementGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async refine(@UserId() userId: string, @Body() body: unknown) {
    const { momentId, direction, note } = refineRequestSchema.parse(body ?? {});

    const { data: moment } = await this.supabase
      .from('moments')
      .select('id, body, user_id')
      .eq('id', momentId)
      .maybeSingle();

    // Scoped explicitly: the service-role client bypasses RLS (03 §3).
    if (!moment || moment.user_id !== userId) throw new NotFoundException();

    if (!(await this.credits.canRefine(momentId))) {
      throw new ApiException('refine_limit_reached', 'This moment has already been refined');
    }

    // Her note is free text and reaches the model, so it runs the same crisis
    // screen the letter path does (14 §5). A refine is not worth a missed
    // disclosure.
    if (note && (await this.crisis.screen(note)).isCrisis) {
      throw new ApiException('crisis_support', 'Crisis content detected in refine note');
    }

    const { jobId } = await this.jobs.enqueue(userId, 'refine', undefined, {
      refine: { momentId, previousBody: moment.body ?? '', direction, ...(note ? { note } : {}) },
    });

    return jobAcceptedSchema.parse({ jobId });
  }

  /**
   * `POST /v1/generation/manifest` (07 §1). Premium + credit-gated.
   *
   * The credit is reserved BEFORE generation and refunded on every failure
   * path, because product 09 §9.2 promises "Error: retry, credit not consumed".
   * The crisis branch below is the sharpest case: she typed something that
   * needs support, and charging her for it would be indefensible.
   */
  @Post('manifest')
  @RequiresPremium()
  @UseGuards(EntitlementGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async manifest(@UserId() userId: string, @Body() body: unknown) {
    const { desireText } = manifestRequestSchema.parse(body ?? {});

    // Screened BEFORE the credit is touched, so the support path costs nothing.
    if ((await this.crisis.screen(desireText)).isCrisis) {
      throw new ApiException('crisis_support', 'Crisis content detected in desire text');
    }

    const spend = await this.credits.spend(userId);
    if (!spend.allowed) {
      throw new ApiException('credits_exhausted', 'Weekly manifest limit reached', {
        remaining: 0,
        limit: spend.limit,
      });
    }

    try {
      const { jobId } = await this.jobs.enqueue(userId, 'ondemand', undefined, {
        desire: desireText,
      });
      return manifestAcceptedSchema.parse({ jobId, creditsRemaining: spend.remaining });
    } catch (error) {
      // Enqueue failed, so nothing will ever generate — give the credit back.
      await this.credits.refund(userId);
      throw error;
    }
  }

  /**
   * `POST /v1/generation/affirmation/daily` (07 §1) — on-open fallback.
   *
   * Free and ungated, like the daily moment: one affirmation a day is part of
   * the free tier's actual substance (product 15 §free tier), not a teaser.
   */
  @Post('affirmation/daily')
  @HttpCode(HttpStatus.ACCEPTED)
  async affirmationDaily(@UserId() userId: string, @Body() body: unknown) {
    affirmationDailyRequestSchema.parse(body ?? {});

    const today = new Date().toISOString().slice(0, 10);
    const { jobId } = await this.jobs.enqueue(
      userId,
      'affirmation_daily',
      `affirmation:${userId}:${today}`,
    );

    return jobAcceptedSchema.parse({ jobId });
  }

  /**
   * `POST /v1/generation/affirmation/guided` (07 §1, product 09 §9.3b).
   *
   * Yields three candidates for her to choose between, which is why the flow is
   * capped at one generation per pass: three candidates is three times the cost.
   */
  @Post('affirmation/guided')
  @HttpCode(HttpStatus.ACCEPTED)
  async affirmationGuided(@UserId() userId: string, @Body() body: unknown) {
    const input = affirmationGuidedRequestSchema.parse(body ?? {});

    // Her free-text goal reaches the model, so it screens like any other free
    // text she writes (14 §5).
    if (input.goalText && (await this.crisis.screen(input.goalText)).isCrisis) {
      throw new ApiException('crisis_support', 'Crisis content detected in goal text');
    }

    const { jobId } = await this.jobs.enqueue(userId, 'affirmation_guided', undefined, {
      guided: input,
    });

    return jobAcceptedSchema.parse({ jobId });
  }

  /** `GET /v1/generation/jobs/:id` (07). Mobile polls this at 1.5s (04 §2). */
  @Get('jobs/:id')
  async job(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) jobId: string,
  ): Promise<JobStatusResponse> {
    const { data } = await this.supabase
      .from('generation_jobs')
      .select('id, user_id, artifact, status, moment_id')
      .eq('id', jobId)
      .single();

    // Scope to the caller even though RLS would filter it — the service-role
    // client bypasses RLS, so the check is explicit here (03 §3).
    if (!data || data.user_id !== userId) throw new NotFoundException();

    let supportive: boolean | undefined;
    if (data.moment_id) {
      const { data: moment } = await this.supabase
        .from('moments')
        .select('qa_report')
        .eq('id', data.moment_id)
        .single();
      const report = moment?.qa_report as { supportive?: boolean } | null;
      if (report?.supportive) supportive = true;
    }

    return {
      jobId: data.id,
      status: data.status,
      artifact: data.artifact,
      momentId: data.moment_id,
      ...(supportive ? { supportive } : {}),
    };
  }

  /** Does she already have a moment for this local date? */
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

  private async findExistingLetterJob(userId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('generation_jobs')
      .select('id')
      .eq('user_id', userId)
      .eq('artifact', 'letter')
      .not('status', 'in', '(failed,qa_failed)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.id ?? null;
  }
}
