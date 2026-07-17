# 02 — DATABASE SCHEMA

_Supabase PostgreSQL. Implements product docs 05 (scope), 09 (features), 10 (memory). RLS is the primary security boundary (see 14). All tables live in schema `public`; all user tables carry `user_id uuid references auth.users(id) on delete cascade`._

Conventions: `id uuid primary key default gen_random_uuid()` · `created_at timestamptz default now()` · `updated_at` via trigger · soft state via enums, not booleans, where a lifecycle exists.

---

## 1. Identity & profile

### `profiles`

One row per auth user (anonymous or claimed). Created by trigger on `auth.users` insert.

| Column                    | Type                 | Notes                                                                       |
| ------------------------- | -------------------- | --------------------------------------------------------------------------- |
| `user_id`                 | uuid PK → auth.users |                                                                             |
| `name`                    | text                 | S3; the key personalization token                                           |
| `self_description`        | text                 | S4, verbatim                                                                |
| `work_feeling`            | text (enum-ish)      | S5: love_it \| fine_for_now \| ready_for_new \| building_side               |
| `values`                  | text[]               | S6, ≤2                                                                      |
| `dream_home`              | text                 | S7 card id                                                                  |
| `dream_city`              | text                 | S8, verbatim ("not sure" stored as feeling-word)                            |
| `struggle`                | text                 | S10, verbatim — **sensitive**; never selected into notification/share paths |
| `arrival_time`            | time                 | S11 (user local)                                                            |
| `timezone`                | text                 | IANA, captured at onboarding                                                |
| `onboarding_completed_at` | timestamptz          | null until S11 done                                                         |
| `is_anonymous`            | boolean              | mirrors auth state for queries                                              |
| `last_active_at`          | timestamptz          | drives pre-generation skip (>7 days inactive)                               |
| `voice_id`                | text                 | TTS voice (1 at V1)                                                         |
| `free_text_note`          | text                 | "Anything Aura should know?"                                                |

### `people`

| Column          | Type    | Notes                                                       |
| --------------- | ------- | ----------------------------------------------------------- |
| `id`, `user_id` |         |                                                             |
| `name`          | text    | verbatim                                                    |
| `descriptor`    | text    | one word ("safe", "fun")                                    |
| `active`        | boolean | removed people stay for history but exit generation context |

### `onboarding_answers`

Raw answer log (auditing + regeneration source; profile holds the working copy).
`id, user_id, screen_id text, answer jsonb, skipped boolean, created_at`

## 2. Memory (product doc 10 → technical spec in 09)

### `memory_items`

| Column             | Type        | Notes                                                                                                                            |
| ------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `user_id`    |             |                                                                                                                                  |
| `category`         | enum        | identity \| dream \| person \| place_lifestyle \| struggle \| phrase \| milestone \| preference \| gratitude_ref \| temp_context |
| `tier`             | enum        | permanent \| evolving \| temporary \| sensitive                                                                                  |
| `content`          | text        | plain-language memory ("Dream city is London")                                                                                   |
| `verbatim`         | text        | exact user wording when applicable                                                                                               |
| `source`           | enum        | onboarding \| gratitude \| refine \| manifest \| profile_edit \| system                                                          |
| `source_id`        | uuid        | row that created it (e.g. gratitude entry)                                                                                       |
| `emotional_weight` | smallint    | 1–5, set at write (09 §3)                                                                                                        |
| `expires_at`       | timestamptz | temporary tier only                                                                                                              |
| `last_used_at`     | timestamptz | cadence guard for callbacks                                                                                                      |
| `use_count`        | int         | anti-repetition                                                                                                                  |
| `deleted_at`       | timestamptz | user delete = hard delete; this column only for system expiry audit                                                              |

### `exact_phrases`

The personalization fuel, harvested from all free text.
`id, user_id, phrase text, source enum, memory_item_id uuid, last_used_at, use_count`

### `never_include`

Hard exclusion list (prompt filter + post-generation check).
`id, user_id, term text, created_at`

## 3. Content

### `moments`

Letters, daily moments, on-demand, milestones — one table, one player.

| Column                       | Type           | Notes                                                                      |
| ---------------------------- | -------------- | -------------------------------------------------------------------------- |
| `id`, `user_id`              |                |                                                                            |
| `type`                       | enum           | letter \| daily \| ondemand \| milestone \| winback                        |
| `milestone_day`              | int            | 7 \| 30 \| 100, when type=milestone                                        |
| `status`                     | enum           | forming \| generating \| ready \| failed \| replaced                       |
| `title`                      | text           | italic-serif display title; **never contains sensitive content** (QA rule) |
| `body`                       | text           | full text for Read mode                                                    |
| `word_timings`               | jsonb          | [{word, start_ms, end_ms}] from TTS (10)                                   |
| `audio_path`                 | text           | Storage path (private bucket)                                              |
| `duration_ms`                | int            |                                                                            |
| `scheduled_for`              | date           | daily arrival date; "forming" previews are future-dated rows               |
| `desire_text`                | text           | Manifest Anything input, verbatim                                          |
| `refine_of`                  | uuid → moments | regeneration lineage; original → `replaced`                                |
| `qa_report`                  | jsonb          | tokens found, checks passed (13 quality events derive from this)           |
| `played_at` / `completed_at` | timestamptz    | listened ≥90% sets completed                                               |
| `favorited_at`               | timestamptz    | letter auto-favorited                                                      |

### `affirmations`

