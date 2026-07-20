import { Module } from '@nestjs/common';

import { EntitlementGuard } from './entitlement.guard';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

/**
 * Subscriptions (12). The webhook writes the mirror; the guard reads it.
 *
 * `EntitlementGuard` is exported rather than registered globally: it is applied
 * per-route with `@RequiresPremium()`, because a global premium guard would mean
 * every new endpoint is paid-by-default and someone would eventually ship a free
 * feature behind a paywall by forgetting a decorator. Opt-in is the safe default
 * here, unlike auth (which is opt-out for the mirror-image reason).
 */
@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, EntitlementGuard],
  exports: [SubscriptionsService, EntitlementGuard],
})
export class SubscriptionsModule {}
