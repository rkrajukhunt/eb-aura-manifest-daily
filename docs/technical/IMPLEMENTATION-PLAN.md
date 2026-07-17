# IMPLEMENTATION PLAN

_Phased build plan for Aura V1. Each phase is sized for independent implementation by Claude Code. Statuses are updated as phases complete. Before implementing any phase: read PROJECT-KNOWLEDGE.md, this plan, the phase's referenced docs, and inspect the existing codebase. Never start the next phase without explicit approval._

**Status legend:** ⬜ not started · 🟨 in progress · ✅ done

| #   | Phase                                     | Status |
| --- | ----------------------------------------- | ------ |
| 0   | Repository & Development Foundation       | ✅     |
| 1   | Design System & Mobile Foundation         | 🟨     |
| 2   | Supabase Auth & User Foundation           | ✅     |
| 3   | Onboarding — "The Conversation"           | 🟨     |
| 4   | Living Memory & Profile                   | 🟨     |
| 5   | AI Generation Backend                     | ⬜     |
| 6   | Future-Self Letter — WOW                  | ⬜     |
| 7   | Daily Moments & Audio Player              | ⬜     |
| 8   | Affirmations & Gratitude                  | ⬜     |
| 9   | Notifications & Daily Habit Loop          | ⬜     |
| 10  | Subscriptions & Paywall                   | ⬜     |
| 11  | Analytics & Experimentation               | ⬜     |
| 12  | Polish, Performance & App Store Readiness | ⬜     |

## Dependency graph

```mermaid
graph LR
    P0[0 Foundation] --> P1[1 Design System]
    P0 --> P2[2 Auth]
    P1 --> P3[3 Onboarding]
    P2 --> P3
    P2 --> P4[4 Memory]
    P4 --> P5[5 AI Backend]
    P2 --> P5
    P3 --> P6[6 Letter WOW]
    P5 --> P6
    P6 --> P10[10 Paywall]
    P5 --> P7[7 Moments]
    P6 --> P7
    P7 --> P8[8 Affirm+Gratitude]
    P5 --> P8
    P7 --> P9[9 Notifications]
    P10 --> P11[11 Analytics]
    P9 --> P11
    P8 --> P11
    P11 --> P12[12 Polish/Store]
```

## Recommended execution order

**0 → 1 → 2 → 3 → 4 → 5 → 6 → 10 → 7 → 8 → 9 → 11 → 12**

Rationale: Phase 10 (paywall) is pulled forward right after the Letter because the session-1 funnel (install → wow → paywall) is the product's north star — building it early lets TestFlight cohorts exercise the real conversion path and de-risks the anonymous-purchase→claim flow (the highest-risk integration, per Stella's review history) while retention features are still being built. Phases 7 and 10 are independent and can proceed in parallel if capacity allows.

---

## Phase 0 — Repository & Development Foundation

- **Objective:** Working monorepo with all three workspaces building, linting, testing in CI; local Supabase; skeleton apps boot.
- **User outcome:** None user-visible; every later phase moves faster and safer.
- **Dependencies:** None.
- **Backend tasks:** NestJS skeleton (`app.module`, config with zod-validated env, `HealthModule` with `/v1/health`, Sentry init, pino logging); `mock` LLM/TTS provider stubs registered.
- **Mobile tasks:** Expo app init (TS strict, dev client, expo-router skeleton with placeholder tabs), EAS project + `eas.json` profiles, Sentry init, MMKV + supabase client wiring stubs, path aliases.
- **Database changes:** `supabase init` + config; empty migration baseline; type-generation script.
- **API endpoints:** `GET /v1/health`.
- **External integrations:** Sentry (both), EAS, GitHub Actions CI (`lint`/`typecheck`/`test`/build via Turborepo), husky + lint-staged.
- **Analytics events:** None (PostHog wrapper stub created in `packages/shared` events scaffold).
- **Tests:** CI green: unit test harness runs in all 3 workspaces (one trivial test each); health e2e (supertest).
- **Edge cases:** Node/pnpm versions pinned; `.env.example` complete; fresh-clone bootstrap documented in README (one command to running local stack).
- **Definition of Done:** Fresh clone → `pnpm i && pnpm dev` runs backend + local Supabase; Expo dev client builds and boots on simulator; CI passes; `01-REPOSITORY-STRUCTURE.md` matches reality.

### Phase 0 — as built (2026-07-17)

Versions: Expo SDK 57.0.7 · React Native 0.86 · NestJS 11 · Node 22.12.0 · pnpm 10.4.1 · Turborepo 2 · TypeScript 5.9.

Decisions taken during implementation (each already reflected in the docs it touches):

1. **Bundle id `com.aura.manifestdaily`** (founder, 2026-07-17). Variant suffixes `.dev`/`.staging` let all three builds coexist on one device. Brand stays isolated to `app.config.ts`.
2. **`@aura/shared` is a compiled package**, and generated DB types live in `packages/shared/src/types/database.types.ts` rather than `supabase/types/` — `tsc`'s `rootDir` rejects cross-package source imports, so anything shared re-exports must sit inside its own tree. 01 §4/§5 updated.
3. **TypeScript pinned to 5.9 monorepo-wide**, excluded from Expo's version check. Expo SDK 57 suggests TS 6, but `ts-jest@29` declares peer `>=4.3 <6` and `@nestjs/cli@11` pins 5.7.3 — one TS across all workspaces beats matching the suggestion. Revisit when ts-jest supports TS 6.
4. **Health probes are real, not stubbed.** `db`/`storage` hit Supabase over HTTP since `SupabaseModule` doesn't exist until Phase 2. **Phase 2 should swap them for the injected service-role client** (a real query beats a gateway 200) and must mark `/v1/health` public when the global auth guard lands — otherwise the host health check reads 401 as "down".
5. **Anonymous sign-in + manual linking enabled** in `supabase/config.toml` now (00 §D2, 03 §2.2) so the auth model is identical in every environment from day one.

