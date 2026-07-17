# Aura: Manifest Daily

An AI companion that turns your dream life into personalized audio moments and daily
affirmations — and gets to know you better every day.

**Start here:** [`docs/PROJECT-KNOWLEDGE.md`](docs/PROJECT-KNOWLEDGE.md) is the product brain.
[`docs/technical/00-TECHNICAL-ARCHITECTURE.md`](docs/technical/00-TECHNICAL-ARCHITECTURE.md) is
the system map, and [`docs/technical/IMPLEMENTATION-PLAN.md`](docs/technical/IMPLEMENTATION-PLAN.md)
tracks phase status. Docs are normative: if the code and a doc disagree, that's a bug in one of them.

## Prerequisites

| Tool   | Version    | Notes                          |
| ------ | ---------- | ------------------------------ |
| Node   | `22.12.0`  | pinned in `.nvmrc` — `nvm use` |
| pnpm   | `10.4.1`   | `corepack enable`              |
| Docker | any recent | runs the local Supabase stack  |
| Xcode  | latest     | iOS simulator — macOS only     |

## Bootstrap (fresh clone)

```bash
nvm use && corepack enable       # Node 22.12.0 + pnpm
pnpm install                     # all workspaces
cp .env.example apps/backend/.env
pnpm dev                         # local Supabase + backend + Metro
```

`pnpm dev` boots the Supabase stack (first run pulls several GB of Docker images — expect
a wait), then runs the backend and Metro in watch mode.

Fill in `apps/backend/.env` from the values `pnpm exec supabase status -o env` prints after
the stack is up — `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Leave `LLM_PROVIDER` and
`TTS_PROVIDER` as `mock`: local dev and CI never call a real vendor, so there's no spend and
no key to leak. Do the same for `apps/mobile/.env.local` using the public URL + anon key.

Verify the stack:

```bash
curl localhost:3000/v1/health
# {"status":"ok","db":true,"storage":true,"llm":true,"tts":true}
```

`db` and `storage` are live probes — if either is `false`, Supabase isn't up.

### iOS app

Native modules (RevenueCat, Skia, MMKV) mean Expo Go won't work; a dev client is required.

```bash
cd apps/mobile
pnpm exec expo run:ios          # first run builds the dev client (slow)
pnpm dev                        # subsequent runs
```

## Everyday commands

| Command                                      | Does                                                 |
| -------------------------------------------- | ---------------------------------------------------- |
| `pnpm dev`                                   | Supabase + backend + Metro                           |
| `pnpm dev:apps`                              | apps only, assumes Supabase is already up            |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | what CI runs                                         |
| `pnpm build`                                 | build every workspace                                |
| `pnpm db:reset`                              | re-apply all migrations + seed (destroys local data) |
| `pnpm db:types`                              | regenerate DB types — **run after every migration**  |
| `pnpm db:stop`                               | stop the Supabase containers                         |

## Layout

```
apps/mobile      Expo app (iOS-only at V1) — routes in app/, features in src/
apps/backend     NestJS thin backend: generation, jobs, webhooks, push
packages/shared  zod contracts, typed analytics catalog, generated DB types
packages/config  shared eslint / prettier / tsconfig bases
supabase/        migrations (schema + RLS together) + seed
```

Full rationale in [`docs/technical/01-REPOSITORY-STRUCTURE.md`](docs/technical/01-REPOSITORY-STRUCTURE.md).

## Conventions worth knowing before your first PR

- **Shapes live in `@aura/shared`.** Mobile and backend never declare a request, response, or
  analytics event locally. This is what keeps the API contracts honest.
- **Analytics can't leak content.** The event catalog is typed with enums, booleans, and bucketed
  counts — there is no free-text field, so user content cannot compile into an event.
- **Migrations carry their own RLS.** Schema and policies land in the same file. RLS is the security
  boundary for the whole thin-backend design; a table without it must never reach `main`.
- **Regenerate types after migrating.** `packages/shared/src/types/database.types.ts` is generated
  and committed — never hand-edited.
- **Secrets never enter the repo.** `.env.example` lists names only. `apps/backend/.env` and
  `apps/mobile/.env.local` are gitignored.
- **Product rules are requirements, not guidance.** Banned phrases, the anti-resentment checklist,
  sensitive-tier handling, and the no-dark-patterns ban are release-blocking. Speed loses to them.
