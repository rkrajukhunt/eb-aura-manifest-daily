/**
 * Typed analytics event catalog (13 §2, product 17).
 *
 * THE PRIVACY RULE, ENFORCED BY THE TYPE SYSTEM:
 * No free-text content, struggles, people names, or memory contents ever enter
 * analytics — only structural metadata. Every payload field below is a safe
 * primitive: an enum, a boolean, or a bucketed count. There is deliberately no
 * open `string` field anywhere in this catalog, so user content cannot be passed
 * to `capture()` without a type error. A CI test (15 §5) backstops this.
 *
 * If you are tempted to add a `string` field: bucket it (see `CharCountBucket`)
 * or make it a union of known literals instead.
 */

/** Free-text length is reported as a bucket, never as content or exact length. */
export type CharCountBucket = 'empty' | 'short' | 'medium' | 'long';

/** Playback completion as a coarse percentage bucket. */
export type ListenedPct = 0 | 25 | 50 | 75 | 100;

export type AppOpenSource = 'cold' | 'notification' | 'background';
export type PlaybackSource = 'home' | 'notification' | 'replay' | 'deeplink';
export type SubscriptionState = 'free' | 'trial' | 'paid' | 'lapsed';

/**
 * Mirrors the DB enums (02 §2). These are structural labels, not content —
 * knowing an item was category `struggle` reveals nothing about what it said.
 */
export type MemoryCategory =
  | 'identity'
  | 'dream'
  | 'person'
  | 'place_lifestyle'
  | 'struggle'
  | 'phrase'
  | 'milestone'
  | 'preference'
  | 'gratitude_ref'
  | 'temp_context';

export type MemorySource =
  'onboarding' | 'gratitude' | 'refine' | 'manifest' | 'profile_edit' | 'system';

/** S1–S11 (product 07). Stable ids — they are analytics keys and resume anchors. */
export type OnboardingScreenId =
  | 's01-welcome'
  | 's02-meet-aura'
  | 's03-name'
  | 's04-self-description'
  | 's05-work-feeling'
  | 's06-values'
  | 's07-dream-home'
  | 's08-dream-city'
  | 's09-people'
  | 's10-struggle'
  | 's11-arrival-time';

export type OnboardingAnswerType = 'text' | 'choice' | 'multi_choice' | 'people' | 'time' | 'none';

/** The eight artifacts (mirrors JobArtifact in contracts/generation). */
export type JobArtifactName =
  | 'letter'
  | 'daily'
  | 'ondemand'
  | 'refine'
  | 'affirmation_daily'
  | 'affirmation_guided'
  | 'milestone'
  | 'winback';

/**
 * Why a generation failed — a code, never content. `crisis` is deliberately
 * ABSENT: the crisis path is an uncounted, non-stigmatizing metric (08 §8), so
 * it must not be expressible as a failure reason here.
 */
export type GenerationFailureReason =
  | 'provider_timeout'
  | 'provider_error'
  | 'qa_failed'
  | 'malformed_output'
  | 'tts_failed'
  | 'storage_failed'
  | 'internal';

/** The eight QA rules (08 §5). */
export type QaRule =
  | 'verbatim_tokens'
  | 'name_first'
  | 'banned_phrases'
  | 'never_include'
  | 'length'
  | 'negative_frame'
  | 'sensitive_title'
  | 'date_close';

/**
 * Super properties attached to every event (13 §2, product 17).
 * `user_pseudo_id` is the PostHog distinct id (Supabase uuid — pseudonymous).
 */
export interface SuperProperties {
  session_id: string;
  subscription_state: SubscriptionState;
  days_since_install: number;
  app_version: string;
}

/**
 * The catalog. Each key is an event name; each value is its payload.
 * `Record<string, never>` means "no payload".
 *
 * Ownership (13 §3): each event has exactly one emitter — no double counting.
 * Events are added in the phase that ships their surface; the full inventory
 * from product 17 is completed and audited in Phase 11.
 */
export interface EventCatalog {
  // ─── Lifecycle (Phase 2) ───────────────────────────────────────────────
  /** Mobile. Fires once, on the very first open of a fresh install. */
  app_first_open: Record<string, never>;
  /** Mobile. */
  app_open: { source: AppOpenSource };

  // ─── First-session funnel (Phase 3, product 17) ───────────────────────
  /** Mobile. Fires at S1 view — the funnel's top after app_first_open. */
  onboarding_started: Record<string, never>;
  /** Mobile. */
  onboarding_screen_viewed: { screen_id: OnboardingScreenId };
  /**
   * Mobile. `char_count_bucket` is the ONLY trace of free text — never length,
   * never content (13 §2).
   */
  onboarding_answer_submitted: {
    screen_id: OnboardingScreenId;
    answer_type: OnboardingAnswerType;
    skipped: boolean;
    char_count_bucket: CharCountBucket;
  };
  /** Mobile. Fires once, when S11 commits. */
  onboarding_completed: { duration_s: number; questions_answered: number };

  // ─── Memory / moat (Phase 4) ───────────────────────────────────────────
  // Note what is absent: no `content`, no `verbatim`, no term. We count that a
  // memory happened and what kind — never what it said (13 §2, product 10:
  // "memory never fuels the funnel").
  /** Mobile. */
  memory_item_created: { category: MemoryCategory; source: MemorySource };
  /** Mobile. */
  memory_item_deleted: { category: MemoryCategory };
  /** Mobile. Deliberately payload-free — the excluded term never leaves the device. */
  never_include_added: Record<string, never>;
  /** Mobile. Deduped per session (13 §5 flood control). */
  what_aura_knows_viewed: Record<string, never>;

  // ─── Generation (Phase 5, backend-emitted, 13 §3) ──────────────────────
  // Structural metadata only — never a token of what was generated (13 §2).
  /** Backend. */
  letter_generation_started: Record<string, never>;
  /** Backend. */
  letter_generation_succeeded: { latency_s: number };
  /** Backend. `reason` is a code, never user content. */
  letter_generation_failed: { reason: GenerationFailureReason };
  /** Backend. Any artifact. */
  generation_failed: { surface: JobArtifactName; reason: GenerationFailureReason };
  /** Backend. One per QA rule that tripped (08 §5). */
  generation_qa_flagged: { rule: QaRule };

  // ─── The Letter — playback (Phase 6, mobile-emitted) ───────────────────
  // The wow's only instrumentation. How far she listened is the signal that
  // matters (product 08); WHAT she heard never leaves the device (13 §2).
  /** Mobile. Fires once, as the first word is spoken. */
  letter_playback_started: Record<string, never>;
  /**
   * Mobile. Fires when playback reaches its end OR she leaves mid-letter, so
   * drop-off is measurable. `listened_pct` is 0–100, rounded to an integer —
   * a bucket-ish number, never a position trail.
   */
  letter_playback_completed: { listened_pct: number };
}

export type EventName = keyof EventCatalog;
export type EventPayload<E extends EventName> = EventCatalog[E];

/**
 * Events with no payload — `capture` lets these be called without a second arg.
 */
export type EmptyPayloadEvent = {
  [E in EventName]: EventCatalog[E] extends Record<string, never> ? E : never;
}[EventName];