Known gaps, deliberately deferred:

- **EAS project not initialised** — `eas.json` profiles exist but `eas init` needs the founder's Expo account; `extra.eas.projectId` reads from `EAS_PROJECT_ID`. `submit.production` carries `TODO_PHASE_10` placeholders (needs App Store Connect).
- **`migrate-staging.yml` / `release.yml` not written** (01 §7) — they need real staging/production projects; they belong with Phase 12 deployment.
- **Simulator boot unverified** — built on Linux, so `expo run:ios` was never executed. The iOS bundle exports cleanly (Hermes, 3.8MB), which proves the module graph resolves, but _founder must confirm the dev client boots on a simulator_ to close the DoD.
- No app icon or splash asset yet (Phase 12).

## Phase 1 — Design System & Mobile Foundation

- **Objective:** Token system, core components, the Orb, tab shell, sheets, haptics/motion utilities — the visual language of product docs 12/13 as code.
- **User outcome:** App feels calm-premium from the first screen ever built on it.
- **Dependencies:** 0.
- **Backend tasks:** None.
- **Mobile tasks:** `src/theme` tokens (colors incl. dark scheme, serif+sans typography with Dynamic Type clamps, 8pt spacing, radii); components: `Screen` (gradient), `Card` (solid/glassy), `PillButton`, `TextButton`, `Chip`, `SelectCard`, `Input`, `Sheet` (gorhom wrapper w/ detents), `TabBar` (floating pill), `Label`, `SerifDisplay`, `CountdownChip`, `WeekDots`, `Skeleton`, `EmptyState`; **Orb** (Skia + Reanimated: idle/listening/generating/speaking states, Reduce Motion fallback); haptics util implementing product-13 table with guards; motion helpers (`fadeRise`, `chipSelect`, `crossfade`, `MotionContext`); `src/copy` catalog structure with initial strings; bundled fonts.
- **Database changes:** None.
- **API endpoints:** None.
- **External integrations:** Skia, Reanimated, gorhom/bottom-sheet, expo-haptics.
- **Analytics events:** None.
- **Tests:** RTL renders for each component (incl. Dynamic Type reflow breakpoint); haptics guard unit tests (≤2/screen dev warning, 500ms spacing); copy-lint script scaffold (banned phrases).
- **Edge cases:** Reduce Motion on every animation; dark mode on every component; fontScale >1.3 chip→list reflow.
- **Definition of Done:** Storybook-style gallery screen shows all components in light/dark; Orb runs 60fps on iPhone 12-class device in all 4 states; founder eyeballs "calm is the brand" on device.

### Phase 1 — as built (2026-07-17) — 🟨 code-complete, device sign-off pending

Everything verifiable off-device is done and green; the two DoD items that require an iPhone (60fps orb, "calm is the brand") are the founder's checklist below.

**Built:**

- `src/theme`: palette (raw values live ONLY there), semantic tokens per scheme, 8pt spacing, radii, durations; serif (bundled Fraunces) + sans typography with Dynamic Type clamps (serif clamps 0.85–1.4 so Letter karaoke survives accessibility sizes; UI sans scales freely); chip→list reflow breakpoint at fontScale 1.3; `ThemeProvider`/`useTheme` (throws outside provider — an unthemed screen must fail loudly).
- Haptics (product-13 table, complete): typed `HapticEvent` union with **no `error` and no `paywall` member — the banned haptics are unrepresentable**, not just discouraged; 500ms min interval; ≤2/screen dev warning; system-setting kill switch. 13 guard tests.
- Motion: `fadeRise`, `chipSelectScale`, `crossfade`, `sheetSpring`, `MotionProvider` (+`LetterMotionProvider` at 1.2×); Reduce Motion collapses everything to crossfades and reacts to mid-session toggles.
- 16 components, RTL-tested: Screen (gradient), Card (solid/glassy), PillButton, TextButton, Chip, SelectCard, Input, Sheet (gorhom v5, medium/large detents, 40% dim), TabBar (floating pill, active periwinkle), Label, SerifDisplay, CountdownChip (minute tick, no seconds, no animation), WeekDots (no missed-day state exists — shame-free by construction), Skeleton, EmptyState, **Orb** (Skia: 4 states, breath/glow/shimmer on shared values only, halo overscan, hidden from VoiceOver as presence-not-information).
- Copy lint wired as a jest suite over `src/copy/**`: banned phrases + guilt vocabulary (lists live in `@aura/shared` so the Phase 5 QA gate reads the same ones), exclamation budget, "the user" ban, error-code ban.
- ESLint rule: raw hex in feature code is an error; `src/theme/` exempt.
- Root layout: Fraunces held behind the splash (font failure falls back rather than bricking launch), ThemeProvider → MotionProvider → QueryClient → BottomSheetModalProvider → BootGate; GestureHandlerRootView at top. Tab shell uses the pill TabBar.
- Gallery at `/gallery` (dev-only route): all components, light and dark stacked, orb state switcher.

**Decisions:**

