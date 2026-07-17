# 09 — MEMORY ARCHITECTURE

_The moat. Implements product doc 10 (Living Memory) and the callback cadence from 16. Deliberately simple by design decision (product 10): structured rows + phrase list, **no embeddings/RAG at V1** — the behaviors matter, not retrieval tech. Schema → 02 §2._

---

## 1. Write paths (every input surface writes memory)

| Surface                     | Writes                                                         | Category / tier                                                      | Notes                                                                                                                                                                                                   |
| --------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding S3–S11           | profile fields + seed `memory_items` + `exact_phrases`         | identity/dream/person/struggle · permanent (struggle: **sensitive**) | phrases harvested from S4/S8/S10 free text (§2)                                                                                                                                                         |
| Gratitude entry             | `gratitude_ref` item + phrases                                 | evolving, weight from length/emotion words                           | mobile writes the entry direct to Supabase; no backend hook needed — context assembly reads `gratitude_entries` directly at generation time, and phrase harvest runs lazily then for the latest entries |
| Refine feedback             | `preference` item ("prefers softer tone")                      | evolving                                                             | written by `/generation/refine` handler                                                                                                                                                                 |
| Manifest Anything           | `dream` item + phrases from `desireText`                       | evolving                                                             | written by `/generation/manifest` handler                                                                                                                                                               |
| Profile edits               | update permanent items; removed people → `people.active=false` | permanent                                                            | "I'll write differently from now on" copy on save                                                                                                                                                       |
| "Anything Aura should know" | `temp_context` or `place_lifestyle` item                       | evolving/temporary                                                   |                                                                                                                                                                                                         |
| System (milestones)         | `milestone` items (started date, D7 reached)                   | evolving                                                             | cron                                                                                                                                                                                                    |

**Phrase harvesting (V1, deterministic):** quoted spans, capitalized proper nouns, and 2–4-word noun phrases containing user-distinctive words (not in a stopword/common list) from free text; stored verbatim with source. No NLP service — a simple heuristic function, unit-tested. (Upgrade path: LLM-assisted extraction in V1.1 — flagged, not built.)

## 2. Tier semantics (product 10 §tiers)

| Tier        | Injection rule                                                                                                                                    | Lifecycle                                                                                                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `permanent` | always in context                                                                                                                                 | user-edited only                                                                                                                                                                                                                            |
| `evolving`  | sampled (§4)                                                                                                                                      | accumulates; `use_count`/`last_used_at` updated on injection                                                                                                                                                                                |
| `temporary` | included while valid                                                                                                                              | `expires_at` set at write (default 14d); expiry cron (04 §5) deletes, or converts to `milestone` if the user confirmed an outcome (the one-time "How did Thursday go?" follow-up is a **V1.1 flag** — V1 expires silently, per scope guard) |
| `sensitive` | struggle + crisis-adjacent items: injected ONLY into letter/moment body context, never titles, never notifications, never shares, never analytics | user can mark "done/private" → excluded entirely (flag on item)                                                                                                                                                                             |

## 3. Emotional weight (set at write, 1–5)

Heuristic: base 2 · +1 if from struggle/S10 or contains emotion lexicon words · +1 if user-authored free text (vs choice chips) · 5 reserved for the onboarding struggle. Used only for sampling priority — never surfaced.

## 4. Read path — `MemoryContextService.assemble(userId, artifact)`

Deterministic assembly, ~1 cheap query set, no vector search:

```
1. profiles row + active people            (always)
2. never_include list                      (always — hard exclusions)
3. permanent memory_items                  (always)
4. evolving items: top N=8 by score =
     recency_decay(created_at) × emotional_weight × novelty(1/use_count+1)
   filtered: sensitive only for letter/moment body; skip items referencing
   inactive people (anti-uncanny: silence over wrong guess — product 10)
5. exact_phrases: top 6 by same score      (verbatim list for the prompt)
6. last 3 gratitude entries                (light weaving — product 09 §9.4)
7. cadence directives                      (§5)
8. recent moment titles/themes (last 5)    (anti-repetition instruction)
```

Injected items get `last_used_at`/`use_count` bumped on job success.

## 5. Callback scheduler (cadence guards — product 10 §spending plan, 16)

State derives from data, not a separate scheduler table:

| Micro-wow         | Trigger rule (evaluated during assembly)                                                                                                                                                    | Guard                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Word echoes       | always: phrases list in context                                                                                                                                                             | baseline, every generation |
| Remembered detail | eligible if no item with `category != phrase` was explicitly injected as "remembered detail" in last 7 days (tracked via `last_used_at` on the chosen item + directive flag in `qa_report`) | ≤1/week                    |
| Explicit callback | user ≥ D21 and none in last 30 days → directive: "open by recalling: {struggle/goal item} in their words"                                                                                   | ~monthly, never >1/day     |
| Milestone letters | cron: D7 at V1 (D30/D100 V1.1)                                                                                                                                                              | fixed dates                |
| Anniversary echo  | V1.1                                                                                                                                                                                        | —                          |
| People moments    | people list always in context; prompt says "naturally, not forced"                                                                                                                          | natural frequency          |

**Anti-uncanny rules enforced in prompt + QA:** never "according to my records" phrasing (banned list) · sensitive never in notifications (11 §3 doesn't read memory at all — notification copy uses only the moment `title`, which QA guarantees is sensitive-free) · stale-data silence (inactive people filtered).

## 6. Transparency & control (product 10 §privacy)

- **"What Aura Knows"** screen: mobile reads `memory_items` + profile directly (RLS); rendered in plain language from `content` field ("You told me your dream city is London"). No backend endpoint needed.
- **Per-item delete:** hard `DELETE` via Supabase (RLS delete-own). Mid-cycle consistency: a pre-generated-but-unplayed moment may reference a just-deleted item — acceptable at V1 (the moment was generated while consent existed); deletion takes effect from next generation. Documented user-facing as "from now on."
- **Never-Include:** insert via Supabase; enforced at prompt build AND QA post-check (08 §5). Adding a term does not retro-edit existing content (same "from now on" rule) — except: if today's `ready` moment contains the term, mobile hides it and requests regeneration (edge case handled in Phase 7).
- **Memory never fuels the funnel:** paywall/win-back copy builders have no MemoryContext dependency — enforced by module boundaries (paywall is mobile-only; winback prompt uses only `dream` category items, never struggle — explicit in its builder + tested).

## 7. Deletion & export

Account deletion cascades everything (02 §8, 14 §6). Data export ("download my data") is V1.1 (product 18) — flagged; the schema requires no changes for it.

## 8. Phase mapping

Phase 4 builds: tables, write paths for onboarding/profile, What Aura Knows, Never-Include, phrase harvester. Phase 5 builds: MemoryContextService + cadence directives. Phases 7–9 wire remaining write paths (refine, manifest, gratitude, milestones) as those surfaces land.
