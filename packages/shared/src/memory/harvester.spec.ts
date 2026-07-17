import { harvestPhrases } from './harvester';

/**
 * These phrases get spoken back to her verbatim in a generated moment, so the
 * governing rule is: a missing phrase costs one echo, a WRONG phrase breaks the
 * product's core illusion (product 03). Tests below lean on that asymmetry —
 * precision over recall.
 */
describe('harvestPhrases', () => {
  it('returns nothing for empty or whitespace input', () => {
    expect(harvestPhrases('')).toEqual([]);
    expect(harvestPhrases('   \n  ')).toEqual([]);
  });

  describe('quoted spans (she chose to quote it)', () => {
    it('extracts straight-quoted text', () => {
      const result = harvestPhrases('She always said "you are made for more than this".');

      expect(result).toContain('you are made for more than this');
    });

    it('extracts smart-quoted text — iOS substitutes these by default', () => {
      // Only handling straight quotes would miss almost every real user.
      const result = harvestPhrases('He told me “you will find your way” once.');

      expect(result).toContain('you will find your way');
    });
  });

  describe('proper nouns', () => {
    it('extracts a multi-word place name', () => {
      expect(harvestPhrases('I want to wake up in New York someday')).toContain('New York');
    });

    it('does not treat a sentence-initial capital as a proper noun', () => {
      // "Mornings" is capitalized by grammar, not because it names anything.
      const result = harvestPhrases('Mornings are hardest for me right now.');

      expect(result).not.toContain('Mornings');
    });

    it('keeps a multi-word capitalized run even at the start of a sentence', () => {
      // Grammar explains the first word only — "San Francisco" is still a place.
      expect(harvestPhrases('San Francisco is where it started.')).toContain('San Francisco');
    });

    it('never harvests the pronoun "I"', () => {
      expect(harvestPhrases('I am tired. I keep going.')).not.toContain('I');
    });

    it('harvests short names — the Letter calls her people by name', () => {
      // Regression: a 4-char floor silently dropped "Ivy", so a user whose
      // daughter is named Ivy would never hear her name echoed back (product 08).
      expect(harvestPhrases('My daughter Ivy is the reason for all of it')).toContain('Ivy');
      expect(harvestPhrases('My brother Jo calls every Sunday')).toContain('Jo');
    });

    it('never slices a name in half', () => {
      // Regression: window scanning once produced "wake up in New" from
      // "wake up in New York someday". Echoing a name cut in half back to her is
      // the worst failure this module has — worse than harvesting nothing.
      const result = harvestPhrases('I want to wake up in New York someday');

      expect(result).toContain('New York');
      expect(result.some((p) => /\bNew$/.test(p))).toBe(false);
      expect(result.some((p) => /^York\b/.test(p))).toBe(false);
    });

    it('does not let a window swallow a proper noun into a worse phrase', () => {
      // "New York" must survive rather than lose to "New York someday".
      expect(harvestPhrases('I want to wake up in New York someday')).toContain('New York');
    });
  });

  describe('distinctive phrases', () => {
    it('keeps a phrase built from her own specific detail', () => {
      const result = harvestPhrases('I love the smell of the bakery downstairs');

      expect(result.some((p) => p.includes('bakery'))).toBe(true);
    });

    it('drops phrases made only of stopwords and common words', () => {
      // "I really want a lot of good things" is everyone's answer, not hers.
      expect(harvestPhrases('I really want a lot of good things')).toEqual([]);
    });

    it('does not let a phrase span punctuation', () => {
      // A span crossing a comma was never a thing she said as one unit.
      const result = harvestPhrases('I left Berlin, gardening keeps me sane');

      expect(result.every((p) => !p.includes(','))).toBe(true);
      expect(result.some((p) => /berlin\s+gardening/i.test(p))).toBe(false);
    });

    it('trims leading and trailing stopwords', () => {
      const result = harvestPhrases('It is the pottery studio that saved me');

      expect(result.every((p) => !/^(the|is|it|that)\s/i.test(p))).toBe(true);
      expect(result.every((p) => !/\s(the|is|it|that)$/i.test(p))).toBe(true);
    });
  });

  describe('deduplication', () => {
    it('does not return the same phrase twice', () => {
      const result = harvestPhrases('Copenhagen. I miss Copenhagen so much.');
      const lowered = result.map((p) => p.toLowerCase());

      expect(new Set(lowered).size).toBe(lowered.length);
    });

    it('keeps the longer phrase rather than storing both', () => {
      // Storing "bakery downstairs" and "the bakery downstairs" would echo both.
      const result = harvestPhrases('the bakery downstairs');
      const containsAnother = result.filter((a) =>
        result.some((b) => a !== b && b.toLowerCase().includes(a.toLowerCase())),
      );

      expect(containsAnother).toEqual([]);
    });

    it('preserves her original casing', () => {
      expect(harvestPhrases('I dream of Lisbon')).toContain('Lisbon');
    });
  });

  describe('bounds', () => {
    it('caps the number of phrases so one long answer cannot flood the table', () => {
      const long = Array.from({ length: 60 }, (_, i) => `Distinctive${i} pottery studio`).join(
        '. ',
      );

      expect(harvestPhrases(long).length).toBeLessThanOrEqual(12);
    });

    it('honours an explicit cap', () => {
      const text = 'Lisbon and Berlin and Copenhagen and Vienna and Prague';

      expect(harvestPhrases(text, { maxPhrases: 2 }).length).toBeLessThanOrEqual(2);
    });

    it('rejects fragments that are too short to be meaningful', () => {
      expect(harvestPhrases('ok')).toEqual([]);
    });

    it('does not return a whole long sentence as a phrase', () => {
      const text =
        'I want to build a quiet life near the coast where my daughter can finally breathe';

      expect(harvestPhrases(text).every((p) => p.length <= 60)).toBe(true);
    });
  });

  it('is deterministic — the same text always harvests the same phrases', () => {
    // Golden tests (15 §5) depend on this; so does not re-writing her phrase rows.
    const text = 'I miss Lisbon and "the way the light hits the tiles" in the morning';

    expect(harvestPhrases(text)).toEqual(harvestPhrases(text));
  });

  it('copies spans verbatim — never reconstructs her words', () => {
    const text = 'I dream of Lisbon';

    for (const phrase of harvestPhrases(text)) {
      expect(text.toLowerCase()).toContain(phrase.toLowerCase());
    }
  });
});
