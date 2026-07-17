# 08 — AI ARCHITECTURE

_The generation engine. Implements product docs 08 (wow moment), 14 (voice + guardrails), 18 (safety). Lives entirely in the NestJS backend (04); mobile never talks to an LLM._

---

## 1. Provider abstraction

```ts
// providers/llm/llm-provider.interface.ts
interface LlmProvider {
  generate(req: {
    system: string;
    prompt: string;
    maxTokens: number;
    timeoutMs: number;
    model?: string; // Phase 5: exact model id (tier resolved by the generation layer, §2)
    json?: boolean; // Phase 5: request strict JSON (response_format); parsed defensively regardless
  }): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }>;
  ping(): Promise<boolean>;
}
```

Adapters: `OpenAiLlmProvider` (launch default), `MockLlmProvider` (dev/CI); other vendors (e.g. Anthropic) can be added as adapters later without touching prompt logic. Selected by `LLM_PROVIDER` env at boot (04 §6). All prompt logic lives _outside_ the adapters — switching vendors touches one file.

## 2. Vendor decision — **OpenAI (ChatGPT API), locked** (founder decision 2026-07-17)

Hard requirements (product docs 18, 20-Q7), all satisfiable with OpenAI: **no-training/no-retention API terms** (API data is not used for training by default; enable zero-data-retention / data controls on the org — verify in writing at account setup, tracked in 14 §8) · latency fits budgets (§6) · warm literary prose quality · cost fits $39.99/yr economics.

**Model tiering within OpenAI (finalize at Phase 5 with a small bake-off between OpenAI tiers):**

| Artifact                                                | Model tier                                                   | Rationale                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Letter, milestone letters                               | flagship tier (e.g. current GPT-4-class/`gpt-4.1`-successor) | the wow — quality over cost, ~3/user/month                          |
| Daily moments, manifest, refine                         | mid tier                                                     | daily volume; quality bar still high (repetition = category killer) |
| Affirmations, forming-preview titles, crisis classifier | mini tier                                                    | short outputs, strict QA gate catches quality dips                  |

**Bake-off (Phase 5 start, 1 day):** 20 synthetic user profiles × letter/moment prompts across the OpenAI tiers; score against the QA rubric (§5) + founder taste test; pin exact model ids in env config. Cost model in §7 remains conservative (mid-tier pricing is at or below the Sonnet-tier figures used there).

## 3. Prompt architecture

One builder per artifact in `generation/prompt/`; all share:

- **System prompt core:** Aura's voice constitution (product 14 — warm, literary-plain, agency framing, banned-phrase list stated as negative constraints), stable text first (cache-friendly).
- **Memory context block** (assembled by 09 §4): profile facts, sampled memory items, exact phrases _listed verbatim with instruction to use them literally_, never-include list as hard exclusions, cadence directives (e.g. "include the remembered detail: {item}" only when the scheduler allows).
- **Artifact spec:** per-type structure + length rules.

| Artifact             | Structure requirements (from product docs)                                                                                                                                                   | Length                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Letter               | name in first sentence · dream city · ≥1 person by name+descriptor · struggle verbatim→memory framing · ≥1 exact phrase · dynamic date close ("You started this on a {weekday} in {month}…") | 140–220 words                |
| Daily moment         | first-person future scene, agency framing, ≥3 verbatim tokens, word echo baseline, occasional remembered-detail (scheduler-gated)                                                            | 90–180 words (60–120s audio) |
| On-demand (Manifest) | anchored to `desireText` verbatim + memory context                                                                                                                                           | 90–180 words                 |
| Refine               | previous text + direction (`more_realistic`/`softer`/`more_ambitious`/note) → rewrite, same rules                                                                                            | as daily                     |
| Daily affirmation    | present tense · positive frame · identity form preferred · ≤20 words · anchored to a stated value or exact phrase · plausible stretch                                                        | ≤20 words + `why_line`       |
| Guided affirmations  | 3 candidates from goalArea/feeling/tone, each with `why_line` + technique tag                                                                                                                | ≤20 words each               |
| Milestone (D7)       | acknowledges the week, quotes one gratitude entry verbatim, identity framing, no badges                                                                                                      | 100–180 words                |
| Winback              | free mini-moment referencing their dream, zero pressure                                                                                                                                      | ≤100 words                   |

Output format: model returns JSON (`{ title, body }` / `{ candidates: [...] }`) via structured-output instruction; parsed defensively.

## 4. Pipeline order (per job)

