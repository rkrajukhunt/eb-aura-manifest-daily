import { resolveBootRoute, type BootState } from './routeGate';

const state = (overrides: Partial<BootState> = {}): BootState => ({
  profile: { onboarding_completed_at: '2026-07-17T10:00:00Z' },
  hasLetter: false,
  letterSeen: false,
  paywallSeen: true,
  ...overrides,
});

describe('resolveBootRoute', () => {
  it('sends a user who has not finished onboarding to the conversation', () => {
    expect(resolveBootRoute(state({ profile: { onboarding_completed_at: null } }))).toBe(
      '/(onboarding)',
    );
  });

  it('treats an empty-string timestamp as not completed', () => {
    // Defensive: a falsy-but-present value must not skip onboarding, which would
    // drop her into an empty Home with no Letter — the worst possible first run.
    expect(resolveBootRoute(state({ profile: { onboarding_completed_at: '' } }))).toBe(
      '/(onboarding)',
    );
  });

  it('sends a user with no letter yet to Home', () => {
    expect(resolveBootRoute(state({ hasLetter: false }))).toBe('/(tabs)/home');
  });

  describe('the letter gate (06 §3)', () => {
    it('sends her to the Letter when one is waiting and unheard', () => {
      expect(resolveBootRoute(state({ hasLetter: true, letterSeen: false }))).toBe('/letter');
    });

    it('sends her to Home once she has heard it', () => {
      expect(resolveBootRoute(state({ hasLetter: true, letterSeen: true }))).toBe('/(tabs)/home');
    });

    it('never lets a waiting letter skip an unfinished onboarding', () => {
      // A cold start with a letter must not jump the funnel (06 §5).
      expect(
        resolveBootRoute(
          state({ profile: { onboarding_completed_at: null }, hasLetter: true, letterSeen: false }),
        ),
      ).toBe('/(onboarding)');
    });

    it('does not route to the Letter when none exists, however the flag reads', () => {
      expect(resolveBootRoute(state({ hasLetter: false, letterSeen: false }))).toBe('/(tabs)/home');
    });
  });

  describe('the paywall gate (12 §3)', () => {
    const heardTheLetter = { hasLetter: true, letterSeen: true };

    it('presents the paywall once she has heard the letter', () => {
      expect(resolveBootRoute(state({ ...heardTheLetter, paywallSeen: false }))).toBe('/paywall');
    });

    it('never presents it a second time — no quieter second offer (product 01 §10)', () => {
      expect(resolveBootRoute(state({ ...heardTheLetter, paywallSeen: true }))).toBe(
        '/(tabs)/home',
      );
    });

    it('never shows the paywall BEFORE the letter — the wow is spent first', () => {
      // Product 08's central monetization decision: the letter converts, so it
      // must land before the ask. This ordering is the decision, in code.
      expect(
        resolveBootRoute(state({ hasLetter: true, letterSeen: false, paywallSeen: false })),
      ).toBe('/letter');
    });

    it('never shows the paywall during onboarding (checklist #4)', () => {
      // S10 is a vulnerable disclosure; a paywall anywhere near it is banned.
      expect(
        resolveBootRoute(
          state({
            profile: { onboarding_completed_at: null },
            hasLetter: true,
            letterSeen: false,
            paywallSeen: false,
          }),
        ),
      ).toBe('/(onboarding)');
    });

    it('does not present it to someone who has no letter yet', () => {
      expect(resolveBootRoute(state({ hasLetter: false, paywallSeen: false }))).toBe(
        '/(tabs)/home',
      );
    });
  });
});
