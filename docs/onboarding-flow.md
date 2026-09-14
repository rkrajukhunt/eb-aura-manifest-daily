# Onboarding Flow — Screens up to the Paywall

The full sequence a new user walks, from first launch to the paywall. It has three
segments:

1. **The Conversation** — `SCREEN_ORDER` in `src/features/onboarding/flow.ts`. One
   question (or beat) per screen, fixed order, with three branches that depend
   on earlier answers.
2. **The handoff** — the notification ask closes onboarding, then the generation
   ritual runs and the first Letter is revealed.
3. **The paywall** — shown after the first Letter, only if the user is not already
   premium.

Route files live in `apps/mobile/app/(onboarding)/`; feature components live in
`apps/mobile/src/features/onboarding/screens/`.

> Legend — **Answer**: what the screen collects. `none` = a "moment" beat that
> carries no answer and no progress step. Only answer-carrying screens count toward
> the progress header.
>
> This is Onboarding v5 (`SCREEN_ORDER` is the single source of truth — the design
> "Aura Ember Onboarding v5", 2026-09-01). `shared` types `OnboardingScreenId`
> include the retired ids below exactly so historical analytics stay typed; this
> table lists only the live flow.

---

## 1. The Conversation (`SCREEN_ORDER`)

| #   | Screen id           | On-screen title                                                                          | Answer         | Component          | Notes                                                                               |
| --- | ------------------- | ---------------------------------------------------------------------------------------- | -------------- | ------------------ | ----------------------------------------------------------------------------------- |
| 1   | `a01-splash`        | Aura splash                                                                              | `none`         | `A01Splash`        | Funnel front-matter.                                                                |
| 2   | `a02-value`         | "Rewire your mornings" / "Manifest with intention" / "Feel calm, grateful, unstoppable"  | `none`         | `A02Value`         | The contract — three-panel value beat.                                              |
| 3   | `a04-goals`         | "What do you most want to bring into your life?"                                         | `multi_choice` | `A04Goals`         | Q1 — choose up to three → `values`.                                                 |
| 4   | `q-priority`        | "Which one matters most right now, honestly?"                                            | `choice`       | `QPriority`        | Q2 — piped from Q1; **skipped when only one goal was picked**.                      |
| 5   | `q-context`         | Branched on the primary goal ("And the work you do now…" / "When money comes up…" / …)   | `choice`       | `QContext`         | Q3 — six variants; **`habits` has none and skips**. Header-skippable.               |
| 6   | `s03-name`          | "What should I call you?"                                                                | `text`         | `S03Name`          | Q4 — pronoun rides along on the same screen. Skippable; pronoun never inferred.     |
| 7   | `a11-affirmation`   | "Your first one"                                                                         | `none`         | `A11Affirmation`   | **VALUE** — pre-written line per goal; first felt payoff before any deep ask.       |
| 8   | `a05-feeling`       | "How's the last week or two actually been?"                                              | `choice`       | `A05Feeling`       | Q5 — the **safety router**: `low` / `struggling` set gentle mode and offer support. |
| 9   | `v-insight`         | Insight by mood ("Good weeks are the best time to build something…") or the Support card | `none`         | `VInsight`         | **VALUE** — reciprocity on the very next screen; `struggling` swaps in support.     |
| 10  | `a06-obstacle`      | "What usually gets in the way?"                                                          | `multi_choice` | `A06Obstacle`      | Q6 — > → `struggle`.                                                                |
| 11  | `q-lexicon`         | "What kind of language actually lands for you?"                                          | `choice`       | `QLexicon`         | Q7 — the vocabulary fork (universe / neuro / faith / practical / mix).              |
| 12  | `q-offlimits`       | "Anything you'd rather I stayed away from?"                                              | `multi_choice` | `QOffLimits`       | Q8 — chip picks + own additions; **pre-filled from Q7**; skip leaves zero picks.    |
| 13  | `q-belief`          | "Which of these could you actually say out loud and mean it?"                            | `choice`       | `QBelief`          | Q9 — identity / process / practical; calibrates tone.                               |
| 14  | `q-calibration`     | "When you read 'I am confident,' what happens?"                                          | `choice`       | `QCalibration`     | Q10 — **conditional**: only the contradiction resolver sees it.                     |
| 15  | `v-reflect`         | "Here's what I heard {name}"                                                             | `none`         | `VReflect`         | **VALUE** — the mirror: her actual answers, never a template.                       |
| 16  | `a08-ritual-time`   | "When will you take your three minutes?"                                                 | `choice`       | `A08RitualTime`    | Q11 — preset picker → `arrival_time`; the button is the time commitment.            |
| 17  | `v-gratitude`       | "Name one thing you're grateful for."                                                    | `text`         | `VGratitude`       | **VALUE** — first gratitude entry; seeds the journal. Skippable.                    |
| 18  | `v-consent`         | "How Aura writes your personal practice"                                                 | `choice`       | `VConsent`         | AI consent — explicit and unbundled, before anything is generated.                  |
| 19  | `s12-notifications` | "Want this to reach you at {time}?"                                                      | `none`         | `S12Notifications` | Notification pre-prompt + preview push. **Closes onboarding.**                      |

