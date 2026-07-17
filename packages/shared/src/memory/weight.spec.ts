import { emotionalWeight, MAX_WEIGHT, MIN_WEIGHT, STRUGGLE_WEIGHT } from './weight';

describe('emotionalWeight', () => {
  it('gives a plain chip answer the base weight', () => {
    expect(emotionalWeight({ text: 'freedom', userAuthored: false })).toBe(2);
  });

  it('adds weight for user-authored free text over a chip choice', () => {
    // Her own words outrank our vocabulary (product 01).
    const chip = emotionalWeight({ text: 'gardening', userAuthored: false });
    const typed = emotionalWeight({ text: 'gardening', userAuthored: true });

    expect(typed).toBeGreaterThan(chip);
  });

  it('adds weight when the text carries an emotion word', () => {
    const neutral = emotionalWeight({ text: 'I walk the dog', userAuthored: true });
    const emotional = emotionalWeight({ text: 'I feel so lonely', userAuthored: true });

    expect(emotional).toBeGreaterThan(neutral);
  });

  it('reserves the maximum for the onboarding struggle', () => {
    expect(emotionalWeight({ text: 'anything', userAuthored: true, isStruggle: true })).toBe(
      STRUGGLE_WEIGHT,
    );
  });

  it('lets the struggle outrank everything else', () => {
    const loudest = emotionalWeight({ text: 'I feel terrified and alone', userAuthored: true });
    const struggle = emotionalWeight({ text: 'calm words', userAuthored: true, isStruggle: true });

    expect(struggle).toBeGreaterThanOrEqual(loudest);
  });

  it('always stays inside the 1–5 range the DB constraint allows', () => {
    const cases = [
      { text: 'I feel terrified, ashamed, hopeless and trapped', userAuthored: true },
      { text: '', userAuthored: false },
      { text: 'x', userAuthored: false },
    ];

    for (const input of cases) {
      const weight = emotionalWeight(input);
      expect(weight).toBeGreaterThanOrEqual(MIN_WEIGHT);
      expect(weight).toBeLessThanOrEqual(MAX_WEIGHT);
    }
  });
});
