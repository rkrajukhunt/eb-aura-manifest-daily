import { jobAcceptedSchema, letterRequestSchema, type JobStatusResponse } from '@aura/shared';
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
} from '@nestjs/common';

import { Inject } from '@nestjs/common';

import { UserId } from '../auth/user-id.decorator';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';
import { JobsService } from './jobs/jobs.service';

/**
 * Generation endpoints (07 §1). Every generation is async: 202 + a job id;
 * the result lands in a `moments` row read via Supabase (04 §2).
 *
 * At Phase 5 only the Letter and job-polling are live — the moment/manifest/
 * refine/affirmation routes belong to Phases 7/8 and are absent (a 404 is
 * honest; a 501 stub would imply they are coming through this same controller,
 * which is not decided). The Letter is what Phase 6 needs.
 */
@Controller({ path: 'generation', version: '1' })
export class GenerationController {
  constructor(
    private readonly jobs: JobsService,
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
