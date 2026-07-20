import { Inject, Injectable, Logger } from '@nestjs/common';

import { AnalyticsService } from '../analytics/analytics.service';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';
import { buildNotification, type NotificationKind, type TemplateInput } from './templates';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface SendRequest {
  userId: string;
  kind: NotificationKind;
  /** Idempotency within a kind — her local date, or a moment id (11 §6). */
  dedupeKey: string;
  input: TemplateInput;
  momentId?: string;
}

/**
 * Push delivery (11 §1).
 *
 * Every send originates HERE, never from the app: the content is not known
 * ahead of time and the arrival time is server-driven, so a client-scheduled
 * local notification could only ever be a guess (11 §1, "Exception: none").
 *
 * Three rules shape the method below:
 *   1. **Never notify about nothing.** A failed pre-generation produces no push
 *      (11 §7) — the template returns null and this returns early.
 *   2. **One per dedupe key.** The unique index on `notification_sends` makes a
 *      double delivery impossible rather than unlikely (11 §6).
 *   3. **Prefs are read at SEND time**, not schedule time (11 §4), so a
 *      preference changed after the cron queued something still wins.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient,
    private readonly analytics: AnalyticsService,
  ) {}

  async send(request: SendRequest): Promise<{ sent: boolean; reason?: string }> {
    const content = buildNotification(request.kind, request.input);

    // No content, no notification (11 §7).
    if (!content) return { sent: false, reason: 'no_content' };

    // Claim the send FIRST. Inserting before delivering means a crash mid-send
    // costs one missed note rather than a duplicate one — and a duplicate is
    // the worse failure on a surface that arrives uninvited.
    const { error: claimError } = await this.supabase.from('notification_sends').insert({
      user_id: request.userId,
      kind: request.kind,
      dedupe_key: request.dedupeKey,
      ...(request.momentId ? { moment_id: request.momentId } : {}),
    });

    // A unique violation means it already went out; that is success, not failure.
    if (claimError) return { sent: false, reason: 'already_sent' };

    const { data: tokens } = await this.supabase
      .from('notification_tokens')
      .select('expo_push_token')
      .eq('user_id', request.userId)
      .eq('active', true);

    if (!tokens?.length) return { sent: false, reason: 'no_tokens' };

    // Multi-device: every active token gets it (11 §6).
    const messages = tokens.map((token) => ({
      to: token.expo_push_token,
      title: content.title,
      body: content.body,
      data: { ...content.data, url: content.url },
      sound: 'default',
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });

      const result = (await response.json()) as {
        data?: { status: string; details?: { error?: string } }[];
      };
      await this.retireDeadTokens(
        tokens.map((t) => t.expo_push_token),
        result.data ?? [],
      );
    } catch (error) {
      this.logger.error(`Push send failed (${error instanceof Error ? error.name : 'unknown'})`);
      return { sent: false, reason: 'transport_error' };
    }

    if (request.kind === 'moment_arrival') {
      this.analytics.capture(request.userId, 'moment_arrival_notification_sent', {});
    }

    return { sent: true };
  }

  /**
   * `DeviceNotRegistered` means the app is gone from that device (11 §1).
   *
   * The row is deactivated rather than deleted so a reinstall on the same
   * device is recognised instead of quietly accumulating duplicate tokens.
   */
  private async retireDeadTokens(
    tokens: string[],
    receipts: { status: string; details?: { error?: string } }[],
  ): Promise<void> {
    const dead = tokens.filter(
      (_, index) =>
        receipts[index]?.status === 'error' &&
        receipts[index]?.details?.error === 'DeviceNotRegistered',
    );

    if (dead.length === 0) return;

    await this.supabase
      .from('notification_tokens')
      .update({ active: false })
      .in('expo_push_token', dead);

    this.logger.log(`Retired ${dead.length} unregistered device token(s)`);
  }

  /** Her notification preferences, with the documented defaults when unset. */
  async prefsFor(userId: string): Promise<{
    arrivalEnabled: boolean;
    ignoredArrivalCount: number;
    softened: boolean;
  }> {
    const { data } = await this.supabase
      .from('notification_prefs')
      .select('arrival_enabled, ignored_arrival_count, softened')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      arrivalEnabled: data?.arrival_enabled ?? true,
      ignoredArrivalCount: data?.ignored_arrival_count ?? 0,
      softened: data?.softened ?? false,
    };
  }
}
