# 15 — TESTING STRATEGY

_Test what protects the product: generation quality rules, privacy boundaries, money paths, and the wow funnel. Skip ceremony elsewhere._

---

## 1. Pyramid by workspace

| Layer       | Backend (`apps/backend`)                                                                                                | Mobile (`apps/mobile`)                                                                                        | Shared               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------- |
| Unit        | Jest: QA gate, prompt builders, memory sampler, phrase harvester, crisis keyword screen, credit logic, cron window math | Jest + RTL: hooks, stores, copy catalog, karaoke word-index math, cache policy                                | zod contract schemas |
| Integration | Nest testing module + Supabase local: pipeline with `MockLlm/MockTts`, webhook handlers, cron jobs                      | RTL component tests with mocked providers (screens render states: empty/loading/error/success per product 09) | contract tests (§4)  |
| E2E         | supertest against running app + local Supabase + mock providers                                                         | **Maestro** flows on simulator (§3)                                                                           | —                    |

## 2. The highest-value suites (build first, never skip)

1. **QA gate unit tests** (08 §5): every rule × pass/fail fixtures; banned-phrase list fully covered; Never-Include word-boundary cases; length bounds; negative-frame affirmation patterns; sensitive-title stripping. These tests ARE the product's quality bar.
2. **Prompt builder tests:** given a fixture memory context, assert verbatim tokens present in prompt, never-include terms absent, cadence directives correct (remembered-detail ≤1/wk logic), stable-prefix ordering (cache).
3. **Memory sampler tests** (09 §4): scoring, sensitive filtering per artifact, inactive-people exclusion, tier lifecycle (expiry conversion).
4. **RLS tests** (14 §2): for every table, authenticated-as-A cannot read/write B's rows; anon client can't bypass. Run against local Supabase in CI (required suite).
5. **Credit/entitlement tests:** weekly manifest cap + reset, refine lineage cap, free-tier 402s, webhook → mirror transitions (all RC event types).

## 3. Maestro e2e critical paths (staging, mock providers where needed)

| Flow                                                                      | Asserts                                                                                                         |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Install → onboarding → letter → paywall → dismiss → Home** (the funnel) | resume-mid-flow, edit-guard, skip S10, letter plays with karaoke, paywall shows honest pricing, free tier lands |
| Daily ritual                                                              | moment plays <300ms from cached, affirmation reveal, gratitude save offline→sync, done-state                    |
| Purchase (sandbox)                                                        | annual purchase → claim sheet → entitlement unlocks Manifest                                                    |
| Deletion                                                                  | typed confirm → signed out → fresh onboarding                                                                   |

## 4. Contract tests

Backend controllers parse requests/serialize responses through `@aura/shared` zod schemas; a CI test round-trips every schema's example fixtures through both the mobile api client types and backend DTOs — drift between apps fails the build (07 §6).

## 5. Generation-quality golden tests

20 synthetic user profiles (personas from product 02) → run prompt builder + QA gate against recorded `MockLlm` outputs AND (nightly, non-blocking, real key) against the live LLM: assert **properties** — token presence, length, no banned phrases, no never-include, name-first, date-close — never exact text. Nightly run trends pass-rate → generation-quality dashboard (13 §6). **Copy catalog lint:** CI greps `src/copy/**` and notification templates against the banned-phrase list + guilt-vocabulary list (product 14) — a failing string blocks merge. **Analytics privacy test:** catalog type-check + runtime test that no event payload accepts arbitrary strings (13 §2).

## 6. Quality bars in CI (gates)

- `turbo lint + typecheck + test` on every PR (affected packages).
- Required suites: QA gate, RLS, contracts, copy lint, analytics privacy.
- Coverage thresholds only on `generation/**`, `memory/**`, `safety/**` (90%) — global coverage % is not a goal.
- Maestro smoke (funnel flow) on merge to main via EAS build + Maestro Cloud (or local runner) — full suite pre-release.

## 7. Manual test rituals (per-phase DoD)

Each phase's Definition of Done (IMPLEMENTATION-PLAN) lists manual checks the founder runs on device: haptics feel, 60fps eyeball on iPhone 12-class device, VoiceOver walk, Dynamic Type max size, dark mode, and the phase's product-behavior checklist (e.g. Phase 10 = the 7-point anti-resentment checklist). Automation covers correctness; the calm-premium feel (product 12/13) is verified by hand.

## 8. What we deliberately don't test

Pixel-perfect snapshots (churny, low signal at V1 pace) · third-party internals (RC, Supabase, ElevenLabs — covered by contract mocks + staging smoke) · load testing (single-region small instance is fine until >10k MAU; revisit at scale — noted in 16 §7).
