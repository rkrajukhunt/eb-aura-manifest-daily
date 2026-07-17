# 17 — ANALYTICS & EVENTS

Purpose: measure the funnel (install → wow → trial → paid → habit), the wow's power, and the memory moat. Naming: `object_action` snake_case. Every event carries: `user_pseudo_id`, `session_id`, `subscription_state`, `days_since_install`, `app_version`. **Privacy rule:** NO free-text content, struggles, people names, or memory contents ever enter analytics — only structural metadata (lengths, counts, booleans). See 18.

## Funnel — first session (north-star chain)

`app_first_open` → `onboarding_started` → `onboarding_screen_viewed {screen_id}` → `onboarding_answer_submitted {screen_id, answer_type, skipped, char_count_bucket}` → `onboarding_completed {duration_s, questions_answered}` → `letter_generation_started` → `letter_generation_succeeded {latency_s}` / `letter_generation_failed {reason}` → `letter_playback_started` → `letter_playback_completed {listened_pct}` → `paywall_viewed {surface: post_letter}` → `paywall_plan_selected {sku}` → `trial_started {sku}` / `purchase_completed {sku}` / `paywall_dismissed`
KPIs: onboarding completion >70% · letter completion (listened ≥90%) · wow→trial >35% · trial→paid >40%.

## Daily ritual & content

`moment_arrival_notification_sent` / `_opened` · `moment_playback_started {source: today|ondemand|collection|callback}` · `moment_playback_completed {listened_pct}` · `moment_read_mode_toggled` · `moment_refined {direction}` · `moment_favorited` · `manifest_anything_created {credits_remaining}` · `affirmation_revealed` · `affirmation_generated_guided {goal_area, tone}` · `affirmation_saved` · `affirmation_shared {format}` · `technique_chip_opened {technique}` · `technique_practice_completed {technique}` · `gratitude_entry_saved {char_count_bucket, prompt_was_personalized}` · `ritual_completed` (all three beats same day)
KPIs: ritual completion >40% DAU · shares/WAU >8% · technique engagement (validates education wedge).

## Memory & micro-wow (the moat instruments)

`memory_item_created {category, source}` · `memory_item_deleted {category}` · `never_include_added` · `what_aura_knows_viewed` · `callback_delivered {type: word_echo|remembered_detail|explicit|anniversary|milestone}` · `milestone_letter_played {day}`
Analysis: favorite-rate & completion-rate of callback-containing moments vs plain; retention curve of users with ≥N memory items (the compounding-value proof).

## Monetization

`paywall_viewed {surface}` · `locked_feature_touched {feature}` · `subscription_renewed` · `subscription_cancelled` · `trial_reminder_sent` · `winback_note_sent` / `_converted` · RevenueCat webhooks as source of truth for revenue states.

## Retention & lifecycle

`app_open {source: notification|direct|widget}` · `notification_permission_result` · `notification_softened` (auto-frequency drop) · `account_deleted` · standard D1/D7/D30 cohort retention via analytics tool.

## Quality & health

`generation_failed {surface, reason}` · `generation_qa_flagged {rule}` (banned phrase / missing tokens / never-include leak — the content quality alarm) · `audio_start_latency_ms` · `crash` · `playback_error`.

## Experiment flags (V1 A/B slots)

`exp_trial_variant {on|off}` (15) · `exp_paywall_hero {annual|weekly_first}` · `exp_ondemand_limit {2|3|5}` · assignment logged once per user.

## Dashboards (launch set)

1. First-session funnel (the wow dashboard). 2. Ritual & retention cohorts. 3. Revenue (RevenueCat). 4. Memory-moat panel (callback lift). 5. Generation quality (fail/QA-flag rates, latency p75).
