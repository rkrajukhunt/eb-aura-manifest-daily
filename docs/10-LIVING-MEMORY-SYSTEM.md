# 10 — LIVING MEMORY SYSTEM

The moat. Stella/Aya personalize content; we personalize the _relationship_. Memory compounds: the longer you stay, the better it gets, the harder it is to leave.

## What Aura remembers (categories)

| Category                  | Examples                                             | Tier                                         |
| ------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| Identity                  | name, self-description, optional basics              | Permanent profile fact                       |
| Dreams & goals            | dream city/home, "my own studio", goal threads       | Permanent, user-evolvable                    |
| Important people          | "Mom — safe", "Jane — fun"                           | Permanent, user-managed                      |
| Places & lifestyle        | current city, tags ("iced americano", "the cottage") | Evolving                                     |
| Struggles & fears         | onboarding struggle (verbatim), later disclosures    | **Sensitive** — special handling             |
| Exact phrases             | user's literal wording, harvested from all free text | Evolving — the personalization fuel          |
| Milestones & events       | started date, D7/D30, "signed the lease"             | Evolving                                     |
| Preferences & feedback    | refine choices (softer/more realistic), tone, voice  | Evolving                                     |
| Gratitude & saved moments | entries, favorites, created affirmations             | Evolving                                     |
| Temporary context         | "big interview Thursday"                             | Temporary — expires or converts to milestone |

## Memory tiers (product behavior, not schema)

- **Permanent profile facts:** edited only by the user; always injected into generation.
- **Evolving memories:** accumulated from entries, refines, phrases; ranked by recency + emotional weight; sampled into generation context.
- **Temporary context:** short-lived; either expires quietly or gets an outcome follow-up once ("How did Thursday go?" — asked at most once, never nagging).
- **Sensitive information:** struggles, health/relationship pain, anything crisis-flagged. Rules: referenced only gently, only in the user's own words, never in notifications, never in shareable artifacts, never joked about, excluded entirely if user marks it done/private.
- **User-controlled:** Never-Include list (topics/people excluded from ALL generation — hard filter, checked post-generation too) + per-item delete in "What Aura Knows."

## How memory creates micro-wow moments (the spending plan)

| Micro-wow                                                                                                                                                                                                                                                                                                                  | Experience                                                                            | Cadence guard                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| Word echoes                                                                                                                                                                                                                                                                                                                | Daily content reuses exact phrases ("the cottage", "Mom")                             | Every generation (baseline)           |
| Remembered detail                                                                                                                                                                                                                                                                                                          | A small thing mentioned once, forgotten, resurfaces naturally                         | ≤1 per week — scarcity keeps it magic |
| Callbacks                                                                                                                                                                                                                                                                                                                  | "Three weeks ago you said you were scared to start…"                                  | ~D21, then monthly                    |
| Progress noticing                                                                                                                                                                                                                                                                                                          | "Your words about work have changed. Listen."                                         | Only with real signal                 |
| Milestone letters                                                                                                                                                                                                                                                                                                          | D7 / D30 / D100 future-self letters citing their own entries                          | Fixed dates                           |
| Anniversary echo                                                                                                                                                                                                                                                                                                           | "A month ago today you told me about {struggle}…" replays that day's moment + today's | Monthly                               |
| People moments                                                                                                                                                                                                                                                                                                             | A generated moment seats a named person at the table                                  | Natural frequency                     |
| **Anti-uncanny rules:** never recite memory mechanically ("According to my records…"); never callback sensitive items in notifications; never more than one explicit callback per day; if a detail might be stale (person removed, goal changed), prefer silence over a wrong guess — a wrong callback is worse than none. |

## Privacy & user-control principles (see 18 for full policy)

1. **Transparency by design:** "What Aura Knows" screen lists memories in plain language ("You told me your dream city is London") with per-item delete. Being open about memory is the brand promise, not compliance theater.
2. **User authorship:** edit anything; edits take effect on next generation and the app says so.
3. **Never-Include is sacred:** hard exclusion from prompts AND post-generation content checks.
4. **Delete means delete:** account deletion wipes memories, entries, audio.
5. **Memory serves the user, never the funnel:** memories are never used in paywall copy, win-back pressure, or ads. (Explicit prohibition.)
6. **Minimum collection:** we ask only what generation uses; optional fields stay optional.

## Product decisions

- Memory v1 is deliberately simple: structured profile + tagged memory items + phrase list. No embeddings/RAG sophistication needed to feel magical at V1 — the _product behaviors_ above matter more than retrieval tech. (Guard against over-engineering; tech design comes later.)
- Every input surface (gratitude, refine, manifest-anything text, profile edits) writes memory; every generation reads it. This loop is the definition of "personalization that improves over time."
- ASSUMPTION to validate: users perceive memory transparency as delight, not surveillance. Mitigation: warm language, obvious controls, opt-out respected instantly.
