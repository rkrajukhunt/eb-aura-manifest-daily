import { SHARE_HEIGHT, SHARE_TEMPLATES, SHARE_WIDTH, toShareContent } from './shareCard';

/**
 * Share-card privacy (product 18 rule, product 09 §9.3).
 *
 * "No user personal data beyond the affirmation text itself." A shared card
 * leaves the device and stops being ours to protect, so the rule is enforced by
 * a function with a narrow return type rather than by whoever builds the next
 * template remembering to leave fields out.
 */
describe('shareCard', () => {
  it('exports at story dimensions', () => {
    expect([SHARE_WIDTH, SHARE_HEIGHT]).toEqual([1080, 1920]);
  });

  it('offers the three documented templates', () => {
    expect([...SHARE_TEMPLATES]).toEqual(['light', 'dusk', 'plain']);
  });

  describe('toShareContent', () => {
    it('carries the affirmation', () => {
      expect(toShareContent({ affirmation: 'I am the quiet kind of brave.' })).toMatchObject({
        affirmation: 'I am the quiet kind of brave.',
      });
    });

    it('trims it', () => {
      expect(toShareContent({ affirmation: '  I am steady.  ' }).affirmation).toBe('I am steady.');
    });

    it('defaults to the light template', () => {
      expect(toShareContent({ affirmation: 'x' }).template).toBe('light');
    });

    it('honours a chosen template', () => {
      expect(toShareContent({ affirmation: 'x', template: 'dusk' }).template).toBe('dusk');
    });

    it('carries NOTHING but the affirmation and the template', () => {
      // The shape itself is the privacy rule: anything a future caller passes
      // in — a name, a city, a why-line — cannot survive this function.
      const content = toShareContent({
        affirmation: 'I am steady.',
        // @ts-expect-error deliberately passing fields the contract forbids
        name: 'Maya',
        city: 'Lisbon',
        whyLine: 'Present tense rehearses it as true.',
        struggle: 'I feel invisible at work',
      });

      expect(Object.keys(content).sort()).toEqual(['affirmation', 'template']);
      expect(JSON.stringify(content)).not.toContain('Maya');
      expect(JSON.stringify(content)).not.toContain('Lisbon');
      expect(JSON.stringify(content)).not.toContain('invisible');
    });
  });
});
