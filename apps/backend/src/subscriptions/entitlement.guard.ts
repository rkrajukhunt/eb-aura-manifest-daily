import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApiException } from '../common/api.exception';
import { SubscriptionsService } from './subscriptions.service';

export const REQUIRES_PREMIUM_KEY = 'aura:requiresPremium';

/**
 * Marks a route as premium-only (12 §4).
 *
 * The client already hides these features behind `useEntitlement`, and that is
 * UX, not security — a client can be modified and a request can be replayed. So
 * every premium endpoint carries this too: **client gating is UX, server gating
 * is truth** (12 §4).
 */
export const RequiresPremium = () => SetMetadata(REQUIRES_PREMIUM_KEY, true);

/**
 * Rejects a free user from a premium route with `entitlement_required` (402,
 * 07 §5), which mobile maps to the locked-feature sheet rather than an error.
 *
 * Reads the MIRROR, not RevenueCat: a vendor round-trip on every request would
 * put a third-party's uptime inside our request path. Mirror lag means a user
 * can briefly be premium on device and free here — the webhook closes that
 * within seconds, and the failure mode is one retryable 402 rather than a
 * generation charged to someone who did not pay.
 */
@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresPremium = this.reflector.getAllAndOverride<boolean>(REQUIRES_PREMIUM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresPremium) return true;

    const request = context.switchToHttp().getRequest<{ userId?: string }>();
    const userId = request.userId;

    // The auth guard runs first and populates `userId`; its absence here means
    // the route is misconfigured rather than that the user is free.
    if (!userId) throw new ApiException('unauthorized', 'No authenticated user on request');

    if (!(await this.subscriptions.isPremium(userId))) {
      throw new ApiException('entitlement_required', 'Premium entitlement required');
    }

    return true;
  }
}
