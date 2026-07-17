# 11 — NOTIFICATIONS

_The companion's voice outside the app. Implements product docs 09 §9.6, 16 §notification policy, 07 §S11. Hard rules: name-first, in-voice, zero guilt, sensitive-tier never appears, auto-soften on ignore._

---

## 1. Infrastructure

- **Expo Push Service** (APNs under the hood): mobile obtains `ExpoPushToken` via `expo-notifications`, writes it to `notification_tokens` (Supabase direct, RLS). Backend `NotificationsModule` sends via Expo push API; receipts checked async; `DeviceNotRegistered` → token `active=false`.
- All sends originate from the backend scheduler (04 §5) — the app never local-schedules content notifications (content isn't known ahead; arrival time is server-driven). Exception: none at V1.

## 2. Permission flow (product 07 §S11, 09 §9.6)

- Arrival time captured at onboarding S11 — **no OS dialog then**.
- OS permission requested **post-paywall** on first Home landing, with banked context sheet: "So your moments can find you at {time}" → then the system dialog. `notification_permission_result` logged.
- Denied → Home shows a quiet, dismissible hint once/week max ("Your moments arrive at {time} — I can tell you when they're ready"); deep-links to settings. Never nags.

## 3. Notification catalog

| Type                       | Timing                                 | Copy pattern (from `copy` catalog, product 14 rules)                                                 | Payload deep link          |
| -------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------- |
| Moment arrival             | `arrival_time` (after pre-gen success) | "{name} — this morning's is about {title-derived theme}."                                            | `aura://moment/{id}`       |
| Affirmation nudge (opt-in) | per `notification_prefs`               | "{name} — today's words are waiting."                                                                | `aura://affirmation/today` |
| D7 milestone               | arrival time on day 7                  | "{name} — I wrote you something. It's been a week."                                                  | `aura://letter/{id}`       |
| Trial reminder             | trial day 5                            | "Your trial converts in 2 days — keep or cancel, both fine." (honesty rule, product 15 §checklist 3) | settings/subscription      |
| Win-back note              | lapse +3 days, once                    | warm, references dream area only                                                                     | `aura://moment/{id}`       |

**Copy safety invariants:** copy assembled ONLY from `name` + moment `title` (QA-guaranteed sensitive-free, 08 §5) + fixed in-voice templates. The notification builder has no access to memory items or free text — enforced by module boundary (09 §5). Banned-phrase lint applies to templates (15 §5). No notification exists purely to reopen the app (product 09 hard rule) — every send maps to real new content or a billing fact.

## 4. Preferences (`notification_prefs`, product doc 04 — Aya-grade granularity)

- `arrival_enabled` (default on) · `affirmation_nudge`: quiet / once_daily / custom_hours (+ window).
- UI: preferences sheet from Settings and from any notification's long-press settings action.
- Server respects prefs at send time (not schedule time) — latest prefs always win.

## 5. Auto-soften (product 16 — respect > re-engagement)

- `moment_arrival_notification_opened` events reset `ignored_arrival_count`; sends without opens increment it (open attribution via deep-link launch source, 13).
- Count ≥3 → `softened=true` (cron, 04 §5): arrival notes drop to 3/week (Mon/Wed/Sat pattern), `notification_softened` logged. Any open → unsoften, count reset.
- Absence is never named in any copy — softening is silent.

## 6. Timezone & scheduling correctness

- `arrival_time` is local time in `profiles.timezone`; cron scans in 15-min windows converting per-user (04 §5). DST handled by IANA tz conversion at scan time.
- Timezone changes (travel): mobile updates `profiles.timezone` on foreground when device tz differs → next cron uses it. Same-day double-delivery guard: one arrival notification per `moments.scheduled_for` date (send log check).
- Multi-device: send to all `active` tokens.

## 7. Edge cases

- Pre-generation failed by arrival time → no notification (never notify without content); moment falls back to on-open generation (07 §1).
- Notification tapped for an already-played moment → player opens in replay state (no error).
- App uninstalled → receipts mark token inactive; user churn handled by anon-sweep (03).

## 8. Phase mapping

Phase 9 builds all of this. Prerequisites: pre-generation cron (Phase 7), copy catalog (Phase 1), prefs UI shell (Phase 9).
