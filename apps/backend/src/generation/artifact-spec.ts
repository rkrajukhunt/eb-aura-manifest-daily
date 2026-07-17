import type { JobArtifact } from '@aura/shared';

/**
 * Per-artifact structure + length rules (08 §3). One source of truth read by
 * both the prompt builders (to instruct the model) and the QA gate (to verify
 * the output) — if these diverged, the model would be told one thing and graded
 * against another.
 */
export interface ArtifactSpec {
  /** Inclusive word bounds (08 §3 length column). */
  minWords: number;
  maxWords: number;
  /** Verbatim-token floor for the QA gate (08 §5): letters/moments ≥3, affirmations ≥1. */
  minVerbatimTokens: number;
  /** Whether QA enforces the dynamic date-close line (letters only, 08 §5). */
  requiresDateClose: boolean;
  /** Whether the name must appear in the first sentence (letters only, 08 §5). */
  requiresNameFirst: boolean;
  /** Whether this artifact is spoken — drives TTS (affirmations are text-only, 10 §7). */
  hasAudio: boolean;
}

export const ARTIFACT_SPEC: Record<JobArtifact, ArtifactSpec> = {
  letter: {
    minWords: 140,
    maxWords: 220,
    minVerbatimTokens: 3,
    requiresDateClose: true,
    requiresNameFirst: true,
    hasAudio: true,
  },
  daily: {
    minWords: 90,
    maxWords: 180,
    minVerbatimTokens: 3,
    requiresDateClose: false,
    requiresNameFirst: false,
    hasAudio: true,
  },
  ondemand: {
    minWords: 90,
    maxWords: 180,
    minVerbatimTokens: 3,
    requiresDateClose: false,
    requiresNameFirst: false,
    hasAudio: true,
  },
  refine: {
    minWords: 90,
    maxWords: 180,
    minVerbatimTokens: 3,
    requiresDateClose: false,
    requiresNameFirst: false,
    hasAudio: true,
  },
  milestone: {
    minWords: 100,
    maxWords: 180,
    minVerbatimTokens: 3,
    requiresDateClose: false,
    requiresNameFirst: false,
    hasAudio: true,
  },
  winback: {
    minWords: 1,
    maxWords: 100,
    minVerbatimTokens: 1,
    requiresDateClose: false,
    requiresNameFirst: false,
    hasAudio: true,
  },
  // Affirmations: ≤20 words, text-only (no TTS at V1, 10 §7). Word floor is 1.
  affirmation_daily: {
    minWords: 1,
    maxWords: 20,
    minVerbatimTokens: 1,
    requiresDateClose: false,
    requiresNameFirst: false,
    hasAudio: false,
  },
  affirmation_guided: {
    minWords: 1,
    maxWords: 20,
    minVerbatimTokens: 1,
    requiresDateClose: false,
    requiresNameFirst: false,
    hasAudio: false,
  },
};

/** Word count used consistently across prompts and QA — split on whitespace. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}
