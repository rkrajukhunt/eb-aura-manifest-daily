import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.schema';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';

/**
 * The week a credit belongs to: the Monday of that ISO week, in UTC.
 *
 * Pure and exported so the boundary is testable. UTC rather than her local
 * timezone is a deliberate simplification — a credit week is an accounting
 * period, not an experience, and a user who travels should not be handed a
 * fresh allowance by crossing a date line.
 */
export function weekStartFor(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // getUTCDay: 0 = Sunday. Shift so Monday is day 0.
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

export interface CreditCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Manifest Anything credits and refine caps (12 §4, product 09 §9.2).
 *
 * The rule that shapes this whole file: **an error must never consume a
 * credit.** Product 09 §9.2 states it directly ("Error: retry, credit not
 * consumed"), and it is the difference between a cap that reads as pacing and
 * one that reads as theft. So a spend is recorded up front — to close the race
 * where two requests both see the last credit — and explicitly refunded on
 * every failure path.
 */
@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** How many manifests she has left this week, without spending one. */
  async check(userId: string, now: Date = new Date()): Promise<CreditCheck> {
    const limit = this.config.get('MANIFEST_WEEKLY_LIMIT', { infer: true });
    const used = await this.usedThisWeek(userId, now);

    return { allowed: used < limit, used, limit, remaining: Math.max(0, limit - used) };
  }

  /**
   * Reserves a credit. Returns `allowed: false` without spending when she is out.
   *
   * Reserved BEFORE the generation runs, not after it succeeds: two requests
   * arriving together would otherwise both read "1 remaining" and both proceed.
   * The cost of this ordering is that failures must refund — which they do.
   */
  async spend(userId: string, now: Date = new Date()): Promise<CreditCheck> {
    const current = await this.check(userId, now);
    if (!current.allowed) return current;

    const weekStart = weekStartFor(now);
    const { error } = await this.supabase
      .from('usage_credits')
      .upsert(
        { user_id: userId, week_start: weekStart, manifest_used: current.used + 1 },
        { onConflict: 'user_id,week_start' },
      );

    if (error) {
      // Failing open here would let an unlimited number through on a database
      // blip; failing closed costs her one manifest she can retry.
      this.logger.error(`Credit spend failed: ${error.message}`);
      return { ...current, allowed: false };
    }

    const used = current.used + 1;
    return {
      allowed: true,
      used,
      limit: current.limit,
      remaining: Math.max(0, current.limit - used),
    };
  }

  /**
   * Returns a reserved credit after a failed generation (product 09 §9.2).
   *
   * Clamped at zero so a double refund — a retry that fails twice, a webhook
   * replay — can never mint credits she was not given.
   */
  async refund(userId: string, now: Date = new Date()): Promise<void> {
    const used = await this.usedThisWeek(userId, now);
    if (used <= 0) return;

    const { error } = await this.supabase
      .from('usage_credits')
      .upsert(
        { user_id: userId, week_start: weekStartFor(now), manifest_used: used - 1 },
        { onConflict: 'user_id,week_start' },
      );

    if (error) this.logger.error(`Credit refund failed: ${error.message}`);
  }

  /**
   * Whether this moment may still be refined (product 09 §9.1: 1 per moment).
   *
   * Counts the refine LINEAGE via `refine_of` rather than a flag, so refining a
   * refinement is blocked too — the cap is on the original moment, and a chain
   * would otherwise be an unbounded budget one hop at a time.
   */
  async canRefine(momentId: string): Promise<boolean> {
    const limit = this.config.get('REFINE_PER_MOMENT', { infer: true });

    const { data: moment } = await this.supabase
      .from('moments')
      .select('id, refine_of')
      .eq('id', momentId)
      .maybeSingle();

    if (!moment) return false;

    // A moment that is itself a refinement is at the end of its lineage.
    if (moment.refine_of) return false;

    const { data: children } = await this.supabase
      .from('moments')
      .select('id')
      .eq('refine_of', momentId);

    return (children?.length ?? 0) < limit;
  }

  private async usedThisWeek(userId: string, now: Date): Promise<number> {
    const { data } = await this.supabase
      .from('usage_credits')
      .select('manifest_used')
      .eq('user_id', userId)
      .eq('week_start', weekStartFor(now))
      .maybeSingle();

    return data?.manifest_used ?? 0;
  }
}
