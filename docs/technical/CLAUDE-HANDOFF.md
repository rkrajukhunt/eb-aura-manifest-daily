# CLAUDE HANDOFF — resume point

_Working handoff for Claude. Last updated: 2026-07-18, after Phase 5. Read this first, then `IMPLEMENTATION-PLAN.md` (the per-phase "as built" sections have the detail this file summarizes)._

## TL;DR — where we are

Building **Aura: Manifest Daily** (iOS manifestation app) phase by phase from `docs/technical/IMPLEMENTATION-PLAN.md`. Phases **0–6 and 10 are coded and committed; Phase 7's backend is done and its mobile half is not started**. Nothing has been verified on an iPhone yet (dev machine is Linux, no iOS simulator) — that's the founder's device walkthrough, pending. **Next: finish Phase 7's MOBILE half (the backend landed 2026-07-20).**

**The whole session-1 funnel now exists end to end**: onboarding → ritual → Letter → paywall → free tier or premium. It has never run on a phone, and no purchase has ever been made.

## Phase status

| #            | Phase                             | Status              | What "done" means / what's pending                                                                                                                                                                                                         |
| ------------ | --------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0            | Repository & Dev Foundation       | ✅ done             | monorepo, CI, local Supabase, both apps boot. Only gap: simulator boot unverified.                                                                                                                                                         |
| 1            | Design System & Mobile Foundation | 🟨 code-complete    | 16 components + Orb + theme + haptics/motion + copy lint. **Pending: founder device pass** (60fps orb, "calm is the brand"). Gallery at route `/gallery`.                                                                                  |
| 2            | Supabase Auth & User Foundation   | ✅ done             | anon-first auth, profiles, RLS, deletion, boot gate — all verified against live DB.                                                                                                                                                        |
| 3            | Onboarding "The Conversation"     | 🟨 code-complete    | S1–S11, draft resume, edit-guard, reflections, commit path. **Pending: founder device walkthrough.**                                                                                                                                       |
| 4            | Living Memory & Profile           | 🟨 code-complete    | schema + harvester + seed + What Aura Knows + Never-Include + Profile tab. Data layer fully verified (live RLS). **Pending: device walkthrough.**                                                                                          |
| 5            | AI Generation Backend             | 🟨 tests done       | pipeline proven + **all deferred suites written (2026-07-20)**; 701 backend unit tests, 71 live. **Pending: OpenAI bake-off + vendor no-retention check (both founder/staging).**                                                          |
| 6            | Future-Self Letter — WOW          | 🟨 code-complete    | ritual + `/letter` + karaoke + permanent cache + boot gate. **Pending: founder device pass — and it needs a dev-client REBUILD (`expo-audio` is a new native module).**                                                                    |
| 10           | Subscriptions & Paywall           | 🟨 code-complete    | schema + RC webhook + entitlement guard (all verified); paywall, gating, Settings, claim built. **Pending: a sandbox purchase has never run — no ASC products, no RC project, no key.**                                                    |
| 7            | Daily Moments & Audio Player      | 🟨 **backend only** | cron + window maths (41 tests) + credits + the three endpoints, all verified. **The ENTIRE mobile half is not started** — Home, player, mini-player, Read mode, Refine/Manifest sheets, prefetch/LRU. Nothing calls the new endpoints yet. |
| 8, 9, 11, 12 | —                                 | ⬜ not started      | finish Phase 7's mobile half first — it is about twice the size of a normal phase.                                                                                                                                                         |

🟨 = code-complete and machine-verified as far as this Linux box allows; the remaining item needs either a physical iPhone or (Phase 5) the deferred tests.

## Git state

- **Current branch: `phase-5-generation`** (working tree clean at handoff).
- Each phase is its own branch + commit, none merged to `main` yet. Recent commits:
  - `7db43c5` Phase 5: AI generation backend
  - `b8debd8` Validation pass: 6 gaps closed in Phases 1–4
  - `d9ce049` Phase 4 completion (Profile/sheets/Never-Include)
  - `aa13f73` Phase 3 onboarding
  - `9b60607` Phase 1 design system
  - Phase 0 and 2 commits earlier.
- **Ask the founder before merging to `main`** — they've kept branches separate deliberately.

## Test / verification status

