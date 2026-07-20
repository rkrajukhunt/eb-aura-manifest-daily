import { LIMITS } from '@aura/shared';
import { z } from 'zod';

/**
 * Environment contract (04 §6). Validated at boot — the process refuses to start
 * on a bad or missing value rather than failing later inside a user's generation.
 *
 * Limits are env-tunable with `@aura/shared` defaults (04 §86) so product 20 Q4
 * can be answered without a redeploy.
 */

const port = z.coerce.number().int().min(1).max(65535);

/** Accepts "3" from env, falls back to the shared default. */
const intWithDefault = (fallback: number) => z.coerce.number().int().positive().default(fallback);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: port.default(3000),

    // ─── Supabase ───────────────────────────────────────────────────────
    SUPABASE_URL: z.string().url(),
    /** Service role — server only, never sent to a client (00 §D10). */
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // ─── Providers (08, 10) ─────────────────────────────────────────────
    // `mock` powers local dev and CI: no network, no spend (04 §6, 15).
    LLM_PROVIDER: z.enum(['openai', 'anthropic', 'mock']).default('mock'),
    LLM_API_KEY: z.string().optional(),
    LLM_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
    /**
     * Per-tier model ids (08 §2). Pinned by the Phase 5 bake-off; the generation
     * layer maps artifact → tier → id. Defaults are placeholders the founder
     * confirms after the bake-off — kept as env so no redeploy is needed.
     */
    LLM_MODEL_FLAGSHIP: z.string().default('gpt-4.1'),
    LLM_MODEL_MID: z.string().default('gpt-4.1-mini'),
    LLM_MODEL_MINI: z.string().default('gpt-4.1-nano'),

    TTS_PROVIDER: z.enum(['elevenlabs', 'mock']).default('mock'),
    ELEVENLABS_API_KEY: z.string().optional(),
    ELEVENLABS_VOICE_ID: z.string().optional(),
    ELEVENLABS_MODEL: z.string().default('eleven_multilingual_v2'),

    // ─── Third party ────────────────────────────────────────────────────
    REVENUECAT_WEBHOOK_AUTH: z.string().optional(),
    /** Server key for subscriber deletion on account delete (03 §5 step 3). */
    REVENUECAT_SECRET_KEY: z.string().optional(),
    POSTHOG_SERVER_KEY: z.string().optional(),
    SENTRY_DSN_BACKEND: z.string().url().optional().or(z.literal('')),

    // ─── Tunable limits (04 §86) ────────────────────────────────────────
    MANIFEST_WEEKLY_LIMIT: intWithDefault(LIMITS.MANIFEST_WEEKLY_LIMIT),
    REFINE_PER_MOMENT: intWithDefault(LIMITS.REFINE_PER_MOMENT),
    PREGEN_INACTIVE_SKIP_DAYS: intWithDefault(LIMITS.PREGEN_INACTIVE_SKIP_DAYS),
    PREGEN_BUFFER_MINUTES: intWithDefault(LIMITS.PREGEN_BUFFER_MINUTES),
  })
  // A real vendor without its key would only surface as a failed generation for a
  // real user, so catch it at boot instead.
  .superRefine((env, ctx) => {
    if (env.LLM_PROVIDER !== 'mock' && !env.LLM_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['LLM_API_KEY'],
        message: `LLM_API_KEY is required when LLM_PROVIDER is "${env.LLM_PROVIDER}"`,
      });
    }
    if (env.TTS_PROVIDER !== 'mock' && !env.ELEVENLABS_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ELEVENLABS_API_KEY'],
        message: 'ELEVENLABS_API_KEY is required when TTS_PROVIDER is "elevenlabs"',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * `@nestjs/config` validate hook. Throwing here aborts boot (fail fast, 04 §6).
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    // Names only — never echo a value, since these are secrets.
    throw new Error(`Invalid environment configuration:\n${problems}\n\nSee .env.example.`);
  }

  return parsed.data;
}
