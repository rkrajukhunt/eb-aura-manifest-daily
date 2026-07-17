# Running the Project

Every command here was run against this repo on macOS (Apple Silicon) and works as written.

This guide documents the **live Supabase** setup — the one this machine is already configured for.
`apps/backend/.env` and `apps/mobile/.env` point at the hosted Supabase project, so **you do not
need Docker and you do not run `supabase start`**. The root `README.md` describes the local-Docker
path instead; where the two disagree, this file matches what is actually on disk.

---

## 1. Prerequisites

| Tool   | Version   | Check                 | Notes                                    |
| ------ | --------- | --------------------- | ---------------------------------------- |
| Node   | `22.12.0` | `node -v`             | Pinned in `.nvmrc` — run `nvm use`       |
| pnpm   | `10.4.1`  | `pnpm -v`             | `corepack enable` installs the right one |
| Xcode  | latest    | `xcodebuild -version` | iOS simulator — macOS only               |
| Docker | —         | —                     | **Not needed** on the live-Supabase path |

`.nvmrc` pins `22.12.0`. Node `22.21.1` also satisfies the `>=22.12.0 <23` engine range and works.

```bash
nvm use && corepack enable
```

---

## 2. Install dependencies

From the repo root — this installs **all four workspaces** at once. Never run `pnpm install`
inside `apps/mobile` or `apps/backend`; pnpm workspaces link them from the root.

```bash
pnpm install
```

Takes ~25s on a warm cache. The `prepare` script sets up husky pre-commit hooks automatically.

---

## 3. Environment files

Both env files already exist and are filled in on this machine. They are gitignored — only
`.env.example` (names, no values) is tracked. **Never commit real values.**

| File                | Consumed by | Status on this machine |
| ------------------- | ----------- | ---------------------- |
| `apps/backend/.env` | NestJS      | ✅ live Supabase       |
| `apps/mobile/.env`  | Expo/Metro  | ✅ live Supabase       |

### `apps/backend/.env`

Validated at boot by `apps/backend/src/config/env.schema.ts` (zod). **The process refuses to
start on a missing or invalid value** — that is deliberate, not a bug.

```bash
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server only — never ships to a client
LLM_PROVIDER=mock                              # keep `mock` locally: no network, no spend
TTS_PROVIDER=mock                              # keep `mock` locally
```

Leave `LLM_PROVIDER` and `TTS_PROVIDER` as `mock`. If you switch either to a real vendor, the
schema then _requires_ its key (`LLM_API_KEY` / `ELEVENLABS_API_KEY`) and boot fails without it.

### `apps/mobile/.env`

Validated by `apps/mobile/src/lib/env.ts` (zod), which throws at startup if anything is missing.

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Two things that bite people here:

- **The filename is `.env`, not `.env.local`.** The README and the error message inside
  `src/lib/env.ts` both say `.env.local`; the file that actually exists and loads is `.env`.
- **`EXPO_PUBLIC_*` vars are inlined by Metro at build time.** Change one and you must restart
  Metro with `--clear` (§7) — a hot reload will not pick it up.

The anon key being public is by design: **RLS is the security boundary**, not the key.

---

## 4. Build the shared package

`packages/shared` holds the zod contracts, analytics catalog, and generated DB types that both
apps import as `@aura/shared`. It compiles to `dist/` via `tsc`, and **both apps resolve it
through `dist/`, not `src/`** — so a fresh clone must build it before the backend will run.

Turbo handles the ordering for you (`build` has `dependsOn: ["^build"]`):

```bash
pnpm build          # from the repo root
```

Verified output — only 2 of the 4 workspaces have a `build` script, which is expected:

```
@aura/shared:build   > tsc -p tsconfig.build.json
@aura/backend:build  > nest build
 Tasks:    2 successful, 2 total
```

`@aura/config` (shared eslint/prettier/tsconfig bases) and `@aura/mobile` (bundled by Metro/EAS)
have no build step by design.

Build just the shared package, or watch it while developing:

```bash
pnpm --filter @aura/shared build
pnpm --filter @aura/shared dev     # tsc --watch
```

> **If the backend errors with `Cannot find module '@aura/shared'`** — `packages/shared/dist` is
> missing. Run `pnpm build`.

