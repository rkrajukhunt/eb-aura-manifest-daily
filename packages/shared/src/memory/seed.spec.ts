import { seedMemoryFromOnboarding, type SeedProfile } from './seed';
import { STRUGGLE_WEIGHT } from './weight';

/** The Quiet Dreamer (product 02) — a realistic completed onboarding. */
const FIXTURE: SeedProfile = {
  name: 'Maya',
  self_description: 'I am someone who keeps starting over and hoping it sticks',
  dream_home: 'sunlit-loft',
  dream_city: 'I have always wanted Lisbon',
  struggle: 'I feel stuck and afraid I have left it too late',
  free_text_note: 'My daughter Ivy is the reason for all of it',
  values: ['freedom', 'family'],
};

describe('seedMemoryFromOnboarding', () => {
  it('produces the expected memory seed from a completed onboarding', () => {
    const { items } = seedMemoryFromOnboarding(FIXTURE);
    const categories = items.map((i) => i.category);

    expect(categories).toEqual(
      expect.arrayContaining(['identity', 'dream', 'struggle', 'place_lifestyle']),
    );
  });

  it('returns nothing for an empty profile rather than inventing memory', () => {
    // Silence over a wrong guess (product 10) — a fabricated item would be a lie
    // told back to her in her own Letter.
    expect(seedMemoryFromOnboarding({})).toEqual({ items: [], phrases: [] });
  });

  it('skips fields she left blank or skipped (S10 is skippable)', () => {
    const { items } = seedMemoryFromOnboarding({ name: 'Maya', struggle: null });

    expect(items.every((i) => i.category !== 'struggle')).toBe(true);
  });

  it('ignores whitespace-only answers', () => {
    expect(seedMemoryFromOnboarding({ name: '   ' }).items).toEqual([]);
  });

  describe('the struggle', () => {
    it('is always the sensitive tier', () => {
      // The tier IS the enforcement point for "never in titles, notifications,
      // shares or analytics" (09 §2). Getting this wrong leaks her worst moment.
      const struggle = seedMemoryFromOnboarding(FIXTURE).items.find(
        (i) => i.category === 'struggle',
      );

      expect(struggle?.tier).toBe('sensitive');
    });

    it('carries the reserved maximum weight', () => {
      const struggle = seedMemoryFromOnboarding(FIXTURE).items.find(
        (i) => i.category === 'struggle',
      );

      expect(struggle?.emotional_weight).toBe(STRUGGLE_WEIGHT);
    });

    it('keeps her exact words', () => {
      const struggle = seedMemoryFromOnboarding(FIXTURE).items.find(
        (i) => i.category === 'struggle',
      );

      expect(struggle?.verbatim).toBe('I feel stuck and afraid I have left it too late');
    });
  });

  describe('plain language for What Aura Knows (09 §6)', () => {
    it('renders content as a sentence, not a database row', () => {
      const { items } = seedMemoryFromOnboarding(FIXTURE);

      expect(items.map((i) => i.content)).toContain('Your name is Maya');
      expect(
        items.some((i) => i.content === 'Your dream city is I have always wanted Lisbon'),
      ).toBe(true);
    });

    it('renders the dream-home card id in human words', () => {
      const home = seedMemoryFromOnboarding(FIXTURE).items.find((i) =>
        i.content.startsWith('Your dream home'),
      );

      // "sunlit-loft" is our id; she should never see our slug.
      expect(home?.content).toBe('Your dream home is sunlit loft');
      expect(home?.content).not.toContain('-');
    });
  });

  describe('verbatim', () => {
    it('keeps her wording for free text', () => {
      const description = seedMemoryFromOnboarding(FIXTURE).items.find((i) =>
        i.content.startsWith('You described yourself'),
      );

      expect(description?.verbatim).toBe(FIXTURE.self_description);
    });

    it('stores no verbatim for a card or chip choice — those are our words', () => {
      const { items } = seedMemoryFromOnboarding(FIXTURE);
      const chipItems = items.filter(
        (i) => i.content.startsWith('You value') || i.content.startsWith('Your dream home'),
      );

      expect(chipItems.every((i) => i.verbatim === null)).toBe(true);
      expect(chipItems.length).toBeGreaterThan(0);
    });
  });

  describe('values', () => {
    it('seeds one item per value', () => {
      const { items } = seedMemoryFromOnboarding(FIXTURE);
      const values = items.filter((i) => i.content.startsWith('You value'));

      expect(values.map((i) => i.content)).toEqual(['You value freedom', 'You value family']);
    });

    it('handles a profile with no values', () => {
      expect(() => seedMemoryFromOnboarding({ name: 'Maya', values: null })).not.toThrow();
    });
  });

  describe('phrases', () => {
    it('harvests her distinctive words from free text', () => {
      const { phrases } = seedMemoryFromOnboarding(FIXTURE);
      const all = phrases.map((p) => p.phrase);

      expect(all).toContain('Lisbon');
      expect(all).toContain('Ivy');
    });

    it('never harvests from chip or card answers', () => {
      // Echoing "sunlit-loft" back at her would be our vocabulary posing as memory.
      const { phrases } = seedMemoryFromOnboarding({
        dream_home: 'sunlit-loft',
        values: ['freedom'],
      });

      expect(phrases).toEqual([]);
    });

    it('dedupes a phrase repeated across two answers', () => {
      const { phrases } = seedMemoryFromOnboarding({
        dream_city: 'I miss Lisbon',
        free_text_note: 'Lisbon is where I felt like myself',
      });
      const lisbon = phrases.filter((p) => p.phrase.toLowerCase() === 'lisbon');

      expect(lisbon).toHaveLength(1);
    });

    it('marks every seeded phrase as onboarding-sourced', () => {
      const { phrases } = seedMemoryFromOnboarding(FIXTURE);

      expect(phrases.every((p) => p.source === 'onboarding')).toBe(true);
    });
  });

  it('is deterministic — the same profile seeds the same memory', () => {
    expect(seedMemoryFromOnboarding(FIXTURE)).toEqual(seedMemoryFromOnboarding(FIXTURE));
  });

  it('never emits a temporary item without an expiry (DB check constraint)', () => {
    // The migration rejects temporary-without-expires_at; the seed must not try.
    const { items } = seedMemoryFromOnboarding(FIXTURE);

    expect(items.every((i) => i.tier !== 'temporary')).toBe(true);
  });
});
