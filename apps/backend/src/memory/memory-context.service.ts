import type { JobArtifact } from '@aura/shared';
import { Inject, Injectable } from '@nestjs/common';

import type { CadenceDirective, MemoryContext } from '../generation/types';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';

/** Top-N evolving items and phrases per assembly (09 §4). */
const MAX_EVOLVING_ITEMS = 8;
const MAX_PHRASES = 6;
const MAX_RECENT_TITLES = 5;

/** Artifacts whose BODY may reference sensitive memory (09 §2). */
const BODY_ARTIFACTS = new Set<JobArtifact>(['letter', 'daily', 'ondemand', 'refine', 'milestone']);

/** Recency-decay half-life for the sampler score (09 §4). */
const RECENCY_HALF_LIFE_DAYS = 30;

/** Remembered-detail cadence guard: ≤1 per 7 days (09 §5). */
const REMEMBERED_DETAIL_COOLDOWN_DAYS = 7;
/** Explicit callback: user ≥ D21, none in last 30 days (09 §5). */
const EXPLICIT_CALLBACK_MIN_AGE_DAYS = 21;
const EXPLICIT_CALLBACK_COOLDOWN_DAYS = 30;

/**
 * The read-only memory sampler (09 §4) — the moat's brain.
 *
 * Assembly is deterministic and cheap: a fixed query set, a scoring formula, no
 * vectors, no RAG (00 §D9). Its job is to hand a prompt builder a snapshot of
 * who she is in her own words, already filtered for the two rules that protect
 * her: sensitive memory only reaches BODY artifacts, and anything referencing an
 * inactive person is dropped (silence over a wrong guess, 09 §4).
 *
 * The cadence directives (09 §5) are computed HERE, not in the builder, so the
 * micro-wow guards live in one place. A builder just honours what it's handed.
 */
