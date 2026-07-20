import type { RcWebhookEvent } from '@aura/shared';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AnalyticsService } from '../analytics/analytics.service';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';
import { SubscriptionsService } from './subscriptions.service';

/**
 * The mirror writer and the backend's entitlement read.
 *
 * `isPremium` is the one the guard depends on, and its subtlety is that
 * "premium" and "not expired" are two different questions: a cancelled
 * subscription is still premium until its period ends, and an expired one whose
 * webhook has not landed yet is not premium even though the row still says so.
 */
describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let upsert: jest.Mock;
  let capture: jest.Mock;
  let row: Record<string, unknown> | null;

  const event = (overrides: Partial<RcWebhookEvent> = {}): RcWebhookEvent =>
    ({
      type: 'INITIAL_PURCHASE',
      app_user_id: 'user-1',
      product_id: 'aura_premium_annual',
      period_type: 'NORMAL',
      ...overrides,
    }) as RcWebhookEvent;

  beforeEach(async () => {
    upsert = jest.fn().mockResolvedValue({ error: null });
    capture = jest.fn();
    row = null;
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: SUPABASE_CLIENT,
          useValue: {
            from: () => ({
              upsert,
              select: () => ({
                eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: null }) }),
              }),
            }),
          },
        },
        { provide: AnalyticsService, useValue: { capture } },
      ],
    }).compile();

    service = moduleRef.get(SubscriptionsService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('applyEvent', () => {
    it('upserts the mirror keyed by user', async () => {
      await service.applyEvent(event());

      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1', entitlement: 'premium' }),
        { onConflict: 'user_id' },
      );
    });

    it('emits the derived analytics event', async () => {
      await service.applyEvent(event());

      expect(capture).toHaveBeenCalledWith('user-1', 'purchase_completed', {
        sku: 'aura_premium_annual',
      });
    });

    it('emits nothing for an event with no analytics meaning', async () => {
      await service.applyEvent(event({ type: 'BILLING_ISSUE' }));

      expect(capture).not.toHaveBeenCalled();
    });

    it('drops an event it cannot attribute to a user, without writing', async () => {
      const result = await service.applyEvent(event({ app_user_id: '$RCAnonymousID:x' }));

      expect(result).toEqual({ applied: false });
      expect(upsert).not.toHaveBeenCalled();
    });

    it('throws on a database failure so RevenueCat retries it', async () => {
      // The only way to reach here is a transient DB problem, and RC's retry is
      // exactly the right recovery — losing a purchase event is not acceptable.
      upsert.mockResolvedValue({ error: { message: 'deadlock detected' } });

      await expect(service.applyEvent(event())).rejects.toThrow(/deadlock/);
    });

    it('never logs the event payload', async () => {
      const log = jest.spyOn(Logger.prototype, 'log');

      await service.applyEvent(event());

      for (const call of log.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('user-1');
      }
    });
  });

  describe('isPremium', () => {
    it('is false when she has no subscription row at all', async () => {
      row = null;

      await expect(service.isPremium('user-1')).resolves.toBe(false);
    });

    it('is false for a free row', async () => {
      row = { entitlement: 'free', expires_at: null };

      await expect(service.isPremium('user-1')).resolves.toBe(false);
    });

    it('is true for premium with a future expiry', async () => {
      row = { entitlement: 'premium', expires_at: new Date(Date.now() + 86_400_000).toISOString() };

      await expect(service.isPremium('user-1')).resolves.toBe(true);
    });

    it('is true for premium with no expiry recorded', async () => {
      row = { entitlement: 'premium', expires_at: null };

      await expect(service.isPremium('user-1')).resolves.toBe(true);
    });

    it('is true for a CANCELLED subscription that has not run out yet', async () => {
      // She turned off auto-renew but paid through the period. Revoking here
      // would take away something already bought.
      row = { entitlement: 'premium', expires_at: new Date(Date.now() + 3_600_000).toISOString() };

      await expect(service.isPremium('user-1')).resolves.toBe(true);
    });

    it('is false once the period has passed, even if the webhook has not landed', async () => {
      // Mirror lag must not hand out indefinite free premium.
      row = { entitlement: 'premium', expires_at: new Date(Date.now() - 1_000).toISOString() };

      await expect(service.isPremium('user-1')).resolves.toBe(false);
    });
  });
});
