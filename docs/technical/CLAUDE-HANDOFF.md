# CLAUDE HANDOFF — resume point

_Working handoff for Claude. Last updated: 2026-07-18, after Phase 5. Read this first, then `IMPLEMENTATION-PLAN.md` (the per-phase "as built" sections have the detail this file summarizes)._

## TL;DR — where we are

Building **Aura: Manifest Daily** (iOS manifestation app) phase by phase from `docs/technical/IMPLEMENTATION-PLAN.md`. Phases **0–5 are all coded and committed**. Nothing has been verified on an iPhone yet (dev machine is Linux, no iOS simulator) — that's the founder's device walkthrough, pending. Execution order being followed: **0 → 1 → 2 → 3 → 4 → 5 → 6 → …**. **Next phase: 6 (Future-Self Letter — the WOW).**

## Phase status

| #    | Phase                             | Status             | What "done" means / what's pending                                                                                                                                |
| ---- | --------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Repository & Dev Foundation       | ✅ done            | monorepo, CI, local Supabase, both apps boot. Only gap: simulator boot unverified.                                                                                |
| 1    | Design System & Mobile Foundation | 🟨 code-complete   | 16 components + Orb + theme + haptics/motion + copy lint. **Pending: founder device pass** (60fps orb, "calm is the brand"). Gallery at route `/gallery`.         |
| 2    | Supabase Auth & User Foundation   | ✅ done            | anon-first auth, profiles, RLS, deletion, boot gate — all verified against live DB.                                                                               |
| 3    | Onboarding "The Conversation"     | 🟨 code-complete   | S1–S11, draft resume, edit-guard, reflections, commit path. **Pending: founder device walkthrough.**                                                              |
| 4    | Living Memory & Profile           | 🟨 code-complete   | schema + harvester + seed + What Aura Knows + Never-Include + Profile tab. Data layer fully verified (live RLS). **Pending: device walkthrough.**                 |
| 5    | AI Generation Backend             | 🟨 pipeline proven | full pipeline proven end-to-end on live stack w/ mock providers. **Pending: the deferred unit suites (see below) + OpenAI bake-off + vendor no-retention check.** |
| 6–12 | —                                 | ⬜ not started     | next up: Phase 6.                                                                                                                                                 |

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

- **221 automated tests green** across the monorepo: 51 shared, 147 mobile, 23 backend (18 unit + 5 e2e). Run: `pnpm turbo lint typecheck test`.
- **Live-stack backend suites** (need Supabase up): `cd apps/backend && pnpm test:live` — 45 tests (RLS for all tables + account deletion). Phase 5 added NO tests to this (deferred).
- **Phase 5 was proven by driving the real pipeline**, not by unit tests (founder deferred them). A letter generates end-to-end: name-first, QA passes, mp3 in storage, word timings; crisis-on-letter produces a supportive letter with no struggle leak.

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

## Locked decisions (founder, 2026-07-17)

- Brand: **"Aura: Manifest Daily"**; bundle id **`com.aura.manifestdaily`**.
- LLM vendor: **OpenAI** (model tiers pinned by the Phase 5 bake-off, not yet run — env has placeholder ids `gpt-4.1`/`-mini`/`-nano`).
- TTS: ElevenLabs. Stack: Expo SDK 57, RN 0.86, NestJS 11, Node 22.12, TS 5.9, Supabase.

## Phase 5 debt (do before calling Phase 5 ✅)

The founder deferred tests for Phase 5. Owed before it's truly done (all listed in the plan's Phase 5 "as built"):

- Core unit suites (15 §2): QA gate exhaustive, prompt builders, memory sampler, crisis screen, job state machine, RLS for the 4 new tables, golden 20-persona tests.
- OpenAI model-tier bake-off (08 §2) — founder/staging.
- Vendor no-retention terms verified (14 §8) — release gate.

## What Phase 6 will need (next up)

Phase 6 (Letter WOW) is **mobile** work that consumes the Phase 5 backend: the generating ritual screen, the `/letter` full-screen cover, the karaoke renderer synced to `word_timings`, silent-switch pre-check, permanent letter cache. It's device-visual, so expect it to land 🟨 (code-complete, device pass pending) like Phases 1/3. The backend it needs (`POST /v1/generation/letter`, `GET /jobs/:id`, `useGenerationJob` hook) already exists and is proven.
