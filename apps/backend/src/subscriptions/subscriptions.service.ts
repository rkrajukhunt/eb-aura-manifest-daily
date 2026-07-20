import type { RcWebhookEvent } from '@aura/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { AnalyticsService } from '../analytics/analytics.service';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';
import { deriveSubscriptionUpdate } from './rc-event';

/**
 * The RevenueCat mirror (12 §5).
 *
 * RC's SDK stays the client's truth for gating; this table is what lets the
 * BACKEND answer "is she premium" without a vendor round-trip on every request.
 * Mirror lag is tolerated by design — the client already knows.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient,
    private readonly analytics: AnalyticsService,
  ) {}

  /**
   * Applies one webhook event. Returns whether a row was written — the caller
   * answers 200 either way, since RevenueCat retries anything else and an event
   * we have decided to ignore must not be retried forever.
   */
  async applyEvent(event: RcWebhookEvent): Promise<{ applied: boolean }> {
    const { userId, mirror, analytics } = deriveSubscriptionUpdate(event);

    if (!userId) {
      // A pre-login anonymous RC id, or a TRANSFER with no destination. There is
      // no user to attribute this to; logging the shape is all we can do.
      this.logger.warn(`Ignoring ${event.type}: no resolvable Supabase user id`);
      return { applied: false };
    }

    const { error } = await this.supabase
      .from('subscription_state')
      .upsert({ user_id: userId, ...mirror }, { onConflict: 'user_id' });

    if (error) {
      // Throwing here means a non-200, which makes RevenueCat retry — correct
      // for a transient database failure, which is the only way to get here.
      throw new Error(`subscription_state upsert failed: ${error.message}`);
    }

    if (analytics) {
      this.analytics.capture(userId, analytics.event, { sku: analytics.sku } as never);
    }

    this.logger.log(`Applied ${event.type} for user (entitlement=${mirror.entitlement})`);
    return { applied: true };
  }

  /** The mirror's view of a user's entitlement. Absent row = free. */
  async isPremium(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('subscription_state')
      .select('entitlement, expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data || data.entitlement !== 'premium') return false;

    // A cancelled-but-unexpired subscription is still premium (12 §5). An
    // expired one whose EXPIRATION webhook has not landed yet is not — the
    // date is checked so mirror lag cannot hand out free premium indefinitely.
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return false;

    return true;
  }
}
