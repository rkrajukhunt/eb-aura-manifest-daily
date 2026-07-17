# 13 — ANALYTICS & EXPERIMENTATION

_PostHog. Implements product doc 17 exactly — same event names, same privacy rule: **no free-text content, struggles, people names, or memory contents ever enter analytics** — only structural metadata._

---

## 1. Setup

- **Mobile:** `posthog-react-native`; initialized at boot; `identify(user_id)` (Supabase uuid — pseudonymous); autocapture OFF (explicit events only — privacy posture + signal quality).
- **Backend:** `posthog-node` in `AnalyticsModule`; server events use the same `user_id` (identity unification automatic).
- **RevenueCat ↔ PostHog:** RC `app_user_id` = Supabase `user_id` = PostHog distinct id — one identity everywhere; revenue events come from webhook handlers (server-side, source of truth per product 17).
- Hosting: PostHog Cloud US; EU migration path noted for later UK/EU emphasis.

## 2. Typed event catalog (`packages/shared/src/events`)

Every event is a TypeScript type; the `analytics.capture` wrapper accepts **only** catalog events — free-form strings don't compile. Payload fields are typed to safe primitives (enums, booleans, bucketed counts); there is no `string` field for user content anywhere in the catalog. This makes the privacy rule a compile-time property, backstopped by a lint rule and a CI test (15 §5).

Super properties on every event (product 17): `session_id`, `subscription_state`, `days_since_install`, `app_version` (`user_pseudo_id` = distinct id).

## 3. Event inventory (verbatim from product 17)

- **First-session funnel:** `app_first_open` → `onboarding_started` → `onboarding_screen_viewed {screen_id}` → `onboarding_answer_submitted {screen_id, answer_type, skipped, char_count_bucket}` → `onboarding_completed {duration_s, questions_answered}` → `letter_generation_started` → `letter_generation_succeeded {latency_s}` / `letter_generation_failed {reason}` → `letter_playback_started` → `letter_playback_completed {listened_pct}` → `paywall_viewed {surface}` → `paywall_plan_selected {sku}` → `trial_started {sku}` / `purchase_completed {sku}` / `paywall_dismissed`
- **Daily ritual:** `moment_arrival_notification_sent`/`_opened` · `moment_playback_started {source}` · `moment_playback_completed {listened_pct}` · `moment_read_mode_toggled` · `moment_refined {direction}` · `moment_favorited` · `manifest_anything_created {credits_remaining}` · `affirmation_revealed` · `affirmation_generated_guided {goal_area, tone}` · `affirmation_saved` · `affirmation_shared {format}` · `technique_chip_opened {technique}` · `technique_practice_completed {technique}` · `gratitude_entry_saved {char_count_bucket, prompt_was_personalized}` · `ritual_completed`
- **Memory/moat:** `memory_item_created {category, source}` · `memory_item_deleted {category}` · `never_include_added` · `what_aura_knows_viewed` · `callback_delivered {type}` · `milestone_letter_played {day}`
- **Monetization:** `paywall_viewed {surface}` · `locked_feature_touched {feature}` · `subscription_renewed` · `subscription_cancelled` · `trial_reminder_sent` · `winback_note_sent`/`_converted`
- **Lifecycle:** `app_open {source}` · `notification_permission_result` · `notification_softened` · `account_deleted`
- **Quality:** `generation_failed {surface, reason}` · `generation_qa_flagged {rule}` · `audio_start_latency_ms` · `playback_error` (crashes → Sentry, not PostHog)

Ownership: mobile emits UX events; backend emits generation/webhook/cron events. Each event has exactly one emitter (catalog annotates it) — no double counting.

## 4. Deletion

`account_deleted` fires, then backend queues a PostHog person-deletion request (14 §6). Events are pseudonymous meanwhile.

## 5. Experiments (PostHog feature flags — product 17 §flags)

| Flag                                                                                                                                                                                                                                                     | Variants              | Scope                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| `exp_trial_variant`                                                                                                                                                                                                                                      | on / off              | maps to RC offering (12 §1)                                             |
| `exp_paywall_hero`                                                                                                                                                                                                                                       | annual / weekly_first | plan card order                                                         |
| `exp_ondemand_limit`                                                                                                                                                                                                                                     | 2 / 3 / 5             | Manifest weekly cap (server reads flag via PostHog API at credit check) |
| Rules: assignment evaluated once at first exposure, persisted to `experiment_assignments` (analytic mirror + server-side reads); flags never change mid-session; new users only for pricing experiments (no switching an existing subscriber's paywall). |

## 6. Dashboards (launch set, product 17)

1. **Wow dashboard** — first-session funnel; KPIs: onboarding >70%, letter completion ≥90%-listened, wow→trial >35%, trial→paid >40%.
2. **Ritual & retention** — D1/D7/D30 cohorts (free vs paid), ritual completion >40% DAU, notification open >60%.
3. **Revenue** — RC dashboard primary; PostHog funnel for paywall surfaces.
4. **Memory moat** — callback-containing moments vs plain: favorite rate + completion rate; retention curve by memory-item count.
5. **Generation quality** — `generation_failed`/`generation_qa_flagged` rates by rule + latency p75/p90; **alarm**: QA-flag rate >5% or any `never_include` leak → Sentry alert (the "repetition complaints" early-warning from product 19 pivot signals).

## 7. Phase mapping

Phase 0/2: SDK wiring + identity + wrapper. Each phase lands its own events with the feature (listed per-phase in IMPLEMENTATION-PLAN). Phase 11: experiments, dashboards, full-catalog audit against product 17, alarms.
