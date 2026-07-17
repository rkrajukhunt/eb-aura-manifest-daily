# 20 — OPEN QUESTIONS

## Must answer BEFORE technical planning

1. **Brand name.** "Aura" collides with an existing large mindfulness app (Aura Health, ~$59.99/yr — see research table). A distinct, trademark-clearable, keyword-compatible name is needed; it affects bundle ID, ASO title, TTS persona naming, and all copy. Candidates from research: Lumi, Mira, Selene, Bloom, Muse, Becoming. → Decide first.
2. **Companion voice identity.** One narrator or two at V1? Female-default with male option, or single signature voice (Aya model)? Drives TTS vendor choice and cost model.
3. **Pricing final call + Experiment #1 design.** $39.99 vs $49.99 annual; trial-on-weekly-only confirmed? Which paywall variant ships as control? (15 gives the recommended default.)
4. **On-demand limits.** 3 Manifest Anything/week premium — confirm against modeled LLM+TTS unit cost.
5. **Generation scheduling.** Daily moments pre-generated overnight (cost-efficient, enables arrival notification) vs on-open (fresher context)? Recommendation: pre-generate at arrival-time minus buffer; confirm in tech planning.
6. **Crisis-detection approach.** Keyword list vs classifier; resource list per launch region; legal review of the supportive-response copy.
7. **LLM + TTS vendor shortlist** under no-training/no-retention terms with acceptable latency (<40s letter, <20s moment) and per-unit cost fitting the $39.99/yr economics.
8. **Anonymous-first auth flow.** Supabase anonymous session → account claim at purchase? (Recommended for onboarding friction; confirm restore/receipt edge cases.)

## Should answer EARLY (not blocking)

9. Rating-prompt timing (post-wow D3+ recommended vs Aya's in-flow) — EXPERIMENT.
10. Free-tier moment: fully personalized daily (cost) vs lighter personalization? Recommendation: fully personalized — the free tier IS marketing; confirm cost.
11. Which technique set ships in V1 inline chips (recommended: identity phrasing, present-tense why, 369 counter; scripting prompt) — confirm with founder.
12. Share-card visual templates: how many at launch (recommend 3)?
13. Android timeline commitment for planning purposes (research says iOS-only until PMF).
14. Does the Gratitude tab name stay "Gratitude" or broaden later when V2 board arrives ("Practice"?) — naming affects V1 IA only lightly.

## Known disagreements already resolved (logged in 04/05/15 — listed here for audit)

Pricing model (annual-hero + weekly, not weekly-only) · gratitude in V1 (minimal, promoted from Phase 2 per founder direction) · wow before paywall (vs Stella) · content cadence (daily + forming previews hybrid) · named companion, 1–2 voices · trial policy (weekly-only trial, A/B first).

## Assumptions register (top 5 — validate with real cohorts)

A1. The Future-Self Letter specifically (not just personalized affirmations) drives trial starts >35%.
A2. Memory transparency reads as delight, not surveillance.
A3. Annual-hero at $39.99 outperforms weekly-hero on 12-month LTV in OUR cohort (research says yes for Lifestyle; competitors monetize weekly — test).
A4. Technique education adds credibility/retention rather than friction.
A5. Personalization quality stays high enough at scale that "repetitive/generic" complaints (the category's #1 killer) never appear — depends on prompt-chain + QA rules (14), not just model choice.
