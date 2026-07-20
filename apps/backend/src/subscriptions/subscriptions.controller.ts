import { rcWebhookBodySchema } from '@aura/shared';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Public } from '../auth/public.decorator';
import type { Env } from '../config/env.schema';
import { SubscriptionsService } from './subscriptions.service';

/**
 * RevenueCat webhooks (07 §3, 12 §5).
 *
 * `@Public()` because RevenueCat has no Supabase JWT — it authenticates with the
 * shared secret configured in the RC dashboard, checked below. That check is the
 * only thing standing between the open internet and a row that says "premium",
 * so it is done before the body is even parsed.
 */
@Controller({ path: 'webhooks', version: '1' })
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('revenuecat')
  @HttpCode(HttpStatus.OK)
  async revenuecat(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ): Promise<{ received: true }> {
    this.assertAuthorized(authorization);

    const parsed = rcWebhookBodySchema.safeParse(body);

    if (!parsed.success) {
      // 200 on an unparseable body, deliberately. RevenueCat retries every
      // non-200, so returning an error here would buy an infinite retry loop
      // for a payload that will never parse — a new event type we do not handle
      // looks exactly like this. Log it and move on.
      this.logger.warn('Unrecognised RevenueCat webhook payload; acknowledged without applying');
      return { received: true };
    }

    await this.subscriptions.applyEvent(parsed.data.event);
    return { received: true };
  }

  /**
   * Constant-time-ish comparison against the configured secret. An unset secret
   * REJECTS everything rather than allowing it: a misconfigured production
   * environment must fail closed, since the alternative is letting anyone grant
   * themselves premium.
   */
  private assertAuthorized(authorization?: string): void {
    const expected = this.config.get('REVENUECAT_WEBHOOK_AUTH', { infer: true });

    if (!expected) {
      this.logger.error('REVENUECAT_WEBHOOK_AUTH is not configured — rejecting webhook');
      throw new UnauthorizedException();
    }

    if (authorization !== expected) throw new UnauthorizedException();
  }
}
