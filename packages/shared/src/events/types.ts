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

  // ─── Monetization (Phase 10, product 15 / 12) ──────────────────────────
  // The funnel numbers the business is graded on. Note what is absent: nothing
  // here records what she was looking at when the paywall appeared, and no
  // event fires from a vulnerable surface (checklist #4 — the paywall is not
  // permitted next to one in the first place).
  /** Mobile. `surface` distinguishes the post-Letter cover from a locked sheet. */
  paywall_viewed: { surface: PaywallSurface };
  /** Mobile. Which plan card she selected — not a purchase. */
  paywall_plan_selected: { sku: string };
  /** Mobile. She chose the free tier. A first-class outcome, not a failure. */
  paywall_dismissed: Record<string, never>;
  /** Mobile + backend. Backend fires from the RC webhook (12 §5). */
  trial_started: { sku: string };
  /** Mobile + backend. */
  purchase_completed: { sku: string };
  /** Mobile. Which gated feature she reached for — tells us what to build next. */
  locked_feature_touched: { feature: GatedFeature };
  /** Backend, from the RC webhook. */
  subscription_renewed: { sku: string };
  /** Backend, from the RC webhook. Auto-renew off; entitlement runs to period end. */
  subscription_cancelled: { sku: string };
  /** Mobile. She linked an identity, so a reinstall keeps her letters (03 §2.2). */
  account_claimed: { method: ClaimMethod };

  // ─── Daily moments & player (Phase 7, mobile) ──────────────────────────
  /** Mobile. `source` says how she got here, not what she heard. */
  moment_playback_started: { source: PlaybackSource };
  /** Mobile. Fires on completion OR on leaving early, so drop-off is visible. */
  moment_playback_completed: { listened_pct: number };
  /** Mobile. The education signal — who reads rather than listens. */
  moment_read_mode_toggled: Record<string, never>;
  /** Mobile. Which direction she asked for — a preference, never her note's text. */
  moment_refined: { direction: RefineDirectionName };
  /** Mobile. */
  moment_favorited: Record<string, never>;
  /** Mobile. Never the desire text itself (13 §2) — only that one was made. */
  manifest_anything_created: { credits_remaining: number };
  /** Mobile. Guards product 13's <300ms start budget, which is only real if measured. */
  audio_start_latency_ms: { latency_ms: number };
  /** Mobile. A code, never a vendor message. */
  playback_error: { reason: PlaybackErrorReason };

  // ─── Affirmations & gratitude (Phase 8, mobile) ────────────────────────
  /** Mobile. */
  affirmation_revealed: Record<string, never>;
  /** Mobile. Structural inputs only — her free-text goal never leaves the device. */
  affirmation_generated_guided: { goal_area: string; tone: AffirmationToneName };
  /** Mobile. */
  affirmation_saved: Record<string, never>;
  /** Mobile. */
  affirmation_shared: { format: ShareFormat };
  /** Mobile. Which technique she opened — the education wedge's only signal. */
  technique_chip_opened: { technique: TechniqueName };
  /** Mobile. */
  technique_practice_completed: { technique: TechniqueName };
  /**
   * Mobile. The entry itself NEVER appears — only its length bucket and whether
   * the prompt was personalized, which is enough to answer "does personalizing
   * produce more entries" without reading a word of it (13 §2).
   */
  gratitude_entry_saved: { char_count_bucket: CharCountBucket; prompt_was_personalized: boolean };
  /** Mobile. Fires only when all three beats happened the same day (product 09). */
  ritual_completed: Record<string, never>;
}

export type AffirmationToneName = 'gentle' | 'bold' | 'grounded';
export type ShareFormat = 'image' | 'text';
export type TechniqueName = 'identity' | 'present_tense' | 'three_six_nine' | 'scripting';

/** Mirrors RefineDirection in contracts/generation. */
export type RefineDirectionName = 'more_realistic' | 'softer' | 'more_ambitious' | 'note';

export type PlaybackErrorReason = 'network' | 'decode' | 'missing_audio' | 'unknown';

/** Where a paywall was shown (12 §3). */
export type PaywallSurface = 'post_letter' | 'locked_feature' | 'settings';

/** The five features the free tier gates (12 §4). */
export type GatedFeature =
  'manifest_anything' | 'refine' | 'favorites' | 'collections' | 'share_export';

export type ClaimMethod = 'apple' | 'email';

export type EventName = keyof EventCatalog;
export type EventPayload<E extends EventName> = EventCatalog[E];

/**
 * Events with no payload — `capture` lets these be called without a second arg.
 */
export type EmptyPayloadEvent = {
  [E in EventName]: EventCatalog[E] extends Record<string, never> ? E : never;
}[EventName];
