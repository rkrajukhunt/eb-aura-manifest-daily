import { resolveBootRoute, type BootState } from './routeGate';

const state = (overrides: Partial<BootState> = {}): BootState => ({
  profile: { onboarding_completed_at: '2026-07-17T10:00:00Z' },
  hasLetter: false,
  letterSeen: false,
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
});