---

## 5. Run the backend

Because we're on live Supabase, **use `pnpm dev:apps`, not `pnpm dev`.** The root `pnpm dev`
script runs `supabase start` first, which needs Docker and is exactly what we're avoiding.

```bash
# Root — runs backend + Metro together, no Supabase
pnpm dev:apps

# Or just the backend, in watch mode
pnpm --filter @aura/backend dev
```

Production-style run (requires `pnpm build` first):

```bash
pnpm --filter @aura/backend start     # node dist/main
```

### Verify it

```bash
curl localhost:3000/v1/health
```

Verified response against live Supabase:

```json
{ "status": "ok", "db": true, "storage": true, "llm": true, "tts": true }
```

`db` and `storage` are **live probes** against Supabase. `llm`/`tts` report `true` from the mock
providers. If `db` or `storage` is `false`, your `SUPABASE_URL` / service-role key is wrong or the
hosted project is unreachable. Every route is versioned under `/v1/*`.

---

## 6. Run the iOS app with Expo

Native modules (RevenueCat, MMKV, Reanimated) mean **Expo Go will not work** — a dev client is
required. The app is iOS-only at V1 (`platforms: ['ios']` in `app.config.ts`); there is no
Android or web target.

### First run — build the dev client

Slow (compiles native code, ~10-20 min) and needed only once, or after any native dependency or
`app.config.ts` plugin change. `/ios` is gitignored and generated on demand.

```bash
cd apps/mobile
pnpm exec expo run:ios
```

> **Requires `SENTRY_DISABLE_AUTO_UPLOAD=true` in `apps/mobile/.env`.** Without it the native
> build compiles fine and then dies at the very last step — `Bundle React Native code and images`
> — with `error: An organization ID or slug is required (provide with --org)` and
> `xcodebuild exited with error code 65`. The `@sentry/react-native/expo` plugin tries to upload
> source maps, but the generated `ios/sentry.properties` carries no org/project and there is no
> auth token locally. Source maps only matter for builds real users run, so skipping the upload
> costs nothing in dev. Release builds leave the flag unset and supply `SENTRY_ORG`,
> `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` through EAS secrets.

Verified end state: `Build Succeeded`, `0 error(s)`, app installed and opened on the simulator as
`com.aura.manifestdaily.dev`.

### Every run after that

```bash
cd apps/mobile
pnpm dev            # expo start --dev-client
```

Press `i` to open the simulator. Keep the backend running in another terminal — the app calls it
at `EXPO_PUBLIC_API_URL`.

> **Simulator vs. physical device:** `EXPO_PUBLIC_API_URL=http://localhost:3000` works on the
> simulator because it shares the host's network. On a **physical device**, `localhost` is the
> phone itself — swap in your Mac's LAN IP (e.g. `http://192.168.1.42:3000`), then restart Metro
> with `--clear` so Metro re-inlines the value.

### Build variants

`APP_ENV` drives the bundle id and display name so dev/staging/production can coexist on one
device (`development` → `com.aura.manifestdaily.dev`, "Aura (Dev)"). EAS profiles live in
`eas.json`:

```bash
cd apps/mobile
pnpm exec eas build --profile development --platform ios
pnpm exec eas build --profile staging --platform ios
pnpm exec eas build --profile production --platform ios
```

`submit.production` in `eas.json` still has `TODO_PHASE_10` placeholders for `ascAppId` and
`appleTeamId` — store submission isn't wired up yet.

---

## 7. Everyday commands

Run from the repo root unless noted.

| Command                             | Does                                                 |
| ----------------------------------- | ---------------------------------------------------- |
| `pnpm dev:apps`                     | Backend + Metro — **use this on live Supabase**      |
| `pnpm dev`                          | Same, but runs `supabase start` first (needs Docker) |
| `pnpm build`                        | Build `@aura/shared` + `@aura/backend`               |
| `pnpm lint`                         | eslint across all workspaces                         |
| `pnpm typecheck`                    | `tsc --noEmit` across all 4 workspaces               |
| `pnpm test`                         | Unit + e2e suites (no Docker needed)                 |
| `pnpm format`                       | Prettier write                                       |
| `pnpm --filter @aura/mobile doctor` | `expo-doctor` — dependency/config sanity             |

