import { BANNED_PHRASES, GUILT_VOCABULARY, NEGATIVE_FRAME_MARKERS } from '@aura/shared';

import {
  buildContext,
  PASSING_LETTER_BODY,
  PASSING_LETTER_TITLE,
} from '../__fixtures__/memory-context.fixture';
import { ARTIFACT_SPEC, countWords } from '../artifact-spec';
import { QaService } from './qa.service';

/**
 * The QA gate suite (15 §2.1) — "these tests ARE the product's quality bar".
 *
 * Every rule gets both directions: a passing artifact that the rule must let
 * through, and a minimally-broken one it must catch. Each fail case mutates the
 * canonical passing letter by exactly one property, so a red test names the rule
 * that regressed rather than a fixture accident.
 */
describe('QaService', () => {
  const qa = new QaService();

  /** The canonical passing letter — every test's starting point. */
  const letter = (body = PASSING_LETTER_BODY, title = PASSING_LETTER_TITLE) => ({ title, body });

  /** Builds a body of exactly `words` words that still carries the verbatim tokens. */
  const bodyOfLength = (words: number): string => {
    const lead = 'Maya walks through Lisbon with Nadia beside her';
    const padding = Array.from({ length: Math.max(0, words - countWords(lead)) }, () => 'light');
    return [lead, ...padding].join(' ');
  };

  describe('the baseline fixture', () => {
    it('passes every rule — the guard that keeps the other tests honest', () => {
      const result = qa.check('letter', letter(), buildContext());

      expect(result.flaggedRules).toEqual([]);
      expect(result.passed).toBe(true);
    });

    it('reports the verbatim tokens it found, for the qa_report (08 §9)', () => {
      const result = qa.check('letter', letter(), buildContext());

      expect(result.tokensFound).toEqual(
        expect.arrayContaining(['Maya', 'Lisbon', 'Nadia', 'the quiet kind of brave']),
      );
    });
  });

  describe('rule 1 — verbatim_tokens', () => {
    it('fails when the body quotes fewer of her words than the artifact floor', () => {
      // Only "Maya" survives — one token against the letter's floor of three.
      const body = PASSING_LETTER_BODY.replace(/Lisbon/g, 'the city')
        .replace(/Nadia/g, 'your sister')
        .replace(/the quiet kind of brave/g, 'courage')
        .replace(/a kitchen with morning light/g, 'a bright room');

      const result = qa.check('letter', letter(body), buildContext());

      expect(result.flaggedRules).toContain('verbatim_tokens');
    });

    it('matches her words case-insensitively', () => {
      const context = buildContext({ name: 'Maya', dreamCity: 'LISBON', exactPhrases: [] });
      const result = qa.check('letter', letter(), context);

      expect(result.tokensFound).toContain('LISBON');
    });

    it('does not let a repeated token inflate the count past the floor', () => {
      // Same phrase listed three times must still count once, leaving the letter
      // (floor 3) short with only name + that phrase available.
      const context = buildContext({
        dreamCity: null,
        people: [],
        exactPhrases: [
          'the quiet kind of brave',
          'the quiet kind of brave',
          'THE QUIET KIND OF BRAVE',
        ],
      });

      const result = qa.check('letter', letter(), context);

      expect(result.tokensFound).toHaveLength(2);
      expect(result.flaggedRules).toContain('verbatim_tokens');
    });

    it('ignores empty and whitespace-only tokens', () => {
      const context = buildContext({ exactPhrases: ['', '   ', 'the quiet kind of brave'] });
      const result = qa.check('letter', letter(), context);

      expect(result.tokensFound).not.toContain('');
      expect(result.tokensFound).not.toContain('   ');
    });

    it('counts the title as not-her-words — only the body can satisfy the floor', () => {
      const context = buildContext({ dreamCity: null, people: [], exactPhrases: [] });
      const result = qa.check('letter', letter(bodyOfLength(160), 'Maya Lisbon Nadia'), context);

      expect(result.flaggedRules).toContain('verbatim_tokens');
    });

    it('holds affirmations to a floor of one, not three', () => {
      expect(ARTIFACT_SPEC.affirmation_daily.minVerbatimTokens).toBe(1);

      const result = qa.check(
        'affirmation_daily',
        { title: 'Steady', body: 'I am the quiet kind of brave.' },
        buildContext(),
      );

      expect(result.flaggedRules).not.toContain('verbatim_tokens');
    });
  });

  describe('rule 2 — name_first', () => {
    it('passes when her name opens the first sentence', () => {
      expect(qa.check('letter', letter(), buildContext()).flaggedRules).not.toContain('name_first');
    });

    it('fails when her name appears only later in the letter', () => {
      const body = PASSING_LETTER_BODY.replace('Maya, it is morning', 'It is morning');
      const result = qa.check('letter', letter(`${body} Maya.`), buildContext());

      expect(result.flaggedRules).toContain('name_first');
    });

    it('fails closed when she has no name — an anonymous letter is not a letter', () => {
      const result = qa.check('letter', letter(), buildContext({ name: null }));

      expect(result.flaggedRules).toContain('name_first');
    });

    it('is not applied to artifacts that do not require it', () => {
      expect(ARTIFACT_SPEC.daily.requiresNameFirst).toBe(false);

      const result = qa.check('daily', letter(bodyOfLength(120)), buildContext());

      expect(result.flaggedRules).not.toContain('name_first');
    });
  });

  describe('rule 3 — banned_phrases', () => {
    it.each(BANNED_PHRASES)('catches the banned phrase %p in the body', (phrase) => {
      const result = qa.check('letter', letter(`${PASSING_LETTER_BODY} ${phrase}`), buildContext());

      expect(result.flaggedRules).toContain('banned_phrases');
      expect(result.correctiveNote).toContain(phrase);
    });

    it.each(GUILT_VOCABULARY)('catches the guilt term %p in the body', (term) => {
      const result = qa.check('letter', letter(`${PASSING_LETTER_BODY} ${term}`), buildContext());

      expect(result.flaggedRules).toContain('banned_phrases');
    });

    it('scans the title too — it rides the notification and share surfaces', () => {
      const result = qa.check(
        'letter',
        letter(PASSING_LETTER_BODY, 'You Got This'),
        buildContext(),
      );

      expect(result.flaggedRules).toContain('banned_phrases');
    });

    it('matches case-insensitively', () => {
      const result = qa.check(
        'letter',
        letter(`${PASSING_LETTER_BODY} UNLOCK YOUR POTENTIAL`),
        buildContext(),
      );

      expect(result.flaggedRules).toContain('banned_phrases');
    });
  });

  describe('rule 4 — never_include', () => {
    it('catches a never-include term in the body', () => {
      const result = qa.check(
        'letter',
        letter(`${PASSING_LETTER_BODY} Daniel called.`),
        buildContext(),
      );

      expect(result.flaggedRules).toContain('never_include');
    });

    it('catches it in the title as well', () => {
      const result = qa.check('letter', letter(PASSING_LETTER_BODY, 'Daniel'), buildContext());

      expect(result.flaggedRules).toContain('never_include');
    });

    it('matches on word boundaries — "cat" must not trip on "category"', () => {
      const context = buildContext({ neverInclude: ['cat'] });
      const result = qa.check(
        'letter',
        letter(`${PASSING_LETTER_BODY} You sorted them by category.`),
        context,
      );

      expect(result.flaggedRules).not.toContain('never_include');
    });

    it('still catches the whole word when it stands alone', () => {
      const context = buildContext({ neverInclude: ['cat'] });
      const result = qa.check('letter', letter(`${PASSING_LETTER_BODY} The cat sleeps.`), context);

      expect(result.flaggedRules).toContain('never_include');
    });

    it('treats a user-authored term literally — regex metacharacters are escaped', () => {
      // An unescaped "." would match any character and flag every letter.
      const context = buildContext({ neverInclude: ['a.b'] });
      const result = qa.check('letter', letter(), context);

      expect(result.flaggedRules).not.toContain('never_include');
    });

    it('matches an escaped term when it genuinely appears', () => {
      const context = buildContext({ neverInclude: ['a.b'] });
      const result = qa.check('letter', letter(`${PASSING_LETTER_BODY} a.b`), context);

      expect(result.flaggedRules).toContain('never_include');
    });

    it('ignores empty terms rather than matching everything', () => {
      const context = buildContext({ neverInclude: ['', '   '] });
      const result = qa.check('letter', letter(), context);

      expect(result.flaggedRules).not.toContain('never_include');
    });

    it('is case-insensitive', () => {
      const result = qa.check(
        'letter',
        letter(`${PASSING_LETTER_BODY} DANIEL called.`),
        buildContext(),
      );

      expect(result.flaggedRules).toContain('never_include');
    });
  });

  describe('rule 5 — length', () => {
    const context = buildContext();

    it('accepts a body exactly at the lower bound', () => {
      const result = qa.check('daily', letter(bodyOfLength(ARTIFACT_SPEC.daily.minWords)), context);

      expect(result.flaggedRules).not.toContain('length');
    });

    it('accepts a body exactly at the upper bound', () => {
      const result = qa.check('daily', letter(bodyOfLength(ARTIFACT_SPEC.daily.maxWords)), context);

      expect(result.flaggedRules).not.toContain('length');
    });

    it('rejects one word under the lower bound', () => {
      const result = qa.check(
        'daily',
        letter(bodyOfLength(ARTIFACT_SPEC.daily.minWords - 1)),
        context,
      );

      expect(result.flaggedRules).toContain('length');
    });

    it('rejects one word over the upper bound', () => {
      const result = qa.check(
        'daily',
        letter(bodyOfLength(ARTIFACT_SPEC.daily.maxWords + 1)),
        context,
      );

      expect(result.flaggedRules).toContain('length');
    });

    it('holds affirmations to their much tighter ceiling', () => {
      const result = qa.check(
        'affirmation_daily',
        { title: 'Steady', body: bodyOfLength(ARTIFACT_SPEC.affirmation_daily.maxWords + 1) },
        context,
      );

      expect(result.flaggedRules).toContain('length');
    });
  });

  describe('rule 6 — negative_frame', () => {
    it.each(NEGATIVE_FRAME_MARKERS)('flags the negative marker %p in an affirmation', (marker) => {
      const result = qa.check(
        'affirmation_daily',
        { title: 'Steady', body: `I am ${marker}afraid, the quiet kind of brave.` },
        buildContext(),
      );

      expect(result.flaggedRules).toContain('negative_frame');
    });

    it('passes a positive present-tense affirmation', () => {
      const result = qa.check(
        'affirmation_daily',
        { title: 'Steady', body: 'I am the quiet kind of brave.' },
        buildContext(),
      );

      expect(result.flaggedRules).not.toContain('negative_frame');
    });

    it('applies to guided affirmations too', () => {
      const result = qa.check(
        'affirmation_guided',
        { title: 'Steady', body: 'I will never be small again.' },
        buildContext(),
      );

      expect(result.flaggedRules).toContain('negative_frame');
    });

    it('does NOT apply to letters — prose may name a struggle gently', () => {
      // The baseline letter contains "did not end"; that is deliberate craft.
      expect(PASSING_LETTER_BODY).toContain('not ');

      const result = qa.check('letter', letter(), buildContext());

      expect(result.flaggedRules).not.toContain('negative_frame');
    });
  });

  describe('rule 7 — sensitive_title', () => {
    it('flags a struggle word that leaked into the title', () => {
      const result = qa.check(
        'letter',
        letter(PASSING_LETTER_BODY, 'On Feeling Invisible'),
        buildContext(),
      );

      expect(result.flaggedRules).toContain('sensitive_title');
    });

    it('allows the struggle to appear in the body — that is where it belongs', () => {
      const context = buildContext({ struggle: 'the office made you feel small' });
      const result = qa.check('letter', letter(), context);

      expect(result.flaggedRules).not.toContain('sensitive_title');
    });

    it('ignores short common words shared with a benign title', () => {
      // "at" and "I" are ≤3 chars, so a title may contain them without flagging.
      const context = buildContext({ struggle: 'I am at sea' });
      const result = qa.check('letter', letter(PASSING_LETTER_BODY, 'At Sea, I Wait'), context);

      expect(result.flaggedRules).not.toContain('sensitive_title');
    });

    it('is skipped entirely when she named no struggle', () => {
      const result = qa.check(
        'letter',
        letter(PASSING_LETTER_BODY, 'Invisible Work Feelings'),
        buildContext({ struggle: null }),
      );

      expect(result.flaggedRules).not.toContain('sensitive_title');
    });
  });

  describe('rule 8 — date_close', () => {
    it("accepts product 08's canonical close, where the date line is third-from-last", () => {
      expect(PASSING_LETTER_BODY).toContain('on a Friday in July. I remember. Keep going.');

      const result = qa.check('letter', letter(), buildContext());

      expect(result.flaggedRules).not.toContain('date_close');
    });

    it('fails when the closing region names no weekday', () => {
      const body = PASSING_LETTER_BODY.replace('on a Friday in July', 'in July');
      const result = qa.check('letter', letter(body), buildContext());

      expect(result.flaggedRules).toContain('date_close');
    });

    it('fails when the closing region names no month', () => {
      const body = PASSING_LETTER_BODY.replace('on a Friday in July', 'on a Friday');
      const result = qa.check('letter', letter(body), buildContext());

      expect(result.flaggedRules).toContain('date_close');
    });

    it('fails when the date line drifts out of the closing region', () => {
      // Same words, but now buried well before the last three sentences.
      const body = PASSING_LETTER_BODY.replace(
        'You started this on a Friday in July. I remember. Keep going.',
        'I remember. Keep going. You are here. You are steady. You are home.',
      );

      const result = qa.check('letter', letter(body), buildContext());

      expect(result.flaggedRules).toContain('date_close');
    });

    it('is not applied to artifacts that do not close with a date', () => {
      expect(ARTIFACT_SPEC.daily.requiresDateClose).toBe(false);

      const result = qa.check('daily', letter(bodyOfLength(120)), buildContext());

      expect(result.flaggedRules).not.toContain('date_close');
    });
  });

  describe('the result contract', () => {
    it('collects every broken rule at once, not just the first', () => {
      const result = qa.check(
        'letter',
        { title: 'Daniel', body: 'You got this.' },
        buildContext({ name: null }),
      );

      expect(result.passed).toBe(false);
      expect(result.flaggedRules).toEqual(
        expect.arrayContaining([
          'verbatim_tokens',
          'name_first',
          'banned_phrases',
          'never_include',
          'length',
          'date_close',
        ]),
      );
    });

    it('joins a corrective note the retry prompt can act on (08 §5)', () => {
      const result = qa.check('letter', letter(PASSING_LETTER_BODY, 'Daniel'), buildContext());

      expect(result.correctiveNote).toContain('Never mention');
      expect(result.correctiveNote.trim()).not.toBe('');
    });

    it('is pure — the same input yields the same verdict', () => {
      const context = buildContext();

      expect(qa.check('letter', letter(), context)).toEqual(qa.check('letter', letter(), context));
    });
  });
});
