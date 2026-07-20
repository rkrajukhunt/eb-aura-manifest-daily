import { Injectable } from '@nestjs/common';

import { NEGATIVE_FRAME_MARKERS } from '@aura/shared';

import type {
  LlmGenerateRequest,
  LlmGenerateResponse,
  LlmProvider,
} from './llm-provider.interface';

/**
 * Dev/CI adapter (08 §1). No network, no spend — every local run and every test
 * uses this.
 *
 * It must produce output the QA gate ACCEPTS, or the pipeline can never reach a
 * `ready` moment locally and the whole generation flow is untestable (04 §6).
 * So when JSON is requested it harvests the tokens the prompt embedded — name,
 * city, a person, an exact phrase — and echoes them back inside a plausible
 * body, plus the date-close line for letters. This is deliberately shaped to
 * satisfy the deterministic checks in 08 §5; it makes no attempt to be good prose.
 */
@Injectable()
export class MockLlmProvider implements LlmProvider {
  async generate(req: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    const text = req.json ? this.buildJson(req.prompt) : this.buildPlain(req.system, req.prompt);
    return {
      text,
      usage: {
        inputTokens: countWords(req.system) + countWords(req.prompt),
        outputTokens: countWords(text),
      },
    };
  }

  async ping(): Promise<boolean> {
    return true;
  }

  /**
   * Non-JSON path. The only non-JSON caller is the crisis classifier (14 §5),
   * whose system prompt asks for a yes/no. A mock that always said "no" would
   * make the crisis path impossible to exercise locally, so it answers "yes" for
   * an unmistakable crisis phrase and "no" otherwise — enough to drive both branches.
   */
  private buildPlain(system: string, prompt: string): string {
    if (/safety classifier/i.test(system)) {
      return /\b(kill myself|end it all|want to die|better off dead)\b/i.test(prompt)
        ? 'yes'
        : 'no';
    }
    return `[mock-llm] ${prompt.slice(0, 80)}`;
  }

