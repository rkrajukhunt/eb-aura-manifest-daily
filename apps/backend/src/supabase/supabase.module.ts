import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Database } from '@aura/shared';
import type { Env } from '../config/env.schema';

/** DI token for the service-role client. */
export const SUPABASE_CLIENT = Symbol('SupabaseClient');

export type ServiceRoleClient = SupabaseClient<Database>;

/**
 * The single injection point for the service-role client (04 §1).
 *
 * This client BYPASSES RLS. That is the whole reason it exists — the generation
 * pipeline writes rows on a user's behalf — and also why it must never be handed
 * a user-supplied id. Every user-scoped query passes the id verified by
 * SupabaseAuthGuard from the JWT `sub`, never a value from a request body (03 §3).
 */
@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): ServiceRoleClient =>
        createClient<Database>(
          config.get('SUPABASE_URL', { infer: true }),
          config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true }),
          {
            // The backend is stateless and per-request; persisting or refreshing a
            // session would be meaningless here and is a footgun under concurrency.
            auth: { persistSession: false, autoRefreshToken: false },
          },
        ),
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
