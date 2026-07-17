# 06 — NAVIGATION (Expo Router)

_Implements product doc 11 (Information Architecture) exactly: four tabs, sheets for input, covers for moments, no hamburgers, no "More" tab._

---

## 1. Route map

```
app/
├── _layout.tsx                     # root stack: providers, auth/onboarding gate, theme
├── (onboarding)/
│   ├── _layout.tsx                 # onboarding stack (gesture-back = edit previous, guarded)
│   ├── s01-welcome.tsx … s11-arrival-time.tsx
│   └── generating.tsx              # ritual screen → auto-advances to /letter
├── letter.tsx                      # full-screen cover, no chrome (wow + milestone reuse)
├── paywall.tsx                     # full-screen cover (first presentation, post-letter)
├── (tabs)/
│   ├── _layout.tsx                 # floating pill TabBar + mini-player host
│   ├── home.tsx
│   ├── affirmations.tsx
│   ├── gratitude.tsx
│   └── profile.tsx
├── player.tsx                      # full-screen cover, pull-down to minimize
├── collection/[id].tsx             # push
├── affirmations/saved.tsx          # push
├── gratitude/history.tsx           # push
├── profile/what-aura-knows.tsx     # push
├── settings/index.tsx              # push (from Profile gear)
├── settings/subscription.tsx       # push
├── settings/delete-account.tsx     # push
└── auth/callback.tsx               # magic-link deep-link handler (03)
```

## 2. Presentation rules (product 11)

| Pattern                          | Used for                                                                                                                                                                                                     | Mechanism                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Push (interactive back-swipe)    | drill-ins: collections, history, What Aura Knows, settings                                                                                                                                                   | native-stack default                                                                             |
| **Full-screen cover, no chrome** | Letter, milestone letters, anniversary echo, player, first paywall                                                                                                                                           | `presentation: 'fullScreenModal'`; tab bar + status distractions suppressed                      |
| **Bottom sheet (detents)**       | Manifest Anything input · Refine · Guided affirmation flow (multi-step) · Share preview · Add/edit person · Add lifestyle tag · Edit-guard · Locked-feature (free tier) · Notification prefs · Claim-account | `@gorhom/bottom-sheet` wrapped by design-system `Sheet` (medium/large detents, grabber, 40% dim) |
| Mini-player                      | audio continuity                                                                                                                                                                                             | persistent bar rendered in `(tabs)/_layout` above TabBar while player minimized; tap → re-cover  |

## 3. Gating logic (root `_layout`)

```
session missing            → create anonymous session (03)
onboarding incomplete      → (onboarding) stack at last answered screen (draft store)
letter generated, unseen   → /letter
letter seen, paywall unseen→ /paywall   (once — dismiss → free tier, flag stored)
else                       → (tabs)/home
```

State restoration: the gate re-derives from `profiles` + local flags, so the app always reopens where the ritual left off (product 11).

## 4. Onboarding stack behavior (product 07)

- Forward: `router.push` with 350ms push+crossfade; answers commit to draft store on Continue.
- **Edit-guard:** back-swipe or "Fix an earlier answer" opens the edit sheet listing answered screens → jump edits a single answer → returns to current position. Never restarts the flow.
- Resume: draft persisted in MMKV; killed app reopens at last answered screen.
- S12 `generating.tsx` disables gestures (no accidental back during the ritual); system back on `/letter` shows the "Continue listening / Save for later" sheet (product 08 §6 escape hatch).

## 5. Deep links

Scheme `aura://` + universal links (assoc. domain when site exists).

| Link                                                                                                                                                                                                | Target                                                | Source                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------- |
| `aura://moment/{id}`                                                                                                                                                                                | `/player?momentId=` (bypasses Home; one tap to value) | arrival notification   |
| `aura://letter/{id}`                                                                                                                                                                                | `/letter?momentId=`                                   | milestone notification |
| `aura://affirmation/today`                                                                                                                                                                          | `(tabs)/affirmations`                                 | affirmation nudge      |
| `aura://auth/callback#…`                                                                                                                                                                            | `/auth/callback`                                      | magic link             |
| Cold-start deep links resolve after boot gate (§3) — link is honored post-gate unless onboarding is incomplete (then it queues to Home after completion; a notification can't skip the wow funnel). |

## 6. Tab bar

Floating pill, 4 tabs (Home · Affirmations · Gratitude · Profile), center-weighted "+" on Home surface (not a 5th tab) → Manifest Anything sheet. Active tint periwinkle; icons SF-Symbols-weight (`expo-symbols` with fallback). Hidden when: any full-screen cover, keyboard open, or onboarding.

## 7. Guardrails (product 11)

No hamburger menus · no "More" tab · no settings icon on Home (gear lives on Profile) · sheets for input, pushes for content · V2 features (vision board, widgets) must fit this structure or be redesigned — the IA does not grow tabs.