```
CrisisCheck(free-text inputs)            → 422 path, no generation (14 §5)
→ MemoryContext.assemble(userId, artifact)
→ PromptBuilder.build(artifact, context)
→ LlmProvider.generate()
→ QaGate.check(output, context)          → fail: 1 corrective regeneration → fail: job qa_failed
→ TtsProvider.synthesize(body)           → audio + word timings (10)
→ persist moments/affirmations + Storage
```

## 5. QA gate (release-blocking rules — product 08 §quality bar, 14 §guardrails)

Deterministic checks, no LLM needed (fast, testable — the highest-value unit tests in the codebase, 15 §2):

| Check                      | Rule                                                                                                                                                           | On fail                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Verbatim tokens            | letters/moments: ≥3 of {name, city, people, exact phrases} present as substrings; affirmations: ≥1                                                             | regenerate with corrective note                    |
| Name-first                 | letter: `name` in first sentence                                                                                                                               | regenerate                                         |
| Banned phrases             | case-insensitive list from product 14 §6 ("unlock your potential", "on this journey", "the universe has plans", …) — maintained in `packages/shared/constants` | regenerate                                         |
| **Never-Include**          | no `never_include.term` appears (word-boundary match) — post-generation re-check even though prompt excluded it; leak = P1                                     | regenerate; second fail → hard fail + Sentry alert |
| Length                     | per-artifact word bounds                                                                                                                                       | regenerate                                         |
| Negative-frame affirmation | reject "not/never/won't + negative" patterns                                                                                                                   | regenerate                                         |
| Sensitive-title            | `title` and share surfaces contain no sensitive-tier content tokens                                                                                            | strip/regenerate title                             |
| Date-close                 | letter ends with dynamic date line pattern                                                                                                                     | regenerate                                         |

Every check failure emits `generation_qa_flagged {rule}` (13). One corrective regeneration max (cost cap); then artifact-specific fallback: letter → in-voice retry UX; daily → cron retries before arrival, else "still forming" + replay yesterday's (product 09 §9.1).

## 6. Latency budgets (product 20-Q7)

| Artifact           | Budget (end-to-end incl. TTS)        | Masking                                                           |
| ------------------ | ------------------------------------ | ----------------------------------------------------------------- |
| Letter             | <40s p90                             | Generation ritual screen (product 08 §2); >45s → fourth line copy |
| Daily (cron)       | <20s                                 | invisible (pre-generated)                                         |
| On-demand / refine | <20s p90                             | short ritual copy                                                 |
| Affirmations       | <8s (no TTS at V1 — text-only cards) | card shimmer ≤1.5s then in-voice line                             |

## 7. Cost model & caps (product 01 §11, 15 §unit economics)

Per-user monthly worst case (premium, Sonnet-tier pricing + ElevenLabs ~$0.10/1k chars):

- 30 daily moments (~250 tokens out, ~900 chars audio) + 3 letters-equivalents (milestones) + 12 manifest/refine + 30 affirmations
- LLM: ~50k output + ~400k input tokens ≈ **<$2.00** · TTS: ~35k chars ≈ **~$3.50** (dominant cost — see 10 §7 for mitigations)
- vs $39.99/yr ≈ $3.33/mo revenue → **TTS is the margin risk**; caps are load-bearing:

| Cap               | Value                                                           | Enforced               |
| ----------------- | --------------------------------------------------------------- | ---------------------- |
| Daily moment      | 1/day, pre-gen skips >7d inactive                               | cron                   |
| Refine            | 1 per moment                                                    | lineage check (07)     |
| Manifest Anything | 3/week premium (config)                                         | `usage_credits`        |
| Regeneration      | 1 QA retry                                                      | JobsService            |
| Free tier         | daily moment + affirmation only; no on-demand/refine            | entitlement guard      |
| Prompt caching    | stable system prompt first; provider cache used where supported | PromptBuilder ordering |

## 8. Crisis path (product 18 §crisis — full spec 14 §5)

Free-text inputs (`struggle` S10, `desireText`, refine `note`, gratitude is checked async post-write) pass `CrisisDetectionService`: keyword screen → LLM classifier confirm (cheap model, yes/no). On trigger: no themed generation; endpoint returns 422 `crisis_support`; mobile shows the warm supportive copy + region resources; event logged **without content** (`generation_failed {reason: crisis}` is NOT used — separate uncounted metric to avoid stigmatizing analytics).

## 9. Prompt/QA iteration workflow

Prompts are versioned files in the repo (`generation/prompt/templates/*.ts` with `PROMPT_VERSION`); `qa_report` on each moment stores prompt version + checks passed → the generation-quality dashboard (13 §6) can attribute regressions to prompt changes. Golden tests (15 §5) pin known-good outputs' _properties_ (not exact text).