- **1,210 automated tests green** across the monorepo: 51 shared, 325 mobile, 834 backend (829 unit + 5 e2e). Run: `pnpm turbo lint typecheck test`.
- **Live-stack backend suites** (need Supabase up): `cd apps/backend && pnpm test:live` — 81 tests (RLS for every table incl. `subscription_state` + audio bucket, + account deletion).
- **Phase 5's test debt is paid** (2026-07-20). Coverage on `generation/** · memory/** · safety/**` is 99.8% stmts / 91.5% branch, clearing 15 §6's 90% bar. Writing the suites caught **four real defects** — a sensitive-struggle leak into `winback` via a cadence directive, a prompt/QA disagreement that made value-anchored affirmations permanently un-passable, and two mock defects. All fixed; see the plan's "Phase 5 — test debt paid" section.
- **e2e was deliberately out of scope** for that pass (founder instruction), which is why `generation.controller.ts` is the one uncovered file in the generation tree.

## The hard rule: this project is phase-gated

Per `memory/aura-phase-workflow.md`: **never start a phase without explicit "go" from the founder.** Each phase: read PROJECT-KNOWLEDGE → the plan → the phase's referenced docs → inspect code → build → lint/typecheck/test → update the plan's status column + "as built" section → commit. Mark a phase ✅ only when its Definition of Done is genuinely met — otherwise 🟨 with the gap documented. Do not auto-advance.

## How to resume the environment

```bash
cd /media/emperorbrains/Projects/aura
nvm use && pnpm install
pnpm exec supabase start          # ~12 containers; may need a `supabase stop && start` if it came up partial after a reboot
pnpm turbo typecheck test         # sanity: should be green
```

Backend env lives in `apps/backend/.env` (gitignored, local Supabase demo keys — public constants, `LLM_PROVIDER=mock` `TTS_PROVIDER=mock`). Mobile env in `apps/mobile/.env.local`. To boot the backend: `cd apps/backend && node dist/main` (after `pnpm build`), or `pnpm dev`.

Founder device checklist for Phases 1/3/4 is in the plan's Phase 1 "as built" section: `pnpm exec expo run:ios`, open `aura://gallery`, run the conversation, check What Aura Knows.

## Load-bearing gotchas (bit us before; don't rediscover)

