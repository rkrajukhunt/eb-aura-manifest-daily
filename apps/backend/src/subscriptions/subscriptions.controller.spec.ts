import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

/**
 * The webhook's front door.
 *
 * This endpoint is `@Public()`, so the shared-secret check is the ONLY thing
 * between the open internet and a row that says "premium". The fail-closed test
 * below is the one that matters most: an environment that forgot to configure
 * the secret must reject everything rather than accept everything.
 */
describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let applyEvent: jest.Mock;
  let secret: string | undefined;

  const body = (type = 'INITIAL_PURCHASE') => ({
    api_version: '1.0',
    event: { type, app_user_id: 'user-1', product_id: 'aura_premium_annual' },
  });

  beforeEach(async () => {
    applyEvent = jest.fn().mockResolvedValue({ applied: true });
    secret = 'shared-secret';
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const moduleRef = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        { provide: SubscriptionsService, useValue: { applyEvent } },
        { provide: ConfigService, useValue: { get: () => secret } },
      ],
    }).compile();

    controller = moduleRef.get(SubscriptionsController);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('authorization', () => {
    it('accepts the configured shared secret', async () => {
      await expect(controller.revenuecat(body(), 'shared-secret')).resolves.toEqual({
        received: true,
      });
    });

    it('rejects a wrong secret', async () => {
      await expect(controller.revenuecat(body(), 'wrong')).rejects.toThrow(UnauthorizedException);
      expect(applyEvent).not.toHaveBeenCalled();
    });

    it('rejects a missing header', async () => {
      await expect(controller.revenuecat(body(), undefined)).rejects.toThrow(UnauthorizedException);
    });

    it('FAILS CLOSED when the secret is not configured at all', async () => {
      // A misconfigured environment must not become an open endpoint that grants
      // premium to anyone who can POST.
      secret = undefined;

      await expect(controller.revenuecat(body(), 'anything')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(applyEvent).not.toHaveBeenCalled();
    });

    it('checks the secret before it parses anything', async () => {
      await expect(controller.revenuecat('not even json', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('processing', () => {
    it('applies a well-formed event', async () => {
      await controller.revenuecat(body('RENEWAL'), 'shared-secret');

      expect(applyEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'RENEWAL' }));
    });

    it('acknowledges an unknown event type with 200 rather than a retry storm', async () => {
      // RevenueCat retries every non-200. A type we do not handle would otherwise
      // be redelivered forever.
      await expect(
        controller.revenuecat(body('SOME_NEW_EVENT_TYPE'), 'shared-secret'),
      ).resolves.toEqual({ received: true });
      expect(applyEvent).not.toHaveBeenCalled();
    });

    it('acknowledges a malformed body without applying it', async () => {
      await expect(controller.revenuecat({ nonsense: true }, 'shared-secret')).resolves.toEqual({
        received: true,
      });
      expect(applyEvent).not.toHaveBeenCalled();
    });

    it('lets a processing failure surface, so RevenueCat retries', async () => {
      applyEvent.mockRejectedValue(new Error('deadlock detected'));

      await expect(controller.revenuecat(body(), 'shared-secret')).rejects.toThrow(/deadlock/);
    });

    it('tolerates the extra fields RevenueCat adds over time', async () => {
      const withExtras = {
        api_version: '1.0',
        event: {
          type: 'INITIAL_PURCHASE',
          app_user_id: 'user-1',
          some_future_field: 'whatever',
          nested: { also: 'fine' },
        },
      };

      await expect(controller.revenuecat(withExtras, 'shared-secret')).resolves.toEqual({
        received: true,
      });
      expect(applyEvent).toHaveBeenCalled();
    });
  });
});
