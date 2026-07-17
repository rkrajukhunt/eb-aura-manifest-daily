import { z } from 'zod';

/**
 * Public mobile env (01 §6). These ship inside the bundle and are public by
 * design — RLS is the security boundary, not the anon key (00 §D10).
 *
 * `process.env.EXPO_PUBLIC_*` is inlined by Metro at build time, so each var must
 * be referenced by its full literal name. Destructuring `process.env` does not work.
 */
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_POSTHOG_KEY: z.string().optional(),
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
});

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
  // Fail loudly at startup rather than with a confusing network error later.
  throw new Error(
    `Missing/invalid Expo env: ${missing}. Copy .env.example → apps/mobile/.env.local`,
  );
}

export const env = parsed.data;
