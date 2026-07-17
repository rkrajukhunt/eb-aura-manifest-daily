# 11 — INFORMATION ARCHITECTURE

Principle: four tabs, calm screens, one primary thing per screen. (Both competitors validate 4-tab; we keep it.)

## Main navigation (floating pill tab bar)

**Home · Affirmations · Gratitude · Profile**
(PRODUCT DECISION: Gratitude earns a tab over a generic "Journal/Manifest" tab — it's the founder's focus and the daily third beat. Manifestation board/wall is V2 and will live inside Home collections when it arrives, avoiding a nav reshuffle.)

## Primary screens

- **Home:** greeting ("Hi {name}" + weekday) · Today's Moment card (play, countdown chip) · Coming for you (2–3 forming previews) · Collections grid (Favorites ❤️, On Demand ✨, auto-themed collections) · Recently played. Global "+" → Manifest Anything.
- **Affirmations:** today's card (reveal → countdown) · Create with Aura (guided flow) · Saved collection · technique chips on cards.
- **Gratitude:** today's prompt + one-line entry · weekday dots (no break-state) · history list.
- **Profile:** "The more Aura knows, the realer it feels" · Basics · Your dream · Your people · Lifestyle · Never Include · What Aura Knows (memory transparency) · gear → Settings.

## Secondary screens

Player (moment/letter, full-screen) · Read mode (synced text) · Collection detail · Saved-affirmations grid · Gratitude history · What Aura Knows · Settings · Subscription status.

## Modal flows (full-screen)

Onboarding stack · Letter experience · Paywall (first presentation) · Milestone letters (arrive full-screen like the original).

## Bottom sheets (native-feel, detents)

Manifest Anything input · Refine moment · Guided affirmation flow (multi-step sheet) · Share preview · Add/edit person · Add lifestyle tag · Edit-guard ("fix an earlier answer") · Locked-feature sheet (free tier) · Voice picker (if shipped) · Notification preferences.

## Full-screen experiences (no chrome)

The Letter · milestone letters · anniversary echo. These suppress tab bar and status distractions — they are _moments, not screens_.

## Feature → IA rationale (summary; full states in 09)

| Surface          | WHY IT EXISTS                                               | ENTRY                              | PRIMARY ACTION       |
| ---------------- | ----------------------------------------------------------- | ---------------------------------- | -------------------- |
| Home/Today       | The daily heartbeat lives one tap from launch               | App open, arrival notification     | Play today's moment  |
| Player           | The signature experience deserves a dedicated room          | Any moment card                    | Listen (Read toggle) |
| Affirmations tab | The habit + share engine needs a home, not a widget of Home | Tab, post-moment flow              | Reveal / Create      |
| Gratitude tab    | The 60-second closing beat of the daily ritual              | Tab, post-affirmation flow         | Write one line       |
| Profile          | Trust center + memory front door                            | Tab                                | Edit what Aura knows |
| Paywall          | Conversion after value                                      | Post-Letter; locked-feature sheets | Start annual/weekly  |

## Navigation behavior rules

Standard iOS push for drill-ins (interactive back-swipe everywhere) · sheets for input, pushes for content · player presents as full-screen cover with pull-down-to-minimize → persistent mini-player bar above tab bar while audio plays (Aya pattern) · deep links: notification → player directly (one tap to value) · state restoration: app always reopens where the ritual left off.

## Empty-nav guardrails

No hamburger menus, no "More" tab, no settings icon on Home. If a V2 feature can't find a home in this structure, the feature — not the IA — gets redesigned.