**Progress denominator:** the header track runs from the first question
(`a04-goals`) to the consent (`v-consent`) and counts **answer-carrying screens
only** — 13 at most (`a04`, `q-priority`, `q-context`, `s03`, `a05`, `a06`,
`q-lexicon`, `q-offlimits`, `q-belief`, `q-calibration`, `a08`, `v-gratitude`,
`v-consent`). A skipped branch drops out of the denominator, so "n / 13" reads
truthfully (see `progressOf` in `flow.ts`). Value beats hold the last question's
progress rather than adding a step.

The three branches: Q1 > 1 goal skips Q2; primary goal `habits` skips Q3; mood
`low` / `struggling` swaps the Q9 follow-up to gentle-mode support. Contradiction
resolver: a Q9 pick of process/practical calibrates in Q10.

**Retired but kept (ids preserved — screens removed from the flow):**
`s01-welcome`, `s02-meet-aura`, `a03-social-proof`, `s04-self-description`,
`s05-work-feeling`, `s06-values`, `s07-dream-home`, `s08-dream-city`, `s09-people`,
`s10-struggle`, `s11-arrival-time`, `s12-why-notifications`, `a10-commitment`,
`a12-reminder`, `s13-commit`.

---

## 2. The handoff

| Screen id            | On-screen title                           | Component              | When shown                                                                                                                                    |
| -------------------- | ----------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `s12b-notifications` | "Your moment can't reach you on its own." | `S12NotificationsMore` | **Conditional** — only if the user declined the OS prompt or tapped "Maybe later" on `s12-notifications`. Shown once. Also stamps completion. |
| `generating`         | Generation ritual                         | `generating.tsx`       | After completion is stamped. `router.replace('/letter')` when ready.                                                                          |
| `letter` (`/letter`) | The first Letter reveal                   | `LetterScreen`         | On finish: `router.replace(premium ? '/(tabs)/home' : '/paywall')`.                                                                           |

---

## 3. Paywall

- **Route:** `app/paywall.tsx`
- **Reached from:** `app/letter.tsx` — shown after the first Letter **only when the
  user is not premium** (premium users go straight to `/(tabs)/home`).

This is the end of the onboarding funnel.

---

## Path summary

```
a01-splash → a02-value → a04-goals → q-priority → q-context → s03-name
  → a11-affirmation → a05-feeling → v-insight → a06-obstacle → q-lexicon
  → q-offlimits → q-belief → q-calibration → v-reflect → a08-ritual-time
  → v-gratitude → v-consent → s12-notifications
      └─(single goal)── q-priority skipped
      └─(primary: habits)── q-context skipped
      └─(mood low/struggling)── v-insight shows Support instead of insight
      └─(declined / "maybe later")→ s12b-notifications
  → generating → letter
      └─(not premium)→ paywall
```
