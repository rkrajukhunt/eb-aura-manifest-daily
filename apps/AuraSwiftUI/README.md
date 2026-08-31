# AuraUI — SwiftUI screen mockups

A standalone SwiftUI app with the three core Aura screens, **UI only** — no auth,
no backend, no data layer. Built to match the Aura "Ember & Bone" design.

## Screens

| Screen         | File                          | Notes                                                                          |
| -------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| **Sign in**    | `AuraUI/SignInView.swift`     | Ember orb, serif welcome, Apple / Google / email pills                         |
| **Onboarding** | `AuraUI/OnboardingView.swift` | Top nav bar (back + progress), a single-select question, Continue              |
| **Home**       | `AuraUI/HomeView.swift`       | Bottom tab bar; greeting, streak, today's moment, collections, recently played |

The Home tab bar carries **four real screens** (no placeholders):

| Tab              | File                            | Notes                                                          |
| ---------------- | ------------------------------- | -------------------------------------------------------------- |
| **Home**         | `AuraUI/HomeView.swift`         | the daily heartbeat                                            |
| **Affirmations** | `AuraUI/AffirmationsView.swift` | today's line on parchment, Create with Aura, saved words       |
| **Gratitude**    | `AuraUI/GratitudeView.swift`    | week dots, the day's prompt, a note field, this week's entries |
| **Profile**      | `AuraUI/ProfileView.swift`      | control center — Account, Memory, Basics, Trust rows           |

The three onboarding-flow screens are wired into a linear demo in `AuraUI/AuraUIApp.swift`:
**Sign in → Onboarding → Home**. Every button just moves forward — nothing is validated or stored.

## Design

- `AuraUI/DesignSystem.swift` — colours, type scale, spacing (ported from the RN `palette.ts`).
- `AuraUI/Components.swift` — `PillButton`, `OutlinePill`, `Label`, `Serif`, `Card`, `Orb`, `AnswerRow`.

**Fonts:** the RN app bundles Newsreader (serif) + Figtree (sans). Here the system
serif / sans stand in so the project runs with zero setup. To match exactly, add the
`.ttf` files to the target and switch `AuraFont` to `.custom(...)`.

## Run

Open `AuraUI.xcodeproj` in Xcode (15+), pick an iOS Simulator, and press **⌘R**.
Requires macOS + Xcode — there's no Swift toolchain on the Linux dev box, so this
project was authored but not compiled here.