@Injectable()
export class MemoryContextService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient) {}

  async assemble(
    userId: string,
    artifact: JobArtifact,
    now: Date = new Date(),
  ): Promise<MemoryContext> {
    const includeSensitive = BODY_ARTIFACTS.has(artifact);

    const [profileRes, peopleRes, itemsRes, phrasesRes, neverRes, titlesRes] = await Promise.all([
      this.supabase.from('profiles').select('*').eq('user_id', userId).single(),
      this.supabase
        .from('people')
        .select('name, descriptor')
        .eq('user_id', userId)
        .eq('active', true),
      this.supabase.from('memory_items').select('*').eq('user_id', userId).eq('excluded', false),
      this.supabase
        .from('exact_phrases')
        .select('phrase, use_count, created_at')
        .eq('user_id', userId),
      this.supabase.from('never_include').select('term').eq('user_id', userId),
      this.supabase
        .from('moments')
        .select('title')
        .eq('user_id', userId)
        .not('title', 'is', null)
        .order('created_at', { ascending: false })
        .limit(MAX_RECENT_TITLES),
    ]);

    const profile = profileRes.data;
    const rawItems = itemsRes.data ?? [];

    // Permanent items always; evolving items sampled by score; sensitive is its
    // own tier, added only for body artifacts (09 §2/§4). Tiers are disjoint, so
    // permanent needs no sensitive filter — sensitive never carries tier permanent.
    const permanent = rawItems.filter((i) => i.tier === 'permanent');
    const evolving = rawItems
      .filter((i) => i.tier === 'evolving')
      .map((i) => ({ item: i, score: this.score(i, now) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_EVOLVING_ITEMS)
      .map((s) => s.item);
    const sensitive = includeSensitive ? rawItems.filter((i) => i.tier === 'sensitive') : [];

    const memoryItems = [...permanent, ...evolving, ...sensitive].map((i) => ({
      content: i.content,
      verbatim: i.verbatim,
      category: i.category,
      tier: i.tier,
    }));

    const exactPhrases = (phrasesRes.data ?? [])
      .map((p) => ({ phrase: p.phrase, score: this.phraseScore(p, now) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_PHRASES)
      .map((p) => p.phrase);

    const startedAt = profile?.created_at ? new Date(profile.created_at) : null;

    return {
      name: profile?.name ?? null,
      selfDescription: profile?.self_description ?? null,
      workFeeling: profile?.work_feeling ?? null,
      values: profile?.values ?? [],
      dreamHome: profile?.dream_home ?? null,
      dreamCity: profile?.dream_city ?? null,
      // Sensitive: only surfaced for body artifacts, never titles/notifications.
      struggle: includeSensitive ? (profile?.struggle ?? null) : null,
      people: (peopleRes.data ?? []).map((p) => ({ name: p.name, descriptor: p.descriptor })),
      memoryItems,
      exactPhrases,
      neverInclude: (neverRes.data ?? []).map((n) => n.term),
      recentGratitude: [], // Phase 8 wires gratitude_entries into context.
      recentTitles: (titlesRes.data ?? [])
        .map((t) => t.title)
        .filter((t): t is string => t !== null),
      directives: await this.cadenceDirectives(userId, artifact, evolving, now, includeSensitive),
      startedWeekday: startedAt ? (WEEKDAYS[startedAt.getDay()] ?? null) : null,
      startedMonth: startedAt ? (MONTHS[startedAt.getMonth()] ?? null) : null,
    };
  }

  /**
   * Sampler score (09 §4): recency decay × emotional weight × novelty.
   * Novelty (1/(use_count+1)) is the anti-repetition term — the more a memory
   * has already been spent, the less it resurfaces.
   */
  private score(
    item: { emotional_weight: number; use_count: number; created_at: string },
    now: Date,
  ): number {
    const ageDays = (now.getTime() - new Date(item.created_at).getTime()) / 86_400_000;
    const recency = Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
    const novelty = 1 / (item.use_count + 1);
    return recency * item.emotional_weight * novelty;
  }

  private phraseScore(p: { use_count: number; created_at: string }, now: Date): number {
    const ageDays = (now.getTime() - new Date(p.created_at).getTime()) / 86_400_000;
    const recency = Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
    return recency * (1 / (p.use_count + 1));
  }

  /**
   * Cadence directives (09 §5): micro-wows the scheduler clears for THIS
   * generation. State derives from the data, not a scheduler table — so the
   * guards are just queries over `last_used_at` and account age.
   *
   * Letters and affirmations get no directives: the letter is already the peak,
   * and affirmations are too short to carry one.
   */
  private async cadenceDirectives(
    userId: string,
    artifact: JobArtifact,
    evolvingCandidates: { content: string; last_used_at: string | null; category: string }[],
    now: Date,
    includeSensitive: boolean,
  ): Promise<CadenceDirective[]> {
    if (
      artifact === 'letter' ||
      artifact === 'affirmation_daily' ||
      artifact === 'affirmation_guided'
    ) {
      return [];
    }

    const directives: CadenceDirective[] = [];

    // Remembered detail — eligible if no non-phrase item was spent as one in the
    // last 7 days (09 §5). Approximated via the freshest unused evolving item.
    const rememberable = evolvingCandidates.find(
      (i) =>
        i.category !== 'phrase' &&
        (i.last_used_at === null ||
          daysBetween(new Date(i.last_used_at), now) >= REMEMBERED_DETAIL_COOLDOWN_DAYS),
    );
    if (rememberable) {
      directives.push({ kind: 'remembered_detail', item: rememberable.content });
    }

    // Explicit callback — user ≥ D21 and none in the last 30 days (09 §5).
    //
    // GATED ON `includeSensitive`: the callback item IS her struggle, which is
    // sensitive-tier memory. `assemble` already nulls `context.struggle` for
    // non-body artifacts, but this directive reads the profile row directly, so
    // without this gate it would smuggle the struggle past that filter and into
    // the prompt (`renderContextBlock` renders directives verbatim). The artifact
    // that reaches here non-body is `winback` — a lapsed-user note — which is
    // exactly the "never notifications" surface 09 §2 forbids.
    if (!includeSensitive) return directives;

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('created_at, struggle')
      .eq('user_id', userId)
      .single();

    if (
      profile?.created_at &&
      daysBetween(new Date(profile.created_at), now) >= EXPLICIT_CALLBACK_MIN_AGE_DAYS
    ) {
      const { data: recentCallback } = await this.supabase
        .from('moments')
        .select('id')
        .eq('user_id', userId)
        .gte(
          'created_at',
          new Date(now.getTime() - EXPLICIT_CALLBACK_COOLDOWN_DAYS * 86_400_000).toISOString(),
        )
        .limit(1);

      if ((recentCallback?.length ?? 0) === 0 && profile.struggle) {
        directives.push({ kind: 'explicit_callback', item: profile.struggle });
      }
    }

    return directives;
  }
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / 86_400_000;
}
