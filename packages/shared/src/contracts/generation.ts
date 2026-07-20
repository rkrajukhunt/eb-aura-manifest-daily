import { z } from 'zod';

import { LIMITS } from '../constants/limits';

/**
 * Generation endpoint contracts (07 §1). Defined once here; both apps import
 * them. All generation is async: every endpoint returns 202 with a job id, and
 * the result lands in a `moments`/`affirmations` row read via Supabase (04 §2).
 */

/** The eight artifact kinds the pipeline produces (02 §4). */
export const JOB_ARTIFACTS = [
  'letter',
  'daily',
  'ondemand',
  'refine',
  'affirmation_daily',
  'affirmation_guided',
  'milestone',
  'winback',
] as const;
export const jobArtifactSchema = z.enum(JOB_ARTIFACTS);
export type JobArtifact = z.infer<typeof jobArtifactSchema>;

export const JOB_STATUSES = [
  'queued',
  'running',
  'qa_failed',
  'retrying',
  'succeeded',
  'failed',
] as const;
export const jobStatusSchema = z.enum(JOB_STATUSES);
export type JobStatus = z.infer<typeof jobStatusSchema>;

/** `POST /v1/generation/letter` — body is empty; context is all server-side (07 §1). */
export const letterRequestSchema = z.object({}).strict();
export type LetterRequest = z.infer<typeof letterRequestSchema>;

export const jobAcceptedSchema = z.object({ jobId: z.string().uuid() });
export type JobAccepted = z.infer<typeof jobAcceptedSchema>;

/** `POST /v1/generation/moment` — on-open fallback for a missing daily (07 §1). */
export const momentRequestSchema = z.object({
  scheduledFor: z.string().date(),
});
export type MomentRequest = z.infer<typeof momentRequestSchema>;

/** `POST /v1/generation/manifest` (07 §1). */
export const manifestRequestSchema = z.object({
  desireText: z.string().min(LIMITS.DESIRE_TEXT_MIN).max(LIMITS.DESIRE_TEXT_MAX),
});
export type ManifestRequest = z.infer<typeof manifestRequestSchema>;

export const manifestAcceptedSchema = z.object({
  jobId: z.string().uuid(),
  creditsRemaining: z.number().int().nonnegative(),
});
export type ManifestAccepted = z.infer<typeof manifestAcceptedSchema>;

/** `POST /v1/generation/refine` (07 §1). */
export const REFINE_DIRECTIONS = ['more_realistic', 'softer', 'more_ambitious', 'note'] as const;
export const refineDirectionSchema = z.enum(REFINE_DIRECTIONS);
export type RefineDirection = z.infer<typeof refineDirectionSchema>;

export const refineRequestSchema = z
  .object({
    momentId: z.string().uuid(),
    direction: refineDirectionSchema,
    note: z.string().max(LIMITS.DESIRE_TEXT_MAX).optional(),
  })
  // A 'note' direction with no note is meaningless; the other directions ignore it.
  .refine((r) => r.direction !== 'note' || (r.note !== undefined && r.note.trim() !== ''), {
    message: 'note is required when direction is "note"',
    path: ['note'],
  });
export type RefineRequest = z.infer<typeof refineRequestSchema>;

/**
 * `GET /v1/generation/jobs/:id` (07). Mobile polls this at 1.5s (04 §2).
 * `momentId` appears once the job has created its row; `supportive` flags the
 * crisis-safe letter path (14 §5) so the letter is shown without the struggle theme.
 */
export const jobStatusResponseSchema = z
  .object({
    jobId: z.string().uuid(),
    status: jobStatusSchema,
    artifact: jobArtifactSchema,
    momentId: z.string().uuid().nullable(),
    supportive: z.boolean().optional(),
  })
  .passthrough();
export type JobStatusResponse = z.infer<typeof jobStatusResponseSchema>;

/** `POST /v1/generation/affirmation/daily` (07 §1) — on-open fallback, body empty. */
export const affirmationDailyRequestSchema = z.object({}).strict();

/** Guided studio inputs (product 09 §9.3): what it is for, how she wants to feel, how it should sound. */
export const AFFIRMATION_TONES = ['gentle', 'bold', 'grounded'] as const;
export const affirmationToneSchema = z.enum(AFFIRMATION_TONES);
export type AffirmationTone = z.infer<typeof affirmationToneSchema>;

export const affirmationGuidedRequestSchema = z
  .object({
    goalArea: z.string().min(1).max(60),
    goalText: z.string().max(LIMITS.DESIRE_TEXT_MAX).optional(),
    feeling: z.string().min(1).max(60),
    tone: affirmationToneSchema,
  })
  .strict();
export type AffirmationGuidedRequest = z.infer<typeof affirmationGuidedRequestSchema>;
