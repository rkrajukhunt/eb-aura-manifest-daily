import { z } from 'zod';

/**
 * Stable machine keys (07 §5). Mobile maps `key → in-voice copy` (product 14);
 * `message` is developer-facing only and is never shown to a user.
 */
export const API_ERROR_KEYS = [
  'unauthorized',
  'entitlement_required',
  'credits_exhausted',
  'refine_limit_reached',
  'already_ready',
  'crisis_support',
  'validation_failed',
  'rate_limited',
  'generation_failed',
  'internal',
] as const;

export const apiErrorKeySchema = z.enum(API_ERROR_KEYS);
export type ApiErrorKey = z.infer<typeof apiErrorKeySchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    key: apiErrorKeySchema,
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

/** HTTP status per error key (07 §5). */
export const API_ERROR_STATUS: Record<ApiErrorKey, number> = {
  validation_failed: 400,
  unauthorized: 401,
  entitlement_required: 402,
  already_ready: 409,
  crisis_support: 422,
  rate_limited: 429,
  credits_exhausted: 429,
  refine_limit_reached: 429,
  generation_failed: 500,
  internal: 500,
};
