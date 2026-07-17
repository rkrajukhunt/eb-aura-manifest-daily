import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest } from './supabase-auth.guard';

/**
 * The verified user id from the JWT `sub` (03 §3).
 *
 * This is the ONLY sanctioned way for a handler to learn who is calling. The
 * backend never accepts a client-supplied user id — a body field naming a user
 * is an impersonation bug, not a convenience.
 */
export const UserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  const userId = request.userId;

  if (!userId) {
    // Unreachable behind the guard — but if a handler is ever wired up without it,
    // fail loudly rather than silently operating on `undefined`.
    throw new Error('UserId used on a route without SupabaseAuthGuard');
  }

  return userId;
});
