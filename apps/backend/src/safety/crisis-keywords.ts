/**
 * Curated crisis-signal terms for the deterministic keyword screen (14 §5.1).
 *
 * WHY high recall over precision: this list is the first gate in front of a
 * duty-of-care flow (product 18 §crisis). A missed genuine crisis is far worse
 * than a false alarm — the LLM classifier confirm (14 §5.2) exists specifically
 * to filter the false positives this list will produce (idioms like "my job is
 * killing me"). So we err deliberately toward catching too much here.
 *
 * WHY versioned: the list is security-relevant content that changes over time;
 * `CRISIS_KEYWORD_VERSION` lets us trace which revision screened a given input.
 * Copy and the full term list get founder/legal review before launch — this is
 * a release gate, not a code-review nicety (14 §5.5).
 *
 * WHY English-only at V1: the spec is "multilingual-ready" (14 §5.1) but not yet
 * multilingual. Non-English self-harm/abuse lexicons need native-speaker and
 * clinical review we do not have pre-launch; shipping a half-reviewed foreign
 * list would give false confidence. The multilingual path is: add per-language
 * term files reviewed by native clinicians, keyed off the request locale, each
 * carrying its own version. Until then this screen is scoped to English input.
 */
export const CRISIS_KEYWORD_VERSION = '2026-07-18';

/**
 * Phrases and terms, all lower-case. Matching is case-insensitive and tolerant
 * of runs of whitespace between words (see crisis-detection.service.ts), so
 * multi-word entries here match natural spacing/newlines in real input.
 */
export const CRISIS_KEYWORDS: readonly string[] = [
  // --- Self-harm / suicidal ideation ---
  'kill myself',
  'killing myself',
  'end my life',
  'ending my life',
  'end it all',
  'take my own life',
  'want to die',
  'wanna die',
  'wish i was dead',
  'wish i were dead',
  'i want to be dead',
  'better off dead',
  'better off without me',
  'no reason to live',
  'nothing to live for',
  'dont want to live',
  "don't want to live",
  "can't go on",
  'cant go on',
  "can't do this anymore",
  'suicide',
  'suicidal',
  'commit suicide',
  'hurt myself',
  'harm myself',
  'hurting myself',
  'self harm',
  'self-harm',
  'cut myself',
  'cutting myself',
  'overdose',
  'kill me',
  'end the pain',
  'make it stop',
  'i give up on life',

  // --- Abuse / danger from another person ---
  'he hits me',
  'she hits me',
  'they hit me',
  'he hurts me',
  'she hurts me',
  'being abused',
  'am being abused',
  'physically abused',
  'sexually abused',
  'domestic abuse',
  'domestic violence',
  'he beats me',
  'she beats me',
  'afraid for my life',
  'afraid he will kill me',
  'threatened to kill me',
  'im not safe at home',
  "i'm not safe at home",
  'not safe at home',
  'someone is hurting me',

  // --- Acute distress / crisis state ---
  'i want it to end',
  'i cant take it anymore',
  "i can't take it anymore",
  'i cant cope',
  "i can't cope",
  'nobody would miss me',
  'no one would miss me',
  'everyone would be better off without me',
  'i have a plan to',
  'goodbye forever',
  'this is my last',
  'i cant keep going',
  "i can't keep going",
];
