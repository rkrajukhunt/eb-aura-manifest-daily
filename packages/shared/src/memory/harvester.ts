import { isDistinctive } from './stopwords';

/**
 * Phrase harvester (09 §1) — deterministic, no NLP service, no LLM.
 *
 * These phrases get replayed to her verbatim inside generated moments. That sets
 * the bar: a wrong phrase is worse than a missing one. Echoing back something she
 * never said, or something mangled, breaks the exact illusion the product sells
 * (product 03 — personalization feels real only when it's verbatim). So every
 * rule here is conservative and every span is copied from the source, never
 * reconstructed.
 *
 * Three strategies (09 §1):
 *   1. Quoted spans — she chose to quote it, so it matters.
 *   2. Capitalized proper nouns — names, cities, places.
 *   3. 2–4 word phrases containing a distinctive word.
 *
 * Upgrade path (V1.1, flagged not built): LLM-assisted extraction.
 */

export interface HarvestOptions {
  /** Hard cap so one long answer can't flood the phrase table. */
  maxPhrases?: number;
}

const DEFAULT_MAX_PHRASES = 12;

/** Below this, a multi-word "phrase" is a fragment; above it, it's a sentence. */
const MIN_PHRASE_CHARS = 4;
const MAX_PHRASE_CHARS = 60;

/**
 * Proper nouns get their own floor: real names are often short ("Ivy", "Jo",
 * "Bo"), and a name is the single most valuable thing this module can find —
 * the Letter calls her people BY NAME (product 08). The general 4-char minimum
 * exists to reject fragments like "ok"; applying it to names would silently drop
 * the daughter of every user named Ivy.
 */
const MIN_PROPER_NOUN_CHARS = 2;

/**
 * Sentence-initial capitals are grammar, not proper nouns. Without this, every
 * sentence's first word would be harvested as a name.
 */
const SENTENCE_BOUNDARY = /(^|[.!?]\s+|\n)\s*$/;

export function harvestPhrases(text: string, options: HarvestOptions = {}): string[] {
  const maxPhrases = options.maxPhrases ?? DEFAULT_MAX_PHRASES;
  if (!text || text.trim() === '') return [];

  // Quoted spans and proper nouns are the highest-precision signals, so they are
  // taken first and then MASKED OUT of the text before the fuzzier window scan.
  //
  // Masking is what stops a window cutting through a name — without it,
  // "wake up in New York someday" yields "wake up in New", and echoing a name
  // sliced in half is precisely the failure that destroys the illusion.
  const quoted = extractQuoted(text);
  const properNouns = extractProperNouns(text);

  const remaining = maskSpans(text, [...quoted, ...properNouns]);

  // Order matters downstream: high-precision phrases lead the prompt's list.
  const found = [...quoted, ...properNouns, ...extractDistinctivePhrases(remaining)];

  return dedupe(found).slice(0, maxPhrases);
}

/**
 * Blanks out already-harvested spans, replacing them with a clause boundary so
 * the window scan cannot span the gap either.
 */
function maskSpans(text: string, spans: string[]): string {
  let masked = text;

  // Longest first: masking "New" before "New York" would strand "York".
  for (const span of [...spans].sort((a, b) => b.length - a.length)) {
    masked = masked.split(span).join('.');
  }

  return masked;
}

/**
 * 1. Quoted spans. Straight and smart quotes both — iOS substitutes smart quotes
 *    by default, so only handling `"` would miss almost every real user.
 */
function extractQuoted(text: string): string[] {
  const results: string[] = [];
  const patterns = [/"([^"]+)"/g, /“([^”]+)”/g, /'([^']{4,})'/g];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const inner = match[1]?.trim();
      if (inner && isReasonableLength(inner)) results.push(inner);
    }
  }

  return results;
}

/**
 * 2. Capitalized proper nouns, including multi-word ones ("New York").
 *    Skips sentence-initial words, which are capitalized by grammar alone.
 */
function extractProperNouns(text: string): string[] {
  const results: string[] = [];
  const pattern = /\p{Lu}[\p{L}'-]*(?:\s+\p{Lu}[\p{L}'-]*)*/gu;

  for (const match of text.matchAll(pattern)) {
    const value = match[0]?.trim();
    if (!value || match.index === undefined) continue;

    const isSentenceStart = SENTENCE_BOUNDARY.test(text.slice(0, match.index));
    // A multi-word capitalized run ("New York") is a proper noun even at the
    // start of a sentence — grammar only explains the first word.
    const isMultiWord = /\s/.test(value);
    if (isSentenceStart && !isMultiWord) continue;

    // "I" is capitalized by convention, not because it names anything.
    if (value === 'I') continue;
    if (value.length < MIN_PROPER_NOUN_CHARS || value.length > MAX_PHRASE_CHARS) continue;

    results.push(value);
  }

  return results;
}

/**
 * 3. 2–4 word windows containing at least one distinctive word.
 *    Trailing/leading stopwords are trimmed so we keep "the bakery downstairs"
 *    rather than "of the bakery".
 */
function extractDistinctivePhrases(text: string): string[] {
  const results: string[] = [];

  for (const clause of splitClauses(text)) {
    const words = clause.split(/\s+/).filter(Boolean);

    for (let size = 4; size >= 2; size--) {
      for (let start = 0; start + size <= words.length; start++) {
        const window = words.slice(start, start + size);
        if (!window.some((word) => isDistinctive(word))) continue;

        const phrase = trimEdges(window).join(' ');
        if (isReasonableLength(phrase) && phrase.split(/\s+/).length >= 2) {
          results.push(phrase);
        }
      }
    }
  }

  return results;
}

/** Phrases never span punctuation — a phrase that crosses a comma isn't hers. */
function splitClauses(text: string): string[] {
  return text
    .split(/[.!?,;:\n]+/)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

/** Drops leading/trailing non-distinctive words and punctuation. */
function trimEdges(words: string[]): string[] {
  const result = [...words];

  while (result.length > 0 && !isDistinctive(result[0] as string)) result.shift();
  while (result.length > 0 && !isDistinctive(result[result.length - 1] as string)) result.pop();

  return result.map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}']+$/gu, ''));
}

function isReasonableLength(value: string): boolean {
  return value.length >= MIN_PHRASE_CHARS && value.length <= MAX_PHRASE_CHARS;
}

/**
 * Case-insensitive dedupe that keeps the FIRST occurrence — her original casing.
 * Also drops phrases fully contained in a longer one already kept, so we don't
 * store "the bakery" alongside "the bakery downstairs" and then echo both.
 */
function dedupe(phrases: string[]): string[] {
  const kept: string[] = [];
  const seen = new Set<string>();

  // Longest first so the fuller phrase wins the containment check.
  const ordered = [...phrases].sort((a, b) => b.length - a.length);

  for (const phrase of ordered) {
    const key = phrase.toLowerCase();
    if (seen.has(key)) continue;
    if (kept.some((existing) => existing.toLowerCase().includes(key))) continue;

    seen.add(key);
    kept.push(phrase);
  }

  // Restore source order: the prompt reads better when phrases arrive as she said them.
  return kept.sort((a, b) => phrases.indexOf(a) - phrases.indexOf(b));
}
