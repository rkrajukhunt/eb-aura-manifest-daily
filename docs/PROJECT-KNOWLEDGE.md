# PROJECT KNOWLEDGE — MASTER DOCUMENT

_The product brain. Read this first. Detailed truth lives in /docs/00–20; this file is the map and the decisions._
_Working name: Aura (final brand TBD — Open Question #1). Synthesized July 2026 from: Aura V1 product plan, Stella/Aya screen-by-screen extraction, two market-research reports, Stella App Store review mining, and founder direction (affirmation + gratitude generation as key focus, guided questions, technique education)._

---

## What we are building

An **AI companion manifestation app** for iOS: personalized future-life **audio moments**, AI-generated **affirmations** created through guided questions and framed with real techniques, a one-line **gratitude** practice — all powered by a **Living Memory** that makes the app feel like it _knows you_ and gets better every day.
One-liner: _An AI companion that turns your dream life into personalized audio moments and daily affirmations — and gets to know you better every day._ (→ 00)

## Who it's for

Women 22–45 in US/UK/CA/AU, arriving in states of anxiety + hope + desire for control. Primary persona: **The Quiet Dreamer** — a dream stuck in her Notes app, scrolling manifestation TikTok, burned by paywall-first quote decks. (→ 02)

## Why users will care (core psychology)

They come to feel **seen** and to feel **agency**. Personalization feels real only when it's _verbatim_ — their name, city, people, exact phrases. The habit forms because the daily ask is tiny (<3 min), arrival creates anticipation, rewards are meaningfully variable (occasionally a remembered detail), and every entry is an investment that makes tomorrow better. Shame is banned: missed days are never mentioned; the companion is glad you're back. (→ 03, 16)

## The WOW moment

**"A Letter From Your Future Self"** — after a conversational onboarding, the screen quiets, an orb breathes, and a warm voice speaks a 60–90s letter from the user's future self: her name in the first line, her real city, her people by name, her struggle in her own words becoming a memory, closing with the dynamic date ("You started this on a Friday in July. I remember. Keep going."). Karaoke text, no controls, one haptic at the first word. It happens **before the paywall** — the wow does the selling. (→ 08)

## MVP boundaries (ruthless)

**IN:** onboarding · Letter · daily moment + player + refine · Manifest Anything (3/wk) · Affirmation Studio (daily + guided generation + inline technique chips) · minimal gratitude (1 line/day, feeds memory) · Living Memory v1 + "What Aura Knows" + Never-Include · D7 milestone letter + word echoes · arrival notifications · dual-SKU transparent paywall + small real free tier · settings/full deletion · analytics.
**OUT of V1:** chat, widgets, own-voice, ambient mixer, vision board, Learn library (V1.1), speech recognition, Android. (→ 05, 19)

## Product principles (the tiebreakers)

Connection over content · one wow early, pre-paywall · **radical pricing honesty** · one habit a day · memory delights, never guilts · earn the subscription · the user's words are sacred · grounded magic (agency, not wishing) · calm premium iOS-native · no dark patterns (explicit ban list) · cost is a design constraint · ship the memory moat first. (→ 01)

## Design philosophy

Calm is the brand. Lavender/sky/sage on warm white; one high-contrast periwinkle CTA; elegant serif for letters and affirmations; 8pt grid with generous space; floating 4-tab pill (Home · Affirmations · Gratitude · Profile); the breathing **orb** is the companion's body and the only performer; motion is breath not bounce; haptics are punctuation (≤2/screen); Dark Mode and Dynamic Type from day one; 60fps or it doesn't ship. (→ 11, 12, 13)

## Companion personality

Aura speaks as "I" — warm, emotionally intelligent, literary-but-plain, slightly magical; never clinical, preachy, fake-positive, or salesy. Uses the user's words verbatim. Agency framing always. Notifications sound like a caring friend, name-first, zero guilt. Affirmation rules: present tense, positive frame, identity form, ≤20 words, anchored to a stated value. Banned-phrase list enforced by generation QA. (→ 14)

## Core user journey

Install → 5-min conversation (price disclosed up front; reflections prove listening) → generating ritual → **the Letter** → paywall (annual pre-selected $39.99/yr shown honestly beside $6.99/wk with monthly equivalent; dismiss once → free tier) → daily ritual: moment → affirmation → gratitude line → "that's enough for today" → D7 letter → D21 first callback → D30 Becoming review. Targets: onboarding >70% · wow→trial >35% · trial→paid >40% · D7/D30 paid 60%/35%. (→ 06, 15)

## The moat: Living Memory

Tiers: permanent profile facts · evolving memories (phrases, preferences, entries) · temporary context · sensitive (special handling) · user-controlled (Never-Include, per-item delete, transparency screen). Spent as micro-wows on a guarded cadence: daily word echoes, ≤1/wk remembered detail, ~monthly explicit callbacks and anniversary echoes, milestone letters D7/30/100. Privacy is brand: memory never fuels paywalls; delete means delete; sensitive items never in notifications or shares. (→ 10, 18)

## The 10 most important product decisions

1. **Wow before paywall** — the Letter converts; reverses Stella's model and its 1-star pattern.
2. **Named companion with living memory** as the moat — personalize the relationship, not just content.
3. **Dual-SKU transparent paywall:** annual $39.99 pre-selected + weekly $6.99 with printed monthly equivalent; trial on weekly only, A/B'd first (resolves research-vs-competitor contradiction).
4. **Radical pricing honesty from screen one** — the anti-Stella trust position (their reviews are the proof).
5. **Gratitude promoted into V1 (minimal, memory-fed)** — founder direction; one line/day that resurfaces in moments.
6. **Affirmation Studio with guided questions + inline technique education** — the credibility wedge no competitor has; full Learn library at V1.1.
7. **Shame-free by design** — no streak-loss states exist; absence never named.
8. **Daily arrival + forming previews** hybrid cadence (Stella's freshness + Aya's anticipation).
9. **Small real free tier** (1 moment + 1 affirmation + gratitude + the kept Letter) — review-score insurance and daily proof of magic.
10. **Grounded agency framing everywhere** — "you did the work," techniques as mental rehearsal; duty-of-care crisis path built in.

## The 5 biggest product risks

1. **Generation quality at scale** — if moments ever feel templated, we inherit the category's #1 killer complaint (QA token rules + banned phrases + refine loop are the mitigation).
2. **Unit economics** — LLM+TTS per-user cost vs $39.99/yr; mitigations: pacing, caching, on-demand caps; must be modeled in tech planning.
3. **Top-1% market** — Lifestyle's top 10% capture 97.9% of revenue; without an organic TikTok breakout the ceiling is low (growth plan in 19; pivot signals defined).
4. **Emotional responsibility** — an app that knows your struggles can hurt if careless; crisis path, sensitive-tier rules, and no-manipulation bans are release-blocking (18).
5. **Copyability** — Stella/Aya can clone features fast; only accumulated memory + brand trust compound (ship the moat first).

## The 5 assumptions to validate first

A1. The Letter itself drives trial starts (>35%) — not just "personalized content" generally.
A2. Annual-hero pricing beats weekly-hero on 12-month LTV in our own cohort.
A3. Memory transparency reads as delight, not surveillance.
A4. Technique education lifts credibility/retention rather than adding friction.
A5. The 3-beat daily ritual (<3 min) is enough value to hold D30 ≥35% paid.

## Unresolved before technical planning (full list → 20)

Brand name (Aura collides with Aura Health) · voice identity & TTS/LLM vendors under no-training terms · final price points + Experiment #1 design · on-demand limits vs modeled cost · pre-generation scheduling approach · crisis-detection method · anonymous-auth purchase flow.

## Document map

00 Vision · 01 Principles · 02 Audience · 03 Psychology · 04 Competition · 05 MVP Scope · 06 Journey · 07 Onboarding · 08 Wow Moment · 09 Features · 10 Memory · 11 IA · 12 Design System · 13 Motion & Haptics · 14 Voice & Content · 15 Monetization · 16 Retention · 17 Analytics · 18 Privacy & Safety · 19 Roadmap · 20 Open Questions
_Technology direction (React Native + TypeScript, NestJS, Supabase Auth/Postgres) is noted as context; architecture and implementation are deliberately excluded from this knowledge base and come next, in the technical plan._