  /**
   * Reconstructs QA-passing content from the prompt's context block, whose shape
   * is controlled by `renderContextBlock`. The classifier prompt (crisis) also
   * requests no JSON, so it never reaches here — this only runs for artifacts.
   */
  private buildJson(prompt: string): string {
    // The crisis classifier is a yes/no prompt, not JSON — but if some caller
    // sends json:true for a yes/no, still return valid JSON.
    if (/genuine crisis/i.test(prompt)) {
      return JSON.stringify({ answer: 'no' });
    }

    // Guided affirmations expect a candidates array (08 §3). Anchor on one of her
    // EXACT PHRASES, not a value: values are preset chips, so the QA gate does not
    // count them as verbatim tokens (see PROMPT_VERSION 2026-07-20.1).
    if (/"candidates"/i.test(prompt)) {
      const anchor = usableAnchor(prompt) ?? firstValue(prompt) ?? 'freedom';
      return JSON.stringify({
        candidates: [1, 2, 3].map((n) => ({
          text: `I am someone who chooses ${anchor} (${n}).`,
          whyLine: 'Identity-form affirmations rehearse who you are becoming.',
          technique: 'identity',
        })),
      });
    }

    const name = extract(prompt, /Her name:\s*(.+)/);
    const city = extract(prompt, /Her dream city:\s*(.+)/);
    const person = extract(prompt, /Her people, by name:\s*([^,(\n]+)/);
    // Read the exact-phrases block specifically rather than the first quoted span
    // anywhere: the context block also quotes her struggle (earlier) and her
    // never-include terms (later), and echoing either back would be a QA failure.
    const phrase = firstExactPhrase(prompt) ?? firstQuoted(prompt);
    const isLetter = /letter from her future self/i.test(prompt);
    const isAffirmation = /one affirmation for today/i.test(prompt);

    if (isAffirmation) {
      return JSON.stringify({
        title: 'Becoming',
        body: affirmationBody(prompt, name, city),
        whyLine: 'Present-tense identity framing keeps the goal in working memory.',
      });
    }

    // Assemble a body that carries ≥3 verbatim tokens (name, city, person,
    // phrase) so the verbatim-tokens and name-first checks pass (08 §5).
    const opener = name
      ? `${name}, I have to tell you about this morning.`
      : 'Let me tell you about this morning.';
    const sentences = [
      opener,
      city
        ? `The light in ${city} is exactly how you imagined it.`
        : 'The light is exactly how you imagined it.',
      person ? `${person.trim()} is here, and it feels safe.` : 'It feels safe here.',
      phrase
        ? `You were ${phrase} — and look where it brought you.`
        : 'You kept going, and look where it brought you.',
      'You did this, slowly and on purpose.',
    ];

    // Pad to clear the min-word floor BEFORE the close, so the date-close line
    // stays in the tail the QA gate reads (08 §5).
    //
    // The target is derived from the range the PROMPT states, not hardcoded: the
    // artifacts have very different bounds (letter 140–220, winback 1–100), and a
    // fixed floor overshoots the tight ones — a 95-word pad made every winback 103
    // words and thus permanently un-passable against its 100-word ceiling.
    const { min, max } = statedWordRange(prompt);
    const target = Math.max(min, Math.min(max - 10, min + 20));

    let body = sentences.join(' ');
    while (countWords(body) < target) {
      body += ' The days are softer now, and you move through them like someone who belongs.';
    }

    if (isLetter) {
      const weekday =
        extract(prompt, /Friday|Monday|Tuesday|Wednesday|Thursday|Saturday|Sunday/) ?? 'Friday';
      body += ` You started this on a ${weekday} in July. I remember. Keep going.`;
    }

    return JSON.stringify({ title: 'The morning it changed', body });
  }
}

function extract(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? (m[1] ?? m[0]).trim() : null;
}

/**
 * Every phrase from the exact-words block, which `renderContextBlock` emits as a
 * `- "phrase"` list under the LITERALLY instruction. Targeted so the mock can
 * never mistake her struggle or an excluded term for something to quote back.
 */
function exactPhrases(text: string): string[] {
  const block = text.match(/LITERALLY[^\n]*\n((?:- "[^"]+"\n?)+)/);
  if (!block?.[1]) return [];
  return [...block[1].matchAll(/- "([^"]+)"/g)].map((m) => m[1] ?? '').filter(Boolean);
}

function firstExactPhrase(text: string): string | null {
  return exactPhrases(text)[0] ?? null;
}

/**
 * Not every phrase of hers can carry an affirmation. Her own words may be
 * negatively framed ("proof, not vibes") or far longer than the 20-word ceiling,
 * and the QA gate rejects both (08 §5, 14 §35). A real model resolves this by
 * reaching for a different anchor; the mock does the same rather than emitting
 * something it knows the gate will refuse.
 */
function usableAnchor(text: string): string | null {
  return (
    exactPhrases(text).find(
      (phrase) =>
        countWords(phrase) <= 8 &&
        !NEGATIVE_FRAME_MARKERS.some((m) => phrase.toLowerCase().includes(m)),
    ) ?? null
  );
}

/**
 * A ≤20-word, positively framed affirmation carrying at least one verbatim token
 * (08 §5 floor of 1). Prefers one of her phrases; falls back to her city or name,
 * which are equally her words and always short.
 */
function affirmationBody(prompt: string, name: string | null, city: string | null): string {
  const anchor = usableAnchor(prompt);
  if (anchor) return `I am building ${anchor}, one quiet morning at a time.`;
  if (city) return `I am already on my way to ${city}.`;
  if (name) return `${name} is becoming someone she trusts.`;
  return 'I am steady today.';
}

/** First double-quoted span in the prompt — the context block lists phrases this way. */
function firstQuoted(text: string): string | null {
  const m = text.match(/"([^"]{3,})"/);
  return m ? (m[1] ?? null) : null;
}

/**
 * The word range the prompt asked for, written by the builders as "140–220 words"
 * (en dash). Falls back to the daily bounds if a builder ever omits it.
 */
function statedWordRange(text: string): { min: number; max: number } {
  const m = text.match(/(\d+)[–-](\d+) words/);
  const min = m ? Number(m[1]) : 90;
  const max = m ? Number(m[2]) : 180;
  return Number.isFinite(min) && Number.isFinite(max) && min < max
    ? { min, max }
    : { min: 90, max: 180 };
}

/** First item after "What she values:" (comma-separated). */
function firstValue(text: string): string | null {
  const m = text.match(/What she values:\s*([^,\n]+)/);
  return m ? (m[1]?.trim() ?? null) : null;
}

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}