1. **Chip press scale is an acknowledgment, not a state** — tying 0.97 to `selected` left chosen chips permanently shrunken. Selection's lasting signal is the fill tint.
2. **Skia pinned to 2.6.2** (Expo SDK 57's expectation, expo-doctor 20/20) — a newer JS lib against the dev client's pinned native module is a runtime mismatch on device.
3. Jest stack for the animation libs: reanimated's official mock + `react-native-worklets/jest/resolver` + Skia's `jestSetup`; pnpm needs `@scope+pkg` spellings in `transformIgnorePatterns` alongside `@scope/pkg`.
4. TabBar types a **local structural subset** of `BottomTabBarProps` — the real type isn't importable under pnpm strict node_modules (transitive dep); stays assignable at the `tabBar=` call site.

**Founder device checklist (closes this phase):**

- [ ] `pnpm exec expo run:ios`, open `aura://gallery` (or /gallery from the dev menu)
- [ ] Orb: all 4 states at 60fps (Perf monitor), iPhone 12-class
- [ ] Light + dark both read as "calm is the brand"; nothing shouts
- [ ] Dynamic Type at max accessibility size: serif clamps, chips reflow to lists
- [ ] Reduce Motion on: everything crossfades, orb stills
- [ ] Haptics: button press, chip select — punctuation, not decoration
- [ ] Sheet detents (medium/large), grabber, 40% dim
- [ ] Boot: fresh install → anonymous session + profile row; kill/relaunch keeps session (Phase 2's carry-over items)

## Phase 2 — Supabase Auth & User Foundation

- **Objective:** Anonymous-first identity, profiles, RLS baseline, boot gating, analytics identity, deletion primitive.
- **User outcome:** Invisible — the app just works on first open with no signup.
- **Dependencies:** 0.
- **Backend tasks:** `SupabaseAuthGuard` (JWT verify → userId); `SupabaseModule` (service-role client); `POST /v1/account/delete` (Storage wipe + `auth.admin.deleteUser`; RC/PostHog deletion queued as no-ops until those phases).
- **Mobile tasks:** Supabase client with secure-store session persistence; boot sequence (05 §9): anon sign-in, hydrate, route gate skeleton (onboarding-incomplete → onboarding placeholder); `useProfile` hook; PostHog init + `identify`; analytics wrapper with first events.
- **Database changes:** Migration: `profiles` (+ creation trigger on auth.users), `onboarding_answers`; RLS baseline policies; indexes.
- **API endpoints:** `POST /v1/account/delete`.
- **External integrations:** PostHog SDKs (mobile identify + backend module stub).
- **Analytics events:** `app_first_open`, `app_open {source}`.
- **Tests:** RLS suite for `profiles`/`onboarding_answers` (the pattern all tables follow); guard unit tests (valid/expired/garbage JWT); boot-flow hook tests; deletion e2e (rows + auth user gone).
- **Edge cases:** Token refresh + 401-retry in api client; offline first-launch (retry anon sign-in with backoff, honest waiting state); clock skew.
- **Definition of Done:** Fresh install → anonymous user + profile row exist; kill/relaunch keeps session; deletion wipes and returns to fresh state; RLS tests green in CI.

### Phase 2 — as built (2026-07-17)

Built before Phase 1 (founder call): Phase 2 depends only on Phase 0, and its work is verifiable against a real database, whereas Phase 1 is on-device visual work that the Linux dev machine cannot check.

Decisions and findings:

1. **GRANTs are part of the RLS baseline.** Policies alone deny everything — the `authenticated` role also needs table privileges. The RLS suite caught this (`42501 permission denied`) before it could block Phase 3. **Every later table migration must include both**, or nothing works. `anon` is granted nothing: anonymous _sign-in_ users carry role `authenticated`, so `anon` means no JWT at all.
2. **JWT verification is asymmetric (ES256 via JWKS).** Local Supabase issues ES256 tokens and serves `/auth/v1/.well-known/jwks.json`, so 03 §3's preferred "no shared secret" path is the one implemented. `jose` caches keys and refetches only on an unseen `kid` — no per-request round-trip, survives rotation.
3. **jose pinned to 5.x.** jose 6 is ESM-only and cannot be `require`d by the CommonJS NestJS/Jest setup. The JWKS resolver is an injected provider (`JWKS_RESOLVER`) rather than constructed inside the guard, so tests supply a local key set and still exercise real signature verification.
4. **Auth is global and opt-out** (`@Public()`), not opt-in. Forgetting a guard on a generation endpoint would expose memory; forgetting `@Public()` only breaks that route loudly. `/v1/health` is `@Public()` — an e2e test pins this, since a 401 there makes the load balancer pull the instance.
5. **Deletion is idempotent.** A retry after deletion returns 204: the JWT still verifies for its remaining lifetime, and the desired state already holds. Storage is wiped _before_ `deleteUser`, because Postgres cascades rows but cannot reach Storage — deleting the user first orphans the audio with no owner left to identify it.
6. **`values ≤ 2` is a DB check constraint**, not just UI validation (product 07 S6).
7. **`test:live`** is the Docker-dependent suite (RLS + deletion e2e); `test` stays Docker-free. CI runs both, and the live job also verifies the committed `database.types.ts` matches the migrations.

Verified: 61 tests green — 20 against a live Supabase, including that Alice's unfiltered `select *` cannot surface Bob's struggle text, that a forged `user_id` insert is rejected, that a wrong-key/wrong-issuer JWT is refused, and that deletion actually removes the auth user and cascades the rows.

Known gaps, deliberately deferred:

- **PostHog is a no-op without a key** (16 §1: disabled locally). `identify` + `app_first_open`/`app_open` are wired and unit-tested, but no event has been observed landing in a real PostHog project — needs a staging key.
- **RevenueCat and PostHog person-deletion** (steps 3–4 of the 03 §5 runbook) are intentionally absent until Phases 10/11 own those integrations.
- **Boot sequence unverified on device** — same Linux limitation. `useBoot`, `ensureSession` retry/backoff, the route gate and the first-open flag are unit-tested and the app bundles, but "fresh install → anonymous user + profile row" and "kill/relaunch keeps session" are _founder sign-off items_ on a simulator.
- `BootGate` copy is placeholder; Phase 1 replaces it with the orb + `src/copy/` in-voice lines.

## Phase 3 — Onboarding — "The Conversation"

- **Objective:** S1–S11 per product doc 07: one question per screen, reflections, edit-guard, resume, skip rules — writing profile + answer log.
- **User outcome:** A 4–5 minute conversation that feels like being listened to, ending ready for the Letter.
- **Dependencies:** 1, 2.
- **Backend tasks:** None (answers go mobile→Supabase; crisis check on S10 happens in Phase 5 when the safety service exists — until then S10 stores verbatim only; flag noted for Phase 5 to backfill the check into the letter call path).
- **Mobile tasks:** `(onboarding)` stack: S1 welcome (price-honesty line — config value), S2 meet-Aura (typing dots), S3 name, S4 self-description + reflection echo, S5 work chips, S6 values multi≤2, S7 dream-home cards (8 illustrations), S8 dream city + reflection, S9 people (add 2–3, "Just me for now" path), S10 struggle (gentle reflection; skippable "Not today"), S11 arrival time; draft store (Zustand+MMKV) with resume; edit-guard sheet; transitions 350ms push+crossfade; keyboard-floating Continue; per-answer commit to `onboarding_answers` + profile fields; timezone capture.
- **Database changes:** Migration: `people` + RLS.
- **API endpoints:** None.
- **External integrations:** None.
- **Analytics events:** `onboarding_started`, `onboarding_screen_viewed`, `onboarding_answer_submitted {screen_id, answer_type, skipped, char_count_bucket}`, `onboarding_completed {duration_s, questions_answered}`.
- **Tests:** RTL per screen (input/skip/reflection states); draft-resume unit tests; edit-guard flow test; Maestro: full flow incl. kill-and-resume, edit an earlier answer, skip S10.
- **Edge cases:** App killed mid-flow → exact-screen resume; offline → answers cached, sync on reconnect with honest copy; emoji/very-long name gentle trim; empty free-text nudge ("even one word helps me"); VoiceOver labels; Dynamic Type chips→list.
- **Definition of Done:** Full conversation runs on device matching product 07 screen specs (copy, animation, haptics); data lands correctly in `profiles`/`onboarding_answers`/`people`; completion event fires with correct duration; founder walkthrough sign-off on feel.

### Phase 3 — as built (2026-07-17) — 🟨 code-complete, device walkthrough pending

**Built:** `people` migration (+GRANTs+RLS, 6 live tests); S1–S11 as thin routes over feature screens sharing one `ConversationScreen` shell + `useConversation` hook; MMKV-persisted draft store (exact-screen resume, never rewinds past where she parked, skips count as answered); edit-guard sheet (revise-never-restart, nested edits keep the original return point); reflection beats (600ms typing dots, soft tick, Reduce Motion keeps the pause but drops the dots); commit path writing every answer to BOTH `onboarding_answers` (audit) and the working copy (profile/people), offline answers queued and drained; completion stamps `onboarding_completed_at` + timezone, seeds Living Memory via Phase 4's `seedMemoryForUser`, fires `onboarding_completed`; funnel events in the typed catalog (free text traced only as `char_count_bucket`).

**Decisions / deviations:**

1. **"Restore purchase" absent from S1** rather than inert — a dead button is dishonest; it lands with RevenueCat (Phase 10).
2. **S11 "pick a time" is hour chips**, not a native wheel — a new native module for one screen wasn't worth a dev-client rebuild mid-phase; hour granularity serves the 15-minute cron windows (04 §5). Swappable in Phase 12 without touching the data shape.
3. **S9 people sync is replace-all-mine** — retried/edited submissions can't duplicate her circle; safe while onboarding is the only writer.
4. **S6 at the 2-cap replaces the oldest pick** instead of dead-tapping.
5. RNTL v14 `fireEvent` is async — every state-dependent test awaits it (a sync call passes vacuously; two of ours initially did).
6. S4's echo uses the Phase 4 harvester on-device; nothing distinctive → generic "Noted." (silence over a wrong guess).

**Founder walkthrough checklist:** full conversation on device (copy/animation/haptics feel); kill mid-flow → exact-screen resume; edit an earlier answer via the sheet; skip S10 via "Not today"; rows land in `profiles`/`onboarding_answers`/`people`; memory seed appears in What Aura Knows; airplane-mode answers sync on reconnect. Maestro flows deferred to device availability.

## Phase 4 — Living Memory & Profile

- **Objective:** Memory schema + write paths from onboarding/profile, phrase harvester, "What Aura Knows" transparency screen, Never-Include — the moat's foundation (docs 09-MEMORY, 02).
- **User outcome:** Profile tab shows everything Aura knows, editable, with per-item delete and Never-Include — trust made visible.
- **Dependencies:** 2 (3 provides real data but is not a hard build dependency).
- **Backend tasks:** Phrase harvester (pure function in shared or backend lib); onboarding-seed routine (profile → memory_items + exact_phrases) — runs server-side at letter request time or as mobile-triggered seed on onboarding completion (choose at implementation: seed-on-completion via Supabase direct writes keeps backend out; harvester lives in `packages/shared` so both apps can run it — recommended).
- **Mobile tasks:** Profile tab per product 11 (basics, dream, people, lifestyle tags, free-text note); "What Aura Knows" screen (plain-language list, per-item delete with confirm); Never-Include list UI; edit flows as sheets; "I'll write differently from now on" save copy; memory-contract copy surfaces.
- **Database changes:** Migration: `memory_items`, `exact_phrases`, `never_include` + RLS + indexes; expiry sweep SQL prepared (cron activates Phase 5).
- **API endpoints:** None (all Supabase direct).
- **External integrations:** None.
- **Analytics events:** `memory_item_created {category, source}`, `memory_item_deleted {category}`, `never_include_added`, `what_aura_knows_viewed`.
- **Tests:** Harvester unit tests (fixtures: quotes, proper nouns, distinctive phrases, stopwords); tier/expiry field logic; RLS for the three tables; RTL: What Aura Knows renders/deletes; seed-routine test (onboarding fixture → expected items).
- **Edge cases:** Deleting a person referenced by items (items filtered via `people.active`, 09 §4); empty memory states in-voice; duplicate phrase dedup; sensitive items visually private in the list (no special badge that stigmatizes — same rendering, just never in other surfaces).
- **Definition of Done:** Completing onboarding produces the expected memory seed; What Aura Knows lists it in plain language; deletes are hard deletes; Never-Include persists; events fire.

### Phase 4 — partially built (2026-07-17) — 🟨

Built out of order (founder call) because the memory **data layer** is verifiable against a real database on the Linux dev machine, whereas its **UI surfaces** need the Phase 1 design system. e2e was explicitly descoped by the founder for this phase; the RLS suite was kept — it is release-blocking (15 §6) and this is the phase where the sensitive tier lands.

**Done:**

- `memory_items`, `exact_phrases`, `never_include` — schema + GRANTs + RLS + indexes, incl. the partial index for the expiry sweep. `expire_temporary_memory()` is defined and verified; Phase 5 attaches the pg_cron schedule.
- Phrase harvester + onboarding seed + emotional weight in `@aura/shared` (09 §1/§3) — pure, deterministic, exhaustively unit-tested.
- Memory data access, TanStack Query hooks, optimistic delete, `seedMemoryForUser` write path for Phase 3 to call on completion.
- "What Aura Knows" screen — behaviour and copy only; styling is placeholder.
- Analytics: `memory_item_created`, `memory_item_deleted`, `never_include_added`, `what_aura_knows_viewed`.

**Decisions and findings:**

1. **Two DB invariants the schema now enforces**, rather than trusting callers: a `temporary` item must carry `expires_at` and a non-temporary must not (the tier/expiry pair can't drift), and `emotional_weight` is constrained to 1–5.
2. **`excluded` column added to `memory_items`** — 09 §2 requires a "done/private" flag that 02 §2's table did not list. Distinct from deletion: the row survives, it just stops being spent. 02 §2 updated.
3. **Harvester bug — names sliced in half.** Window scanning produced `"wake up in New"` from `"…in New York someday"`. Echoing a half-name back to her is the worst failure this module has. Fixed by masking quoted spans and proper nouns out of the text before the window scan; regression-tested.
4. **Harvester bug — short names dropped.** A 4-char minimum silently discarded `"Ivy"`, so a user whose daughter is named Ivy would never hear her name echoed — while the Letter's whole promise is naming her people (product 08). Proper nouns now have their own 2-char floor.
5. **Phrase dedupe is an expression index** `(user_id, lower(phrase))`, which PostgREST's `onConflict` cannot name (it takes plain columns only). The seed write path therefore reads existing phrases and filters, rather than upserting — a batch insert would fail wholesale on one repeat, and a retried seed must never cost her the rest of her memory.
6. **Sensitive items render identically to everything else** on What Aura Knows — no badge, no lock, no muted styling. A marker on the one screen she reviews would stigmatize the thing she was bravest to tell us; the tier does its work invisibly in what generation may spend. Pinned by a test comparing rendered styles.

**Not built — deferred, and why:**

- **Profile tab** (basics, dream, people, lifestyle tags, free-text note) and **edit flows as sheets** — need the Phase 1 design system (`Sheet`, `Card`, `SelectCard`) and, for people, the Phase 3 `people` table.
- **Never-Include UI** — hooks and data access exist and are used by nothing yet; the screen needs Phase 1.
- **Inactive-people filtering** (09 §4) — untestable until Phase 3 creates `people`. `memory_items.source_id` is deliberately a plain uuid with no FK, since its targets live in different tables across phases.
- **Profile-edit and gratitude write paths** — those surfaces land in Phases 4-UI/8.
- **e2e** — descoped by the founder for this phase.
- Nothing here is verified on a device.

### Phase 4 — completed off-device (2026-07-17)

The deferred UI landed once Phase 1's design system existed: Profile tab (basics / dream / people / note, edits as sheets showing "I'll write differently from now on" on save), Never-Include screen over the existing hooks, people management (remove = `active=false`, never a delete — the row stays for history, generation stops using it). Profile edits update the matching permanent `memory_items` in place (09 §1) so What Aura Knows never keeps telling her a corrected truth; the free-text note writes an evolving `place_lifestyle` item. Remaining device items fold into the founder checklist: What Aura Knows/Never-Include/Profile walkthrough on device. Status stays 🟨 only for that walkthrough.

## Phase 5 — AI Generation Backend

- **Objective:** The full generation pipeline: providers, memory context assembly, prompt builders, QA gate, crisis detection, TTS, storage, job machine (docs 08, 09 §4–5, 10 §1–3, 04).
- **User outcome:** None directly — Phase 6 makes it visible. (LLM vendor: **OpenAI, decided** — run the model-tier bake-off per 08 §2 at phase start to pin exact model ids.)
- **Dependencies:** 2, 4.
- **Backend tasks:** `LlmProvider` + Anthropic/OpenAI/mock adapters; `TtsProvider` + ElevenLabs/mock adapters (with-timestamps → word timings); `MemoryContextService` (sampler + cadence directives); prompt builders (letter, daily, ondemand, refine, affirmation daily/guided, milestone, winback — templates versioned); `QaService` (all 8 rule sets); `CrisisDetectionService` (keyword list + classifier confirm); `JobsService` (state machine, idempotency, retries, in-process queue); Storage upload; endpoints: `POST /v1/generation/letter`, `GET /v1/generation/jobs/:id`; entitlement/credit guard scaffolding (free until Phase 10).
- **Mobile tasks:** api client for generation endpoints (zod contracts) + job polling hook.
- **Database changes:** Migration: `moments`, `affirmations`, `generation_jobs`, `usage_credits` + RLS (incl. engagement-column policies); `audio` bucket + policies.
- **API endpoints:** `/v1/generation/letter`, `/v1/generation/jobs/:id` (others stubbed 501 until their phases).
- **External integrations:** OpenAI API (staging keys, zero-retention data controls verified), ElevenLabs (staging keys), Supabase Storage.
- **Analytics events:** `letter_generation_started/succeeded {latency_s}/failed {reason}`, `generation_failed`, `generation_qa_flagged {rule}` (backend-emitted).
- **Tests:** THE core suites (15 §2): QA gate exhaustive, prompt builders, memory sampler, crisis screen, job state machine (retry/idempotency), pipeline integration with mocks, golden tests scaffold (20 personas); RLS for new tables.
- **Edge cases:** Provider timeout/500 (retry then fail gracefully); QA double-fail fallback; malformed LLM JSON (defensive parse + one retry); TTS failure after LLM success (retry TTS only); crisis input on letter path (letter generated WITHOUT struggle theme + supportive flag returned); Storage upload failure (job retry).
- **Definition of Done:** `POST /v1/generation/letter` for a seeded test user yields a `ready` moment with QA-passing text, mp3 in Storage, word timings; all required test suites green; latency <40s p90 against real vendors in staging; vendor no-retention terms verified (14 §8 items for LLM/TTS checked).

## Phase 6 — Future-Self Letter — WOW

- **Objective:** The generation ritual (S12) and the Letter experience exactly per product doc 08 — the emotional peak, pre-paywall.
- **User outcome:** She hears her name, her city, her people, her struggle transformed — "this was made specifically for me."
- **Dependencies:** 3, 5.
- **Backend tasks:** None new (letter endpoint exists).
- **Mobile tasks:** `generating.tsx` ritual (orb slows/deepens, gradient dusk shift, 3 sequenced lines + >45s fourth line, no spinner, gestures disabled, failure → in-voice retry); `/letter` full-screen cover: audio via PlayerService, single haptic at first word + soft tick at date line, karaoke renderer (serif 2–6 words/line, fade+rise, prior lines dim, auto-scroll, no visible controls, back-swipe → Continue-listening sheet); end-state ("Your future self has more to tell you." → Continue); letter auto-favorite + permanent cache; silent-switch/volume pre-check; boot-gate integration (letter-unseen → `/letter`).
- **Database changes:** None.
- **API endpoints:** None new.
- **External integrations:** None new.
- **Analytics events:** `letter_playback_started`, `letter_playback_completed {listened_pct}`.
- **Tests:** Karaoke word-index math unit tests (timings fixtures, drift re-anchor); RTL ritual-screen states; Maestro: onboarding → ritual → letter plays → completion state (mock backend fixture with real timings file).
- **Edge cases:** Generation exceeds 90s (retry copy, never error codes); app backgrounded mid-letter (audio continues, background mode; return restores sync); interruption (call) → pause/resume; letter replay from Home ("kept" state); zero-volume pre-check; Reduce Motion (crossfade lines, orb still).
- **Definition of Done:** End-to-end on device: finish onboarding → ritual → letter with synced karaoke at 60fps, haptics per spec, ends to Continue; letter cached and replayable offline; wow verified by founder ("would this give goosebumps?"); events fire with listened_pct.

## Phase 7 — Daily Moments & Audio Player

- **Objective:** The daily heartbeat: Home, full player + mini-player + Read mode, refine, Manifest Anything, pre-generation cron, forming previews (product docs 09 §9.1–9.2, 06; docs 04 §5, 10).
- **User outcome:** A new moment from her future life every morning, one tap to listen; specific desires become moments on demand.
- **Dependencies:** 5, 6 (10 for gating — until Phase 10, premium features are enabled for all internal testers via config flag).
- **Backend tasks:** `pregenerate-daily` cron (15-min windows, tz-aware, inactive-skip, retry-before-arrival); `POST /v1/generation/moment` (on-open fallback), `/refine` (lineage cap + preference memory write), `/manifest` (crisis check, credit spend/refund logic); forming previews generation (2–3 future titles as `forming` rows, cheap title-only LLM call in the daily job); `expire-temporary-memory` cron.
- **Mobile tasks:** Home per product 11 (greeting, Today's Moment card with countdown chip, Coming for you previews, collections grid stub, recently played, "+" → Manifest sheet); `/player` full-screen cover (orb amplitude-reactive, transport, speed, favorite heart, Refine entry, pull-down minimize) + mini-player; Read mode (synced highlight); Refine sheet (3 directions + note, 1/moment); Manifest sheet (desire input, credits remaining, inspiration placeholders); audio prefetch + cache policy (10 §6); moment states per product 09 (forming/error/replay-yesterday fallback).
- **Database changes:** None (tables exist); indexes verified under load.
- **API endpoints:** `/v1/generation/moment`, `/v1/generation/refine`, `/v1/generation/manifest` go live.
- **External integrations:** None new.
- **Analytics events:** `moment_playback_started {source}`, `moment_playback_completed {listened_pct}`, `moment_read_mode_toggled`, `moment_refined {direction}`, `moment_favorited`, `manifest_anything_created {credits_remaining}`, `audio_start_latency_ms`, `playback_error`.
- **Tests:** Cron window math (tz, DST, inactive-skip, no-double-generation); credit spend/refund (error paths don't consume); refine lineage cap; RTL Home states; Maestro daily-ritual flow; prefetch-latency assertion.
- **Edge cases:** Cron failure by arrival → on-open fallback with "still forming" + yesterday replay; refine on refined moment (blocked); manifest crisis input (422, credit intact); timezone travel; offline Home (cached moment plays); audio scrub past end.
- **Definition of Done:** Tester wakes to a pre-generated moment (staging cron), plays <300ms; refine regenerates once and teaches memory; Manifest works with credits; forming previews visible; word echo appears in generations (memory context verified in output).

## Phase 8 — Affirmations & Gratitude

- **Objective:** The second and third beats of the ritual: daily affirmation + guided studio + technique chips + share cards; one-line gratitude with dots and memory feed (product docs 09 §9.3–9.4).
- **User outcome:** Affirmations that sound like her life with the why explained; a 60-second gratitude line that the app actually uses.
- **Dependencies:** 5 (7 for post-moment flow wiring).
- **Backend tasks:** `/v1/generation/affirmation/daily` + `/guided` + `/v1/affirmations/:id/keep` live; daily affirmation added to pre-gen cron; gratitude-aware personalized prompt (context from recent entries in daily gen).
- **Mobile tasks:** Affirmations tab (today's card reveal flip-fade + countdown, Create with Aura guided sheet: goal chips+free text → feeling chips → tone → 3 candidates with why-lines → pick/edit/save, collection grid); technique chips (identity, present-tense why, 369 counter with simple count UI, scripting prompt); **share-card renderer** (1080×1920 clean typographic export via view-shot, 3 templates, subtle brand mark, affirmation text only — no personal data); Gratitude tab (personalized prompt, one-line entry local-first + silent sync, 5s-empty starter suggestion, soft tick + dot fill, weekday dots no-break-state, history list, memory-contract copy shown once); post-moment flow (moment → affirmation → gratitude → "That's enough for today" done-state + countdown).
- **Database changes:** Migration: `gratitude_entries`, `favorites` + RLS.
- **API endpoints:** Affirmation endpoints live.
- **External integrations:** react-native-view-shot + share sheet.
- **Analytics events:** `affirmation_revealed`, `affirmation_generated_guided {goal_area, tone}`, `affirmation_saved`, `affirmation_shared {format}`, `technique_chip_opened {technique}`, `technique_practice_completed {technique}`, `gratitude_entry_saved {char_count_bucket, prompt_was_personalized}`, `ritual_completed`.
- **Tests:** Affirmation QA rules (≤20 words, present tense, no negative frame) already in Phase 5 suite — extend fixtures; gratitude local-first sync unit tests (offline queue, conflict, date uniqueness); share renderer snapshot (layout only); RTL both tabs; Maestro full 3-beat ritual.
- **Edge cases:** Gratitude offline (saves locally, dot fills, silent sync); double entry same day (edit, not duplicate); guided flow abandoned mid-way (draft kept in sheet session); share cancelled; candidate regeneration limit (one set per flow — cost cap); empty collection states in-voice.
- **Definition of Done:** Full daily ritual (<3 min) works end-to-end with done-state; gratitude entries appear in next-day generation context (verified in staging output); share exports a clean 1080×1920 card; `ritual_completed` fires only when all three beats done same day.

## Phase 9 — Notifications & Daily Habit Loop

- **Objective:** Arrival notifications in companion voice, D7 milestone letter, word-echo callback polish, auto-soften — the return loop (doc 11; product 16).
- **User outcome:** A caring one-line note at her chosen time; on day 7, a letter that quotes her own week back to her.
- **Dependencies:** 7 (8 for ritual completeness).
- **Backend tasks:** `NotificationsModule` (Expo push send, receipts, token lifecycle); arrival push wired into pre-gen cron success; `milestone-letters` cron (D7: generation + full-screen arrival + push); `soften-notifications` cron; `winback-note` cron scaffold (activates with Phase 10 lapse data); send-log double-delivery guard.
- **Mobile tasks:** Permission flow post-paywall with banked-context sheet; token registration to `notification_tokens`; `notification_prefs` sheet (arrival toggle, nudge frequency quiet/once/custom hours); deep-link handling notification→player (cold start incl.); D7 milestone letter presentation (reuses `/letter` cover, medium haptic once); missed-day return state ("There you are. Today's moment kept." — no absence mention anywhere).
- **Database changes:** Migration: `notification_tokens`, `notification_prefs` + RLS.
- **API endpoints:** None new (prefs via Supabase).
- **External integrations:** Expo Push / APNs (push credentials in EAS).
- **Analytics events:** `moment_arrival_notification_sent`/`_opened`, `notification_permission_result`, `notification_softened`, `milestone_letter_played {day}`, `callback_delivered {type}`.
- **Tests:** Copy templates pass banned/guilt lint (zero guilt variants — product 14); soften counter logic; tz/DST send-window tests; deep-link routing unit tests; D7 eligibility math; send-log guard.
- **Edge cases:** Permission denied (weekly quiet hint max, feature works without); token rotation/multi-device; notification for failed generation (never sent); tapped stale notification (replay state); softened user opens app (unsoften + reset); D7 with zero gratitude entries (letter adapts, no fake quote).
- **Definition of Done:** Staging tester receives arrival note at chosen time naming the moment's theme; tap → player in one step; D7 letter arrives full-screen and quotes a real entry; 3 ignored arrivals → softened (verified via time-travel test data); zero guilt vocabulary confirmed by lint + manual read.

## Phase 10 — Subscriptions & Paywall

- **Objective:** RevenueCat dual-SKU monetization with radical transparency: post-Letter paywall, free-tier gating, locked sheets, claim-at-purchase, webhooks (doc 12; product 15).
- **User outcome:** An honest paywall after the wow; a real free tier if she declines; purchase never loses her data.
- **Dependencies:** 6 (2 for claim flow).
- **Backend tasks:** `POST /v1/webhooks/revenuecat` (all event types → `subscription_state` upsert + server analytics); entitlement guard live on premium endpoints (402); credit checks bound to entitlement; `trial-reminder` cron; winback cron activated.
- **Mobile tasks:** RC SDK configure + `logIn(userId)` at boot; `useEntitlement` hook; post-Letter paywall cover (same-world crossfade, contrast block, plan cards with printed equivalents, 2s-delayed dismiss X, "The letter is yours either way."); locked-feature sheets on all 5 gated features; claim-account sheet (Sign in with Apple + email magic link) triggered post-purchase + restore + Settings entry; restore flows incl. transfer edge cases (03 §2.3); Settings subscription screen (status, manage 2-tap, restore); free-tier gating map applied; S1 price-honesty line finalized.
- **Database changes:** Migration: `subscription_state` + RLS.
- **API endpoints:** `/v1/webhooks/revenuecat`.
- **External integrations:** RevenueCat (products, entitlement, offerings, webhook), App Store Connect subscription setup, Sign in with Apple capability.
- **Analytics events:** `paywall_viewed {surface}`, `paywall_plan_selected {sku}`, `paywall_dismissed`, `trial_started {sku}`, `purchase_completed {sku}`, `locked_feature_touched {feature}`, `subscription_renewed`, `subscription_cancelled`, `trial_reminder_sent`, `winback_note_sent`/`_converted`.
- **Tests:** Webhook handler unit tests (every RC event type → expected mirror state); entitlement guard 402s; claim-flow unit tests; sandbox Maestro: purchase → claim → premium unlock; restore-on-new-device manual test script.
- **Edge cases:** Purchase success + claim abandoned (entitlement works, re-prompt banner); restore unclaimed→new device (entitlement transfers, honest content copy); Apple sheet cancelled; webhook before/after client refresh (mirror lag tolerated); billing grace; lapsed user keeps Letter + data.
- **Definition of Done:** Sandbox annual + weekly-with-trial purchases complete end-to-end with claim; free tier enforced everywhere per gating map; **all 7 anti-resentment checklist points manually verified**: (1) price on first screen, (2) weekly shows monthly equivalent, (3) trial terms restated + day-5 reminder, (4) no paywall near vulnerable disclosure, (5) cancel in 2 taps, (6) lapsed keep Letter/data, (7) no ads anywhere.

## Phase 11 — Analytics & Experimentation

- **Objective:** Complete the measurement layer: full-catalog audit, experiments live, dashboards + alarms (doc 13; product 17).
- **User outcome:** None directly; the product learns or dies (product 05).
- **Dependencies:** All instrumented phases (6–10 minimum).
- **Backend tasks:** Server-event audit vs catalog; `exp_ondemand_limit` flag read at credit check; `experiment_assignments` writes; QA-flag alarm hook to Sentry.
- **Mobile tasks:** Event audit vs product doc 17 (every event, correct payloads, single emitter); `exp_trial_variant` + `exp_paywall_hero` flag wiring on paywall; assignment-once semantics; super-properties verification.
- **Database changes:** Migration: `experiment_assignments` + RLS.
- **API endpoints:** None.
- **External integrations:** PostHog dashboards ×5 (13 §6), feature flags configured; RC↔PostHog identity spot-check.
- **Analytics events:** Catalog completed — gap-fill any missed events from earlier phases.
- **Tests:** Analytics privacy test (no free-text-capable fields) as required CI suite; assignment idempotency; flag-variant → offering mapping test.
- **Edge cases:** Flag service unreachable (safe defaults: control variants); event flood control (dedupe `what_aura_knows_viewed` per session); experiment exposure without eligibility (new-users-only guard for pricing flags).
- **Definition of Done:** All 5 dashboards live and populated from TestFlight cohort; first-session funnel traces a real user install→paywall; both paywall experiments assignable and analyzed; privacy audit passes (sample 100 events: zero user content).

## Phase 12 — Polish, Performance & App Store Readiness

- **Objective:** Ship quality: 60fps everywhere, accessibility complete, offline hardening, settings completion, store compliance (doc 16 §5; product 12/13 budgets).
- **User outcome:** The calm-premium feel holds up everywhere; the app is on the App Store.
- **Dependencies:** All.
- **Backend tasks:** Load sanity (staging soak of crons at simulated 1k users); alert thresholds tuned (16 §6); launch runbook rehearsal incl. rollback.
- **Mobile tasks:** Performance pass (60fps audit with profiler on iPhone 12-class: transitions, orb, karaoke, lists; cold start <2s; skeleton→content <1.5s p75); full VoiceOver pass; Dynamic Type max-size pass; dark-mode audit; Reduce Motion audit; offline hardening (airplane-mode walkthrough of every screen); Settings completion (support contact, rate & share, legal links, voice picker placeholder, delete-account full UI with typed confirm); app icon + splash; App Store assets (screenshots, keyword-title per product 19, description); review-demo account seeding script.
- **Database changes:** None.
- **API endpoints:** None.
- **External integrations:** App Store Connect (listing, subscriptions review, privacy labels), phased-release config.
- **Analytics events:** `account_deleted`; final `crash`-adjacent Sentry verification.
- **Tests:** Full Maestro suite green on release build; performance assertions recorded; accessibility checklist signed; 16 §5 checklist complete.
- **Edge cases:** Review-team flow (demo account works without 24h waits); iPad rendering (iPhone-only target but must not break); low-storage device (cache eviction); iOS minimum-version verification.
- **Definition of Done:** App Store submission accepted; launch runbook executed (16 §8); phased rollout live; day-1 monitoring dashboard watch scheduled; every release-blocking checklist in docs 12/14/15/16 checked.

---

## Cross-phase working rules

1. Per phase: read PROJECT-KNOWLEDGE.md → this plan → the phase's referenced technical docs → inspect code → write TODO checklist → implement → lint/typecheck/test → fix → update this file's status column → document decisions → summarize + list manual tests. Never auto-advance to the next phase.
2. Any deviation from a technical doc during implementation updates that doc in the same PR (docs stay true).
3. Product-doc rules (banned phrases, anti-resentment list, sensitive-tier, no dark patterns) are requirements, not guidance — a conflict between speed and those rules resolves toward the rules.
4. Formerly open decisions, now locked (founder, 2026-07-17): **brand name = "Aura: Manifest Daily"** (display name + ASO title in `app.config.ts` at Phase 0; exact reverse-domain bundle id confirmed then) and **LLM vendor = OpenAI** (model tiers pinned via the Phase 5 bake-off, 08 §2). Any newly discovered blocking decision is raised to the founder at phase start, not mid-phase.
