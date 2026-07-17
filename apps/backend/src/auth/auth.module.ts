import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { jwksProvider } from './jwks.provider';
import { SupabaseAuthGuard } from './supabase-auth.guard';

/**
 * Auth is global and opt-OUT (via `@Public()`), not opt-in.
 *
 * Deliberate: forgetting to add a guard to a new generation endpoint would expose
 * a user's memory. Forgetting `@Public()` on a genuinely public route only breaks
 * that route loudly. The failure modes are not symmetric, so the default is deny.
 */
@Module({
  providers: [jwksProvider, { provide: APP_GUARD, useClass: SupabaseAuthGuard }],
})
export class AuthModule {}
