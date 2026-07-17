# 16 — DEPLOYMENT & OPERATIONS

_Environments, CI/CD, release process, monitoring. Repo/CI file layout → 01 §7._

---

## 1. Environments (00 §5)

|            | local                       | staging                                    | production                             |
| ---------- | --------------------------- | ------------------------------------------ | -------------------------------------- |
| Supabase   | CLI (Docker)                | project `aura-staging`                     | project `aura-prod`                    |
| Backend    | `pnpm dev`                  | Railway service (staging env)              | Railway service (prod env)             |
| Mobile     | Expo dev client, sim/device | TestFlight internal, EAS profile `staging` | App Store, EAS profile `production`    |
| LLM/TTS    | `mock` providers            | real keys (test tier)                      | real keys (no-retention prod accounts) |
| RevenueCat | —                           | sandbox project                            | prod project                           |
| PostHog    | disabled (or local no-op)   | staging project                            | prod project                           |

Region: Supabase + Railway co-located `us-east` (US-first market, product 02).

## 2. Database migrations

- Source of truth: `supabase/migrations/*.sql` (schema + RLS together, 01 §5).
- Local: `supabase db reset` + regenerate types → commit.
- **Staging:** applied by CI on merge to `main` (`supabase db push` with staging access token).
- **Production:** applied by the release workflow (tag) _before_ backend deploy; migrations must be backward-compatible with the previous backend (expand-migrate-contract discipline for breaking shape changes).

## 3. Mobile releases (EAS)

- `eas.json` profiles: `development` (dev client, internal distribution) · `staging` (TestFlight internal, staging env vars) · `production` (App Store, prod env vars). Secrets via EAS environment variables per profile.
- **OTA updates (`expo-updates`):** JS-only fixes ship OTA to the matching runtime channel (staging/production); anything touching native modules requires a store build. Policy: OTA for hotfixes + copy/prompt-adjacent client changes; store release for features (keeps review-visible behavior honest).
- Version scheme: `1.x.y` marketing + auto-increment build numbers via EAS.
- TestFlight: internal group (founder + testers) on every merge to `main` (staging build, weekly cadence or on-demand); external beta group before launch.

## 4. Backend releases (Railway)

- Merge to `main` → auto-deploy **staging**.
- Tag `v*` → release workflow: prod migrations → deploy **production** → health-check gate (`/v1/health`) → rollback on fail (Railway instant rollback to previous deploy).
- Secrets in Railway env per service; rotation runbook: rotate vendor key → update env → redeploy (no code change).

## 5. App Store readiness checklist (Phase 12 gate)

- [ ] Subscription metadata per guidelines: price, duration, renewal terms visible in-app (12 §3) and in App Store subscription config
- [ ] Restore purchases reachable; manage/cancel 2 taps (12 §2)
- [ ] No misleading trial copy (product 15 — Stella cautionary case); trial terms on plan card + StoreKit sheet
- [ ] Privacy nutrition labels from 14 §8; privacy policy + terms URLs live
- [ ] 17+ rating; review notes explaining AI-generated personalized content + crisis-support behavior (reviewer guidance with demo account)
- [ ] Demo account for review with pre-seeded onboarding (reviewers won't wait 24h cycles)
- [ ] Screenshots/ASO per product 19 growth plan (keyword-in-title)
- [ ] Sign in with Apple present (required — third-party login offered)
- [ ] Account deletion in-app (App Store requirement — 03 §5)

## 6. Monitoring & alerting

| Signal                            | Tool                                                  | Alert threshold                                                   |
| --------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| Crashes (mobile)                  | Sentry RN                                             | new-issue spike                                                   |
| Backend errors + traces           | Sentry Node                                           | error rate >1% of requests                                        |
| Generation failures               | PostHog `generation_failed` + Sentry                  | >3% of jobs/hour                                                  |
| **QA flags / never-include leak** | PostHog `generation_qa_flagged`                       | leak = page immediately (P1, product 18)                          |
| Latency                           | pipeline `latency_ms` p90                             | letter >40s p90 sustained                                         |
| Uptime                            | Railway health checks + external ping on `/v1/health` | down >2 min                                                       |
| Cron health                       | cron run logs (04 §5)                                 | pre-generation window with 0 processed while eligible users exist |
| Cost                              | vendor dashboards (LLM/TTS spend)                     | weekly review; alert at 2× forecast                               |

## 7. Documented upgrade paths (build when needed, not before)

- In-process job queue → BullMQ + Redis when concurrency/instance-count demands (04 §4).
- In-process crons → dedicated worker on horizontal scaling (04 §7).
- Supabase Realtime for job status → replaces polling (04 §2).
- CDN in front of Storage; localized pricing; EU data region — all V1.1+ flags.

## 8. Launch-day runbook (Phase 12 deliverable)

Pre-flight: prod migrations applied · vendors on prod keys (no-retention verified, 14 §8) · RC products approved in App Store Connect · paywall live-config sanity check · dashboards (13 §6) populated from TestFlight cohort · crisis resources verified per region · rollback tested. Then: phased release (App Store 7-day phased rollout ON), monitor wow-funnel + generation quality hourly on day 1.
