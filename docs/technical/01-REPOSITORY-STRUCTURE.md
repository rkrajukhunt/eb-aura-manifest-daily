# 01 — REPOSITORY STRUCTURE

_Monorepo layout, tooling, and conventions. See 00 §D8 for the decision rationale._

---

## 1. Top level

```
aura/
├── apps/
│   ├── mobile/               # Expo React Native app
│   └── backend/              # NestJS generation/jobs service
├── packages/
│   ├── shared/               # zod contracts, shared types, event catalog
│   └── config/               # shared eslint/prettier/tsconfig bases
├── supabase/                 # Supabase project: migrations, seed, config
├── docs/                     # product docs (00–20) + technical/ (this set)
├── .github/workflows/        # CI
├── turbo.json
├── pnpm-workspace.yaml
├── package.json              # root: scripts, husky, lint-staged
└── .env.example              # documented env var names (never values)
```

**Tooling:** pnpm workspaces + Turborepo (task graph: `lint`, `typecheck`, `test`, `build`). Node LTS pinned via `.nvmrc` + `engines`. Husky pre-commit: lint-staged (eslint --fix + prettier) and `tsc --noEmit` on affected workspaces.

## 2. `apps/mobile` (Expo)

Feature-folder structure; Expo Router file-based routes stay thin and delegate to features.

```
apps/mobile/
├── app/                          # Expo Router routes (thin — see 06-NAVIGATION)
│   ├── (onboarding)/             # S1–S11 stack + letter + paywall
│   ├── (tabs)/                   # home / affirmations / gratitude / profile
│   ├── player.tsx                # full-screen cover
│   ├── letter.tsx                # full-screen cover (wow + milestones)
│   └── _layout.tsx               # root: providers, auth gate, theme
├── src/
│   ├── features/
│   │   ├── onboarding/           # screens' logic, draft store, reflections
│   │   ├── letter/               # generating ritual, karaoke renderer
│   │   ├── moments/              # today card, player logic, refine, manifest
│   │   ├── affirmations/         # daily card, guided flow, technique chips, share renderer
│   │   ├── gratitude/            # entry, dots, history
│   │   ├── memory/               # What Aura Knows, Never-Include, profile editing
│   │   ├── paywall/              # offering UI, locked sheets, gating hooks
│   │   ├── notifications/        # permission flow, token registration, prefs
│   │   └── settings/             # subscription mgmt, deletion, legal
│   ├── components/               # design system (Button, Card, Sheet, Chip, Orb, …)
│   ├── theme/                    # tokens: colors, typography, spacing, haptics
│   ├── lib/
│   │   ├── supabase.ts           # client, typed by generated DB types
│   │   ├── api.ts                # backend client (zod-validated, from packages/shared)
│   │   ├── analytics.ts          # PostHog wrapper (typed events only)
│   │   ├── audio/                # playback service, caching, karaoke sync
│   │   ├── purchases.ts          # RevenueCat wrapper
│   │   └── storage.ts            # MMKV helpers (drafts, caches)
│   ├── stores/                   # zustand: player, onboardingDraft, appState
│   └── hooks/                    # useEntitlement, useProfile, useMoments, …
├── assets/                       # fonts (serif + sans), illustrations, sounds
├── app.config.ts                 # bundle id, name — brand isolated here (00 §7 Q1)
├── eas.json                      # development / staging / production profiles
└── package.json
```

Conventions: components are presentational; data access only via hooks wrapping TanStack Query; every string surfaced to users comes from `src/copy/` (companion-voice copy catalog — enables the banned-phrase lint described in 15).

## 3. `apps/backend` (NestJS)

```
apps/backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/                     # Supabase JWT guard + user context
│   ├── generation/               # orchestrator: letter/moment/affirmation/refine/manifest
│   │   ├── prompt/               # prompt builders per artifact
│   │   ├── qa/                   # QA gate: tokens, banned phrases, never-include, length
│   │   └── jobs/                 # generation_jobs state machine, retries
│   ├── providers/
│   │   ├── llm/                  # LlmProvider interface + vendor adapters
│   │   └── tts/                  # TtsProvider interface + ElevenLabs adapter
│   ├── memory/                   # memory-context assembler (read-only sampler)
│   ├── safety/                   # crisis detection (keyword + classifier)
│   ├── scheduler/                # crons: pre-generation, milestones, reminders, soften
│   ├── notifications/            # Expo push dispatch
│   ├── webhooks/                 # RevenueCat
│   ├── analytics/                # PostHog server events
│   ├── supabase/                 # service-role client (server-only)
│   └── health/
├── test/                         # e2e with mocked providers
└── package.json
```

## 4. `packages/shared`

```
packages/shared/
├── src/
│   ├── contracts/                # zod schemas per endpoint (07-API-CONTRACTS)
│   ├── events/                   # typed analytics event catalog (13)
│   ├── constants/                # limits (manifest credits, refine cap), enums
│   └── types/                    # database.types.ts (generated — see §5), shared unions
└── package.json
```

Built with `tsc` to `dist/` (CommonJS + declarations); consumers import the built output. Limits in `constants/` are **defaults** — the backend overrides them from env so they stay tunable without a redeploy (04 §6).

Rule: **mobile and backend never define a request/response or event shape locally** — always import from `@aura/shared`. This is what keeps 07's contracts honest.

## 5. `supabase/`

```
supabase/
├── migrations/                   # timestamped SQL (schema + RLS in same migration)
├── seed.sql                      # local dev seed
└── config.toml
```

Migration workflow: write SQL migration → `supabase db reset` locally → `pnpm db:types` → CI applies to staging on merge, production on release (16).

**Generated types location (Phase 0 decision).** `supabase gen types typescript` writes to `packages/shared/src/types/database.types.ts`, not a `supabase/types/` directory. `@aura/shared` is a compiled package (the NestJS backend consumes its `dist`, not its source — otherwise `tsc`'s `rootDir` rejects cross-package source imports), so anything it re-exports must live inside its own source tree. Keeping the generated file there also matches the §4 rule that row shapes reach both apps only via `@aura/shared`. The file is **committed** so CI can typecheck without booting Docker; it is regenerated, never hand-edited.

## 6. Environment variables

| Name                                                         | Where   | Notes                                 |
| ------------------------------------------------------------ | ------- | ------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | mobile  | Public by design; RLS is the boundary |
| `EXPO_PUBLIC_API_URL`                                        | mobile  | Backend base URL per env              |
| `EXPO_PUBLIC_POSTHOG_KEY`                                    | mobile  |                                       |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`                             | mobile  |                                       |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`                 | backend | Service role never leaves server      |
| `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL`                 | backend | Provider abstraction switch (08)      |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID`                 | backend |                                       |
| `REVENUECAT_WEBHOOK_AUTH`                                    | backend | Shared secret header                  |
| `POSTHOG_SERVER_KEY`                                         | backend |                                       |
| `SENTRY_DSN_MOBILE` / `SENTRY_DSN_BACKEND`                   | each    |                                       |

`.env.example` lists names + comments only. EAS secrets hold mobile values per profile; backend host holds server values (16).

## 7. CI outline (`.github/workflows`)

- **ci.yml** (every PR): pnpm install → turbo `lint` + `typecheck` + `test` (affected) → backend build → expo-doctor.
- **migrate-staging.yml** (merge to main): apply Supabase migrations to staging.
- **release.yml** (tag): backend deploy → production migrations → EAS build/submit (16).

Branch model: `main` protected; feature branches + PR; phases land as one-or-few PRs each (IMPLEMENTATION-PLAN).
