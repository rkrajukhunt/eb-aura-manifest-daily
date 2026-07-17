import type { JobArtifact, QaRule } from '@aura/shared';

/**
 * The assembled memory context a prompt builder consumes (09 §4).
 *
 * This is the read-only snapshot `MemoryContextService.assemble` produces — a
 * deterministic sample of who she is, in her own words. Everything a builder
 * needs to write something that feels made for her, and nothing it shouldn't see.
 */
export interface MemoryContext {
  /** S3. First word of a letter (product 08). */
  name: string | null;
  selfDescription: string | null;
  workFeeling: string | null;
  values: string[];
  dreamHome: string | null;
  dreamCity: string | null;
  /** SENSITIVE. Injected only into letter/moment BODY context (09 §2). */
  struggle: string | null;

  /** Active people only — inactive are filtered (09 §4 anti-uncanny). */
  people: { name: string; descriptor: string | null }[];

  /** Sampled evolving items + all permanent, minus sensitive for non-body artifacts. */
  memoryItems: { content: string; verbatim: string | null; category: string; tier: string }[];

  /** Verbatim phrases, listed for literal reuse in the prompt (08 §3). */
  exactPhrases: string[];

  /** Hard exclusions — enforced at prompt build AND QA post-check (09 §6). */
  neverInclude: string[];

  /** Last 3 gratitude entries for light weaving (09 §4) — empty until Phase 8. */
  recentGratitude: string[];

  /** Recent moment titles for anti-repetition (09 §4). */
  recentTitles: string[];

  /** Cadence directives the scheduler allows this generation (09 §5). */
  directives: CadenceDirective[];

  /** For the date-close line ("You started this on a {weekday} in {month}"). */
  startedWeekday: string | null;
  startedMonth: string | null;
}

/**
 * A cadence directive is a micro-wow the scheduler has cleared for THIS
 * generation (09 §5). Guards are evaluated during assembly, so a builder never
 * has to know the cadence rules — it just honours whatever it's handed.
 */
export type CadenceDirective =
  { kind: 'remembered_detail'; item: string } | { kind: 'explicit_callback'; item: string };

/** What a QA check returns. `flaggedRules` drives the corrective regeneration note. */
export interface QaResult {
  passed: boolean;
  flaggedRules: QaRule[];
  /** Human-readable corrective instructions appended to the retry prompt (08 §5). */
  correctiveNote: string;
  /** Tokens found — persisted to `moments.qa_report` (08 §9). */
  tokensFound: string[];
}

/** The LLM's parsed output. Defensive parsing lives in the pipeline (08 §3). */
export interface GeneratedArtifact {
  title: string;
  body: string;
}

/** A guided-affirmation set (08 §3). */
export interface GeneratedAffirmationSet {
  candidates: { text: string; whyLine: string; technique: string }[];
}

/** Which model tier an artifact uses (08 §2). */
export type ModelTier = 'flagship' | 'mid' | 'mini';

export const ARTIFACT_MODEL_TIER: Record<JobArtifact, ModelTier> = {
  letter: 'flagship',
  milestone: 'flagship',
  daily: 'mid',
  ondemand: 'mid',
  refine: 'mid',
  affirmation_daily: 'mini',
  affirmation_guided: 'mini',
  winback: 'mini',
};
