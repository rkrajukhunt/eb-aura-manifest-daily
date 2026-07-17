import type { EventName, EventPayload } from '@aura/shared';
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

import type { Env } from '../config/env.schema';

/**
 * The backend's PostHog wrapper (13 §1): server events carry the same Supabase
 * `user_id` the mobile SDK identifies with, so identity unifies automatically.
 *
 * Same compile-time privacy property as mobile: `capture` accepts only catalog
 * events from `@aura/shared`, whose payloads are enums/booleans/buckets — user
 * content cannot be passed without a type error (13 §2).
 *
 * Without POSTHOG_SERVER_KEY (local dev, CI) this is a silent no-op (16 §1).
 */
@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly client: PostHog | null;

  constructor(config: ConfigService<Env, true>) {
    const key = config.get('POSTHOG_SERVER_KEY', { infer: true });

    this.client = key ? new PostHog(key, { flushAt: 20, flushInterval: 10_000 }) : null;
    if (!this.client) this.logger.log('PostHog disabled (no POSTHOG_SERVER_KEY)');
  }

  capture<E extends EventName>(userId: string, event: E, payload: EventPayload<E>): void {
    this.client?.capture({
      distinctId: userId,
      event,
      properties: payload,
    });
  }

  async onModuleDestroy(): Promise<void> {
    // Buffered events must not die with the process on deploy.
    await this.client?.shutdown();
  }
}