| Column                         | Type        | Notes                                                                |
| ------------------------------ | ----------- | -------------------------------------------------------------------- |
| `id`, `user_id`                |             |                                                                      |
| `kind`                         | enum        | daily \| guided                                                      |
| `text`                         | text        | ≤20 words, QA-enforced rules (product 14)                            |
| `goal_area`, `feeling`, `tone` | text        | guided flow inputs (tone: gentle \| bold \| grounded)                |
| `why_line`                     | text        | the one-line technique rationale                                     |
| `technique`                    | text        | identity \| present_tense \| three_six_nine \| scripting             |
| `revealed_at`, `saved_at`      | timestamptz | daily card reveal + save-to-collection                               |
| `status`                       | enum        | candidate \| kept — guided flow generates 3 candidates, kept on pick |

### `gratitude_entries`

`id, user_id, entry text (verbatim), prompt_shown text, prompt_was_personalized boolean, entry_date date UNIQUE(user_id, entry_date), synced_from_local boolean`

### `favorites`

`id, user_id, moment_id uuid → moments, affirmation_id uuid → affirmations, created_at` (exactly one of the two FKs set; unique per target). Favorited audio is retained on device cache (10) — this table is the server truth.

## 4. Operations

### `generation_jobs`

Backend-owned state machine (04 §4).
`id, user_id, artifact enum(letter|daily|ondemand|refine|affirmation_daily|affirmation_guided|milestone|winback), status enum(queued|running|qa_failed|retrying|succeeded|failed), moment_id, attempt int, error text (no user content), latency_ms int, created_at, finished_at`

### `notification_tokens`

`id, user_id, expo_push_token text UNIQUE, device_id text, active boolean, created_at`

### `notification_prefs`

`user_id PK, arrival_enabled boolean default true, affirmation_nudge enum(quiet|once_daily|custom_hours), custom_start time, custom_end time, ignored_arrival_count int, softened boolean` (auto-soften after 3 ignored — 11).

### `subscription_state`

RevenueCat mirror (webhook-written; RevenueCat SDK remains client truth for gating).
`user_id PK, rc_app_user_id text, entitlement enum(free|premium), product_id text, period_type enum(trial|normal), expires_at timestamptz, will_renew boolean, last_event text, last_event_at timestamptz`

### `usage_credits`

Weekly Manifest Anything + refine caps, server-enforced.
`user_id, week_start date, manifest_used int default 0, UNIQUE(user_id, week_start)` (refine cap is per-moment via `refine_of` lineage count).

### `experiment_assignments`

Logged once per user per flag (PostHog is the assignment engine; this is the analytic mirror).
`user_id, flag text, variant text, assigned_at, UNIQUE(user_id, flag)`

## 5. RLS policies

Baseline for every user table:

```sql
alter table <t> enable row level security;
create policy "own rows select" on <t> for select using (auth.uid() = user_id);
create policy "own rows insert" on <t> for insert with check (auth.uid() = user_id);
create policy "own rows update" on <t> for update using (auth.uid() = user_id);
create policy "own rows delete" on <t> for delete using (auth.uid() = user_id);
```

Exceptions (deny-by-default, no user policies; service-role only):

- `generation_jobs`: select-own only for status polling; insert/update service-role.
- `moments`, `affirmations`: select-own + update-own limited to engagement columns (`played_at`, `completed_at`, `favorited_at`, `revealed_at`, `saved_at`, `status→kept`) via column-restricted policy; content writes are service-role only (generation pipeline).
- `subscription_state`, `experiment_assignments`: select-own; writes service-role.
- `usage_credits`: select-own; writes service-role (credit spend happens inside generation endpoints).

## 6. Storage

Bucket `audio` (private):

```
audio/{user_id}/{moment_id}.mp3
```

- No public access; mobile fetches **signed URLs** (1h expiry) via Supabase client; backend writes with service role.
- Deletion: `on delete` of a moment removes its object (backend deletion routine — Postgres can't cascade into Storage; see 14 §6 wipe runbook).

## 7. Indexes

- `moments (user_id, type, scheduled_for)` — home queries + cron lookups.
- `moments (user_id, status)` — forming previews.
- `memory_items (user_id, tier, category)` + partial index `where tier='temporary' and expires_at is not null` — context assembly + expiry sweep.
- `gratitude_entries (user_id, entry_date)` — dots + history.
- `generation_jobs (status, created_at)` — worker polling.
- `profiles (arrival_time)` + `(last_active_at)` — pre-generation cron window scan.

## 8. Deletion semantics (product doc 18: "delete means delete")

`auth.users` delete cascades all tables above. Full account deletion is orchestrated by backend (14 §6): Storage objects → DB cascade → RevenueCat delete → PostHog delete request. Per-item memory delete is a hard `DELETE`, and 09 §6 defines how generation context excludes tombstoned references mid-cycle.

## 9. Migration plan by phase

| Phase | Migrations                                                                  |
| ----- | --------------------------------------------------------------------------- |
| 2     | `profiles` (+trigger), `onboarding_answers`, RLS baseline                   |
| 3     | `people`                                                                    |
| 4     | `memory_items`, `exact_phrases`, `never_include`                            |
| 5     | `moments`, `affirmations`, `generation_jobs`, `usage_credits`, audio bucket |
| 8     | `gratitude_entries`, `favorites`                                            |
| 9     | `notification_tokens`, `notification_prefs`                                 |
| 10    | `subscription_state`                                                        |
| 11    | `experiment_assignments`                                                    |
