# 04 — BACKEND ARCHITECTURE (NestJS)

_The thin backend (00 §D1). It owns exactly five things: AI generation, quality gating, scheduled jobs, webhooks, and push dispatch. Everything else belongs to Supabase._

---

## 1. Module map

```
AppModule
├── AuthModule            SupabaseAuthGuard (JWT verify), UserContext
├── GenerationModule      orchestration per artifact + jobs state machine
│   ├── PromptService     builders: letter, daily, ondemand, refine, affirmation, milestone, winback
│   ├── QaService         token check, banned phrases, never-include, length, sensitive-title
│   └── JobsService       generation_jobs lifecycle, retries, idempotency
├── ProvidersModule       LlmProvider + TtsProvider (interfaces + adapters)  → 08, 10
├── MemoryModule          MemoryContextService (read-only sampler)           → 09
├── SafetyModule          CrisisDetectionService (keyword + classifier)      → 14
├── SchedulerModule       crons (below)
├── NotificationsModule   Expo push dispatch, copy assembly                  → 11
├── WebhooksModule        RevenueCat receiver                                → 12
├── AnalyticsModule       PostHog server events (typed, from @aura/shared)   → 13
├── SupabaseModule        service-role client (single injection point)
└── HealthModule          /v1/health (liveness + provider ping)
```

Endpoint surface and schemas → **07-API-CONTRACTS** (single source of truth; controllers import zod schemas from `@aura/shared`).

## 2. Request lifecycle (generation endpoints)

```
Controller (zod-parse body)
→ SupabaseAuthGuard (JWT → userId)
→ EntitlementCheck (premium-only artifacts: ondemand, refine)      [reads subscription_state]
→ CreditCheck (ondemand: usage_credits weekly cap; refine: lineage cap)
→ CrisisCheck (free-text inputs: desire_text, refine note)         [14 §5]
→ JobsService.create (idempotency-key aware) → 202 { job_id }
→ async pipeline: MemoryContext → Prompt → LLM → QA → TTS → Storage → moments row → job succeeded
```

Synchronous vs async: **all generation is async** (202 + job id). The Letter's 15–40s latency is masked by the ritual screen; mobile polls `GET /v1/generation/jobs/:id` at 1.5s intervals (simple, reliable; Supabase Realtime on `moments.status` is an optional Phase-12 upgrade — polling ships first).

## 3. Pipeline detail

1. **MemoryContext** (09 §4): assemble profile + sampled memory items + exact phrases + never-include list + cadence state.
2. **Prompt build** (08 §3): artifact-specific system prompt + context injection with verbatim tokens.
3. **LLM call** via `LlmProvider` (timeout: 30s letter / 15s others; one provider-level retry on transient error).
4. **QA gate** (08 §5): fail → one regeneration with corrective instruction; second fail → job `qa_failed` → fallback behavior per artifact (07 error envelope; daily cron falls back to replaying rules in 11).
5. **TTS** via `TtsProvider` (10): text → mp3 + word timings.
6. **Persist**: Storage upload → `moments`/`affirmations` row (service role) → job `succeeded` with `latency_ms`.
7. **Analytics**: `letter_generation_succeeded {latency_s}` etc. (13) — structural metadata only, never content.

Idempotency: clients send `Idempotency-Key` header on POSTs; JobsService returns the existing job for a replayed key (network-retry safety).

## 4. `generation_jobs` state machine

```
queued → running → succeeded
              ↘ qa_failed → retrying(1) → running → …
              ↘ provider_error → retrying(≤2, backoff 2s/8s) → …
retrying exhausted → failed
```

- Worker model at V1: **in-process queue** (p-queue per artifact class with concurrency caps: letters 4, daily batch 8, ondemand 4). No Redis/BullMQ until scale demands it — the job table is the durable record; on boot, `running` jobs older than 5 min are re-queued. (Explicitly noted as the V1 simplicity choice; BullMQ is the upgrade path, slot documented in 16 §7.)
- `error` column stores provider/QA codes only — **never user content**.

## 5. Scheduler (crons)

All crons are idempotent and timezone-aware (`profiles.timezone`).

| Cron                      | Schedule     | Action                                                                                                                                                                                                         |
| ------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pregenerate-daily`       | every 15 min | Users whose `arrival_time` (local) falls in [now+15m, now+30m) and `last_active_at` ≤ 7 days and no `ready` moment for today → enqueue daily generation. On success → schedule arrival push at `arrival_time`. |
| `expire-temporary-memory` | hourly       | `memory_items` tier=temporary past `expires_at` → delete or convert (09 §5)                                                                                                                                    |
| `milestone-letters`       | daily per-tz | Users hitting D7 (V1; D30/D100 V1.1) → milestone generation + in-app arrival (full-screen next open), push at arrival time                                                                                     |
| `trial-reminder`          | daily        | Trials converting in 2 days → honest reminder push (product 15 checklist #3)                                                                                                                                   |
| `winback-note`            | daily        | Lapsed +3 days → one free mini-moment + warm note; never repeats (product 06)                                                                                                                                  |
| `soften-notifications`    | daily        | `ignored_arrival_count ≥ 3` → set `softened`, drop to 3/week pattern (11 §5)                                                                                                                                   |
| `anon-sweep`              | weekly       | Anonymous users inactive >90 days → full wipe (03 §2.3)                                                                                                                                                        |

Cron runs are logged (`job`, `window`, `users_processed`, `failures`) for the generation-quality dashboard (13 §6).

## 6. Configuration & secrets

- `@nestjs/config` with zod-validated env schema (fail fast on boot).
- Secrets from host env (16 §4); never in repo. `LLM_PROVIDER=anthropic|openai|mock` selects the adapter at boot — `mock` powers local dev and CI (15).
- Limits as config, not code: `MANIFEST_WEEKLY_LIMIT=3`, `REFINE_PER_MOMENT=1`, `PREGEN_INACTIVE_SKIP_DAYS=7`, buffer minutes — tunable per product doc 20 Q4 without redeploys where the host supports env swap.

## 7. Cross-cutting

- **Rate limiting:** `@nestjs/throttler` — per-user: 10 generation requests/min, 60 reads/min; webhook route excluded (auth by shared secret instead).
- **Observability:** Sentry (errors + slow-transaction traces on the pipeline); structured pino logs with `user_id` hashed; `generation_failed` / `generation_qa_flagged` events to PostHog (the quality alarm — product doc 17).
- **Health:** `/v1/health` returns db + storage + provider reachability (used by host health checks and the uptime monitor in 16 §6).
- **Hosting recommendation:** Railway (simplest) or Fly.io (regional control). Single region co-located with the Supabase project region. One small instance suffices at launch; crons run in-process (`@nestjs/schedule`) — acceptable because instance count is 1; if scaled horizontally, crons move to a dedicated worker process (documented upgrade path, 16 §7).

## 8. What the backend deliberately does NOT do

- No CRUD proxying for profile/memory/gratitude/favorites (mobile ↔ Supabase, RLS).
- No sessions of its own — Supabase JWT only.
- No content storage in logs or analytics — user text exists only in Postgres/Storage.
- No LLM/TTS calls from mobile, ever — keys live here alone.