- **RLS needs GRANTs too.** Policies alone deny everything — every user table needs `grant ... to authenticated` AND policies. `02 §5` documents it. Content tables (moments/affirmations) use **column-level** grants so users can set engagement marks but not overwrite `body`.
- **`fireEvent` in RNTL v14 is async** — `await` it, or state-dependent assertions pass vacuously.
- **RNTL v14 `render` is async** — `await render(...)`.
- **ESM-only libs break the CJS backend/jest**: jose pinned to 5.x, p-queue avoided (hand-rolled queue instead). Watch for this on any new dep.
- **jest transform for pnpm**: scoped native libs need both `@scope/pkg` and `@scope+pkg` spellings in `transformIgnorePatterns` (mobile `jest.config.js`).
- **Skia pinned to 2.6.2** to match Expo SDK 57's native (expo-doctor). Don't bump past what the SDK expects.
- **Timers in components must clean up on unmount** — screen-level `setTimeout` leaked past navigation (caught by jest's force-exited worker). Reflection dwell + sheet-close timers now live inside their components.
- **The mock LLM must return QA-passing JSON**, or the whole generation pipeline is unrunnable locally. If you touch prompts or QA, keep the mock (`apps/backend/src/providers/llm/mock-llm.provider.ts`) in sync — it harvests tokens from the prompt's context block.
- **Generated DB types live in `packages/shared/src/types/database.types.ts`** (not `supabase/types/`). Regenerate after every migration: `pnpm db:types`.
- **RNTL v14: `renderHook` is async too**, not just `render` — and `result.current` is null until it resolves. Await it.
- **A hook holding an interval will poison the tests after it** if a test leaves it mounted: unmount explicitly, or extract the logic and test it pure (Phase 6 did the latter for `generationState`).
- **Installing a new native module makes the next jest run look broken** — the cold transform cache alone pushed the mobile suite from 4s to 23s and timed a suite out. Re-run before believing it.
- **`expo-audio` config plugin adds `NSMicrophoneUsageDescription` by default.** It is passed `microphonePermission: false` in `app.config.ts` to delete it — Aura never records. Do not drop that option.

## Locked decisions (founder, 2026-07-17)

- Brand: **"Aura: Manifest Daily"**; bundle id **`com.aura.manifestdaily`**.
- LLM vendor: **OpenAI** (model tiers pinned by the Phase 5 bake-off, not yet run — env has placeholder ids `gpt-4.1`/`-mini`/`-nano`).
- TTS: ElevenLabs. Stack: Expo SDK 57, RN 0.86, NestJS 11, Node 22.12, TS 5.9, Supabase.

## Phase 5 debt (do before calling Phase 5 ✅)

- ~~Core unit suites (15 §2)~~ — **done 2026-07-20.** QA gate, prompt builders, memory sampler, crisis screen, job state machine, concurrency queue, pipeline integration, golden 20 personas, RLS for the 4 new tables.
- OpenAI model-tier bake-off (08 §2) — founder/staging. Env still holds placeholder ids.
- Vendor no-retention terms verified (14 §8) — release gate.
- DoD's "latency <40s p90 against real vendors in staging" — unmeasured; no real vendor call has been made.

Also open (raised, not fixed): the explicit-callback cadence guard checks for any recent _moment_, not any recent _callback_, so active users never become eligible. Needs a place to record a spent callback — a schema decision for the founder.

## Phase 6 device checklist (founder — this is the phase's DoD)

**Needs a dev-client rebuild, not a reload**: `expo-audio` is a new native module. `pnpm exec expo run:ios`.

1. Finish the conversation → the ritual should start immediately (no Home flash).
2. Three lines arrive at reading pace; the gradient sinks toward dusk; the orb breathes faster. No spinner anywhere.
3. The Letter opens, audio starts, ONE light haptic on the first word.
4. Karaoke stays locked to the voice at 60fps; earlier lines dim, the page scrolls itself, nothing is tappable.
5. A soft tick on the "…on a Friday in July" line — and nowhere else.
6. Last line hangs ~2s, then "Your future self has more to tell you." + Continue.
7. Swipe down mid-letter → the pause sheet, not an exit.
8. Kill the app mid-letter and relaunch → it reopens into the Letter.
9. Airplane mode → replay still works (permanent cache).
10. The judgement the phase is actually graded on: **would this give goosebumps?**

## Phase 10 — what the founder must do before it can be ✅

None of this is code; all of it is account setup only you can do.

1. **App Store Connect**: create `aura_premium_annual` ($39.99/yr, no trial) and `aura_premium_weekly` ($6.99/wk, 7-day trial). Category Health & Fitness.
2. **RevenueCat**: project + entitlement `premium` + offering `default` with both packages, annual first. Copy the iOS SDK key into `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
3. **Webhook**: point RevenueCat at `POST /v1/webhooks/revenuecat` and set the same shared secret in `REVENUECAT_WEBHOOK_AUTH`. The endpoint **fails closed** — an unset secret rejects everything, so this is not optional.
4. **Sign in with Apple**: enable the capability on the ASC identifier (`usesAppleSignIn` is already set in `app.config.ts`).
5. **Sandbox**: a sandbox tester account, then run annual and weekly-with-trial purchases end to end, including the claim sheet.

Until step 2 exists, the app runs with everyone on the free tier and the paywall shows nothing — that degradation is deliberate (12 §2), not a bug.

## Phase 6 open item

The **volume pre-check is a deliberate no-op**. Product 08 §4 wants "turn your sound on" when her volume is 0, but `expo-audio` exposes only the player's volume, not the device's. `readSystemVolume()` returns `null` and the prompt never shows, because nagging someone whose sound is already on — at that exact moment — is worse than staying quiet. A real reading needs another native module; founder call, best bundled with the Phase 7 player rebuild.

## What comes next

The plan's recommended order puts **Phase 10 (paywall)** straight after the Letter — the session-1 funnel is the product's north star, and the anonymous-purchase→claim flow is the highest-risk integration. Continue currently lands on Home; Phase 10 slots the paywall in between and inherits the Letter's gradient.

**Phase 7 (Daily Moments & Audio Player)** is the other option, and it inherits real foundations from Phase 6:

- `audioCache` already carries a `permanent` flag, so the 200MB LRU sweep has something to respect from day one — the Letter and favourites are already marked untouchable.
- The karaoke maths (`karaoke.ts`) is pure and vendor-neutral; Read mode needs sentence-level grouping over the same word timings.
- Playback is currently a Letter-scoped hook by design. Phase 7 introduces the singleton `PlayerService` + mini-player (10 §4/§8); the extracted pure modules move across unchanged.
- The backend for daily moments does **not** exist yet — Phase 5 shipped only the Letter endpoint; `daily`/`ondemand`/`refine` are absent by design (a 404 is honest).
