# 14 — SECURITY & PRIVACY

_Privacy is the brand (product doc 18 — "privacy failures are brand failures"). This doc turns product 18 into technical controls._

---

## 1. Security baseline

| Control        | Implementation                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Transport      | TLS everywhere (Supabase, backend, vendors)                                                               |
| At rest        | Supabase managed encryption (Postgres + Storage)                                                          |
| AuthN          | Supabase JWT; backend guard verifies on every route (03 §3)                                               |
| AuthZ          | **RLS on every user table** (02 §5) — the primary boundary; backend service-role writes are pipeline-only |
| Secrets        | server/EAS env only; never in repo; `.env.example` names only (01 §6)                                     |
| Audio          | private bucket + signed expiring URLs (1h), never public (10 §3)                                          |
| Rate limiting  | per-user throttles on backend (04 §7); Supabase built-in auth limits                                      |
| Webhooks       | shared-secret header check (07 §3)                                                                        |
| Dependencies   | Dependabot + `pnpm audit` in CI                                                                           |
| Mobile secrets | none — mobile holds only public keys (anon key, PostHog, RC public key)                                   |

## 2. RLS policy catalog (verification list for 15 §6)

Per 02 §5: own-rows CRUD on `profiles, people, onboarding_answers, memory_items, exact_phrases, never_include, gratitude_entries, favorites, notification_tokens, notification_prefs` · select-own + engagement-column-update on `moments, affirmations` · select-own only on `generation_jobs, subscription_state, experiment_assignments` · `usage_credits` select-own. **RLS tests** (15 §6) assert cross-user access fails for every table — a required CI suite, not optional.

## 3. Data minimization map (product 18 §1)

| Data                                     | Collected?                                               | Where         | Leaves the system?                                                       |
| ---------------------------------------- | -------------------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| Name, dream, people, struggle, free text | yes (product-essential)                                  | Postgres      | Only to LLM/TTS for that user's generation, under no-training terms (§8) |
| Email                                    | only at claim                                            | Supabase Auth | no                                                                       |
| Age/gender/career                        | optional profile fields, never required                  | Postgres      | no                                                                       |
| Location/contacts                        | **never**                                                | —             | —                                                                        |
| Analytics                                | structural metadata only (13 §2 — compile-time enforced) | PostHog       | pseudonymous                                                             |
| Ads/tracking SDKs                        | **never** (no ATT prompt needed)                         | —             | —                                                                        |

## 4. Sensitive-tier enforcement points (product 18 §5)

The struggle + crisis-adjacent items are `tier=sensitive`. Technical guarantees:

1. Prompt assembly injects sensitive items only into letter/moment **body** context (09 §4).
2. QA gate strips sensitive tokens from titles/share surfaces (08 §5).
3. Notification builder has no memory access at all (11 §3).
4. Share-card renderer receives only affirmation text + brand mark (no personal data — product 09 §9.3).
5. Analytics catalog has no field that could carry it (13 §2).
6. "Mark as done/private" flag → excluded from all generation (09 §2).

## 5. Crisis detection (resolves product 20-Q6)

**Layered design:**

1. **Keyword screen** (backend, deterministic): curated multilingual-ready list of self-harm/abuse/acute-distress terms + patterns; versioned in repo; conservative (high recall).
2. **Classifier confirm:** keyword hit → cheap LLM yes/no classification with strict rubric (avoids false positives on e.g. "my job is killing me" idioms). Both steps < 2s.
3. **Response:** endpoint 422 `crisis_support` → mobile shows product-18 copy ("Some things are heavier than an app should hold alone…") + region resources (config per launch region: US 988, UK/IE Samaritans, CA/AU lines); conversation never blocked; no generation on that theme; nothing stored in analytics; input itself is stored (it's the user's data) but flagged sensitive.
4. **Checked on:** S10 struggle, Manifest desire text, refine notes; gratitude entries checked async post-write (next-day generation excludes; if flagged, a gentle in-app supportive line replaces the next personalized prompt).
5. Copy + resource list get founder/legal review pre-launch (release gate).

## 6. Full-deletion runbook (product 18 §4 — "delete means delete")

`POST /v1/account/delete` executes (03 §5): Storage objects → `auth.admin.deleteUser` cascade → RevenueCat subscriber delete → PostHog person deletion → local wipe. Queued retries for 3–4; completion audit row in an ops table (user-id hash only). Stated window: 30 days. Also: anon-sweep (90-day inactive anonymous users) runs the same runbook. Sentry data: PII scrubbing on; user context is id-only.

## 7. GDPR/CCPA rights mapping (product 18 §platform)

| Right             | Mechanism                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Access            | "What Aura Knows" (in-app, complete memory view)                                               |
| Rectification     | Profile/memory editing                                                                         |
| Erasure           | Per-item delete + full account deletion                                                        |
| Portability       | V1.1 "download my data" (flagged; schema-ready)                                                |
| Objection/consent | Consent at S1 (ts stored); notification prefs; no marketing without opt-in (none exists at V1) |

## 8. Vendor compliance checklist (release gate)

- [ ] OpenAI: API no-training default confirmed + zero-data-retention/data-controls enabled on the org, verified in writing (08 §2)
- [ ] ElevenLabs: zero-retention mode confirmed for production account (10 §2)
- [ ] Supabase: EU/US region choice documented; DPA signed
- [ ] PostHog: DPA; no free-text audit passing (13)
- [ ] RevenueCat: DPA
- [ ] App Store privacy nutrition labels drafted from §3 map (data linked to user: purchases, user content, identifiers; no tracking)
- [ ] Privacy policy in plain companion voice (product 18 §3) + terms; legal review
- [ ] 17+ age rating; not marketed to minors

## 9. Content boundaries (product 18 §generation)

Enforced in prompt constitutions (08 §3): no medical/mental-health treatment claims · no guaranteed outcomes · no financial "manifest wealth" framing · third parties appear only as the user's own named people in their own narrative · "specific person" romantic desires framed as the user's feelings/future, never scripts to control another. QA banned-list covers the phrase-level cases; prompt rules cover the rest; golden tests sample-check (15 §5).
