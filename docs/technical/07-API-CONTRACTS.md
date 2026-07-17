# 07 — API CONTRACTS

_Every NestJS endpoint. Schemas are zod, defined once in `packages/shared/src/contracts/` and imported by both apps — this doc mirrors them. Base path `/v1`. All non-webhook routes require `Authorization: Bearer <supabase JWT>` (03 §3). POSTs accept an `Idempotency-Key` header._

Reminder: CRUD for profiles, memory, people, gratitude, favorites is **not here** — mobile ↔ Supabase direct (00 §D1).

---

## 1. Generation

All generation endpoints return **202** with a job; results land in `moments`/`affirmations` rows readable via Supabase.

### `POST /v1/generation/letter`

Phase 6. Body: `{}` (context comes entirely from server-side memory).

```ts
Res202: {
  jobId: string;
}
```

Constraints: one letter per user (regeneration only via internal retry); called at S12.

### `POST /v1/generation/moment`

On-open fallback for a missing daily moment (primary path is cron — 04 §5).
Body: `{ scheduledFor: string /* ISO date */ }` → `Res202 { jobId }`
409 `already_ready` if today's exists.

### `POST /v1/generation/manifest`

Phase 7. Premium + credit-gated.

```ts
Req: { desireText: string /* 1..280 chars */ }
Res202: { jobId, creditsRemaining: number }
```

Errors: 402 `entitlement_required` · 429 `credits_exhausted {resetsAt}` · 422 `crisis_support {supportCopyKey}` (crisis path — 14 §5; credit NOT consumed on any error, product 09 §9.2).

### `POST /v1/generation/refine`

Phase 7. Premium. 1 per moment.

```ts
Req: { momentId: string, direction: 'more_realistic'|'softer'|'more_ambitious'|'note', note?: string /* ≤280 */ }
Res202: { jobId }
```

Errors: 402 · 409 `refine_limit_reached` · 422 `crisis_support`. Side effect: writes a `preference` memory item (09 §2).

### `POST /v1/generation/affirmation/daily`

On-open fallback (primary = cron alongside daily moment). Body `{}` → `Res202 { jobId }`.

### `POST /v1/generation/affirmation/guided`

Phase 8.

```ts
Req: { goalArea: string, goalText?: string /* ≤280 */, feeling: string, tone: 'gentle'|'bold'|'grounded' }
Res202: { jobId }   // job yields 3 candidate affirmations rows (status: candidate)
```

### `POST /v1/affirmations/:id/keep`

Marks a candidate `kept` (server-side because it finalizes the set + writes memory). `Res200 { }`.
_(Alternative considered: direct Supabase update — rejected: keeping one candidate archives its siblings atomically.)_

### `GET /v1/generation/jobs/:id`

```ts
Res200: {
  status: 'queued'|'running'|'retrying'|'succeeded'|'failed',
  artifact: 'letter'|'daily'|'ondemand'|'refine'|'affirmation_daily'|'affirmation_guided'|'milestone'|'winback',
  momentId?: string, affirmationIds?: string[],   // set on success
  errorKey?: string                               // copy key on failure, never a code
}
```

Polling: 1.5s interval, mobile stops at 90s → shows in-voice retry (product 08 §2 failure choreography).

## 2. Account

### `POST /v1/account/delete`

Phase 2 (primitive) / Phase 12 (full UI). Typed-confirmation happens client-side; server requires fresh JWT (<5 min old — client refreshes before calling).
`Res200 { }` — executes wipe runbook (03 §5, 14 §6).

## 3. Webhooks (no JWT; shared-secret header)

### `POST /v1/webhooks/revenuecat`

Header `Authorization: <REVENUECAT_WEBHOOK_AUTH>`. Handles: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `UNCANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE`, `TRANSFER` → upsert `subscription_state` (12 §5) + PostHog server events (`trial_started`, `purchase_completed`, `subscription_renewed`, `subscription_cancelled`). Always 200 on processed-or-duplicate (RC retries on non-200).

## 4. Health

`GET /v1/health` → `{ status: 'ok', db: bool, storage: bool, llm: bool, tts: bool }` (providers pinged with cached 60s result).

## 5. Error envelope

```ts
{ error: { key: string, message: string, details?: object } }
```

- `key` is a stable machine key from the shared `ApiErrorKey` union: `unauthorized` · `entitlement_required` · `credits_exhausted` · `refine_limit_reached` · `already_ready` · `crisis_support` · `validation_failed` · `rate_limited` · `generation_failed` · `internal`.
- Mobile maps `key → copy` (in-voice, product 14 error rules); `message` is developer-facing only.
- HTTP: 400 validation · 401 auth · 402 entitlement · 409 conflict · 422 crisis/semantic · 429 rate/credits · 5xx internal (Sentry).

## 6. Versioning & compatibility

- Path version `/v1`; breaking changes bump the path (expected: never at V1 pace — additive changes only).
- zod schemas use `.passthrough()` on responses client-side (server may add fields).
- Mobile OTA updates (16 §3) keep client/server contract drift windows short; contract tests in CI pin both sides to `@aura/shared` (15 §4).

## 7. Endpoint ↔ phase map

| Endpoint                                                                        | Phase |
| ------------------------------------------------------------------------------- | ----- |
| `/v1/health`                                                                    | 0     |
| `POST /v1/account/delete`                                                       | 2     |
| `POST /v1/generation/letter`, `GET /v1/generation/jobs/:id`                     | 5–6   |
| `POST /v1/generation/moment`, `/manifest`, `/refine`                            | 7     |
| `POST /v1/generation/affirmation/daily`, `/guided`, `/v1/affirmations/:id/keep` | 8     |
| `POST /v1/webhooks/revenuecat`                                                  | 10    |
