import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'aura:isPublic';

/**
 * Opts a route out of SupabaseAuthGuard.
 *
 * Use sparingly and deliberately. At V1 exactly two routes qualify:
 *   - `GET /v1/health` — the host's load balancer sends no JWT; a 401 here reads
 *     as "instance down" and pulls it from rotation (04 §7).
 *   - `POST /v1/webhooks/revenuecat` (Phase 10) — authenticated by shared secret
 *     instead, since RevenueCat has no Supabase session (04 §7).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