Verified: `pnpm typecheck` → 4/4 pass. `pnpm test` → 4/4 pass (mobile: 5 suites, 26 tests).

Metro cache is the usual culprit for stale env or module resolution:

```bash
cd apps/mobile && pnpm exec expo start --dev-client --clear
```

---

## 8. Database & migrations

Migrations live in `supabase/migrations/` and each one carries its **own RLS policies** — schema
and policy land in the same file. A table without RLS must never reach `main`.

The `db:*` scripts target the **local Docker stack**, so on the live-Supabase path they are not
part of your loop:

| Command         | Does                                                   |
| --------------- | ------------------------------------------------------ |
| `pnpm db:start` | Local Supabase (Docker) — not used here                |
| `pnpm db:reset` | Re-applies migrations + seed — **destroys local data** |
| `pnpm db:types` | Regenerates `database.types.ts` from the local DB      |

> ⚠️ `pnpm db:reset` is destructive, and `pnpm db:types` reads the **local** stack
> (`supabase gen types --local`). Both need Docker.

`packages/shared/src/types/database.types.ts` is **generated and committed** — never hand-edit it.
Run `pnpm db:types` after every migration and commit the result; CI fails the build if the
committed file is stale.

---

## 9. Tests

```bash
pnpm test                              # everything CI runs
pnpm --filter @aura/backend test:unit  # jest unit
pnpm --filter @aura/backend test:e2e   # supertest e2e
pnpm --filter @aura/mobile test        # jest-expo
```

The default suites are **Docker-free** — that's why `mock` providers exist.

One exception: `pnpm --filter @aura/backend test:live` (the RLS + deletion suite) needs a **live
local Supabase**, because RLS is enforced by Postgres and a mocked version would assert nothing.
CI runs it in a separate `live-suite` job. Skip it locally unless you're changing RLS.

---

## 10. Troubleshooting

| Symptom                                                                         | Cause & fix                                                                                                       |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `Cannot find module '@aura/shared'`                                             | `packages/shared/dist` missing → `pnpm build`                                                                     |
| Backend exits at boot with `Invalid environment configuration`                  | zod rejected `apps/backend/.env`. It prints the offending **names only** (never values) — fix those keys.         |
| `Missing/invalid Expo env: ...`                                                 | `apps/mobile/.env` missing a var. Note the error says `.env.local`; the real file is **`.env`**.                  |
| Health returns `"db": false`                                                    | Wrong `SUPABASE_URL`/service-role key, or the hosted project is unreachable.                                      |
| Env change didn't take effect in the app                                        | `EXPO_PUBLIC_*` is inlined at build time → restart Metro with `--clear`.                                          |
| `Cannot connect to the Docker daemon`                                           | You ran `pnpm dev` / a `db:*` script. On live Supabase use `pnpm dev:apps`.                                       |
| Expo Go crashes on native modules                                               | Expected — build the dev client: `pnpm exec expo run:ios`.                                                        |
| `expo run:ios` fails: `An organization ID or slug is required`, `error code 65` | Sentry source-map upload has no org/auth token. Set `SENTRY_DISABLE_AUTO_UPLOAD=true` in `apps/mobile/.env` (§6). |
| Device can't reach the API                                                      | `localhost` on a phone means the phone. Use your Mac's LAN IP.                                                    |

---

## 11. Layout

```
apps/mobile      Expo app (iOS-only at V1) — routes in app/, features in src/
apps/backend     NestJS thin backend: generation, jobs, webhooks, push
packages/shared  zod contracts, analytics catalog, generated DB types → built to dist/
packages/config  shared eslint / prettier / tsconfig bases
supabase/        migrations (schema + RLS together) + seed
```

Deeper context: [`docs/PROJECT-KNOWLEDGE.md`](PROJECT-KNOWLEDGE.md) (product),
[`docs/technical/00-TECHNICAL-ARCHITECTURE.md`](technical/00-TECHNICAL-ARCHITECTURE.md) (system map),
[`docs/technical/01-REPOSITORY-STRUCTURE.md`](technical/01-REPOSITORY-STRUCTURE.md) (layout rationale).
Docs are normative: if code and a doc disagree, one of them is a bug.
