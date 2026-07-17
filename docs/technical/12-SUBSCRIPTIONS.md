# 12 — SUBSCRIPTIONS & PAYWALL

_RevenueCat. Implements product doc 15 (monetization) with its anti-resentment checklist as acceptance criteria, and the anonymous-purchase flow from 03._

---

## 1. Products & entitlements

| Store product         | RC package            | Price     | Trial                                      |
| --------------------- | --------------------- | --------- | ------------------------------------------ |
| `aura_premium_annual` | annual (default/hero) | $39.99/yr | none (launch config — product 15 decision) |
| `aura_premium_weekly` | weekly                | $6.99/wk  | 7-day                                      |

- One RC **entitlement**: `premium`. One **offering** `default` with both packages; annual listed first/pre-selected.
- Trial-on-weekly vs no-trial = **Experiment #1** via PostHog flag `exp_trial_variant` mapped to two RC offerings (`default`, `trial_off`) — mobile fetches the offering named by the flag variant (13 §5).
- Lifetime SKU: V1.1 (config-ready; no code dependency).
- App Store category: Health & Fitness (product 15 decision — store metadata, not code).

## 2. Mobile integration

- `react-native-purchases`; `Purchases.configure` + `logIn(supabaseUserId)` at boot (03 §4) — RC `app_user_id` ≡ Supabase `user_id` for anonymous AND claimed users (no aliasing).
- `useEntitlement()` hook wraps `getCustomerInfo` + listener → the single gating source of truth in UI.
- Purchase flow: paywall → `purchasePackage` → StoreKit sheet (trial terms restated natively — checklist #3) → success → **claim-account sheet** (03 §2.2) → Home.
- Restore: `restorePurchases` on paywall footer + Settings; claimed-account edge cases per 03 §2.3.
- Manage/cancel: Settings → Subscription → `showManageSubscriptions` — 2 taps (checklist #5).

## 3. Paywall surfaces (product 15 §spec)

| Surface                              | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Post-Letter (first presentation)** | Full-screen cover inheriting the Letter's gradient world (same-world crossfade, 06). Headline "Your future self has more to tell you." · contrast block (Today / Every day) · plan cards: annual pre-selected "$39.99/year · about $3.30/month", weekly "$6.99/week · about $27/month" (equivalent PRINTED — trust signature) · footer Restore/Terms/Privacy · dismiss X appears after 2s → free tier + "The letter is yours either way." Shown once; dismissal flag stored. |
| **Locked-feature sheets**            | Calm bottom sheet (never full-screen interrupt): honest price line + single CTA + "not now". Triggered by: Manifest Anything, refine, favorites beyond Letter, share-export, collections. `locked_feature_touched {feature}` logged.                                                                                                                                                                                                                                         |
| **D7 gentle annual upsell**          | For weekly subscribers only, inside D7 milestone flow: "Same mornings, a third of the price." One line, dismissible, never repeats.                                                                                                                                                                                                                                                                                                                                          |
| **Win-back**                         | Lapse +3d note (11 §3); plain resubscribe path; data and Letter kept (checklist #6).                                                                                                                                                                                                                                                                                                                                                                                         |

**No dark patterns (release-blocking, product 01 §10 + 15):** no urgency timers, no fake discounts, no second "quieter price" paywall, no paywall adjacent to vulnerable disclosures (the post-Letter placement is after the emotional resolution, per product 08), price on first app screen ("Free to begin. Premium from $39.99/yr…" — S1).

## 4. Free-tier gating map (product 15 §free tier)

| Feature                                                                                                                                     | Free     | Premium     |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| Daily moment (fully personalized)                                                                                                           | ✅ 1/day | ✅          |
| Daily affirmation                                                                                                                           | ✅       | ✅          |
| Gratitude                                                                                                                                   | ✅       | ✅          |
| The Letter (kept forever, replayable)                                                                                                       | ✅       | ✅          |
| Manifest Anything                                                                                                                           | ❌ sheet | ✅ 3/wk     |
| Refine                                                                                                                                      | ❌ sheet | ✅ 1/moment |
| Favorites beyond Letter / collections                                                                                                       | ❌ sheet | ✅          |
| Share-as-image export                                                                                                                       | ❌ sheet | ✅          |
| Enforcement: UI via `useEntitlement`; server-side re-check on premium endpoints (402, 04 §2) — client gating is UX, server gating is truth. |

## 5. Webhooks → `subscription_state` (07 §3)

RC webhook events upsert the mirror row (02 §4) and emit server analytics (13): `INITIAL_PURCHASE`→`purchase_completed`/`trial_started` · `RENEWAL`→`subscription_renewed` · `CANCELLATION`→`subscription_cancelled` (auto-renew off; entitlement persists to period end) · `EXPIRATION`→ entitlement `free` + win-back eligibility timestamp · `BILLING_ISSUE`→ grace handling (RC grace period on; no in-app nagging beyond one quiet Settings badge) · `TRANSFER`→ re-point `user_id` mapping (03 §2.3).
Mirror is used by: backend entitlement guard, credit checks, win-back cron. RC SDK remains the client truth (mirror lag tolerated).

## 6. Trial honesty mechanics (checklist #3)

- Trial terms restated on plan card AND relies on StoreKit confirmation sheet.
- `trial-reminder` cron (04 §5): day 5 of trial → honest reminder push (11 §3), `trial_reminder_sent` logged. RC `period_type=trial` + `expires_at` drive eligibility.

## 7. Testing (15 §6)

Sandbox: App Store sandbox accounts + RC sandbox mode per env; StoreKit configuration file for simulator UI tests; webhook flows tested against RC's webhook test events into staging. Critical-path e2e: purchase → claim → entitlement visible → webhook mirror row (Maestro + staging sandbox).

## 8. Anti-resentment checklist → release gate

Product 15's 7-point checklist is copied into the Phase 10 Definition of Done verbatim (IMPLEMENTATION-PLAN); each point maps to a manual test case. Shipping Phase 10 requires all 7 checked.
