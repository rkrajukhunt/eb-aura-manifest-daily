import { isNotificationLaunch, parseDeepLink, resolveDeepLink, type GateState } from './deepLink';

/**
 * Deep-link routing (Phase 9 test list: "deep-link routing unit tests").
 *
 * The rule these protect is 06 §5's: a notification may never skip the wow
 * funnel. A tap that dropped a half-onboarded user straight into a player would
 * spend the Letter before she ever reached it — and that is the single most
 * valuable thing the product does.
 */
describe('parseDeepLink', () => {
  it('parses a moment link', () => {
    expect(parseDeepLink('aura://moment/abc-123')).toEqual({ kind: 'moment', momentId: 'abc-123' });
  });

  it('parses a letter link', () => {
    expect(parseDeepLink('aura://letter/abc-123')).toEqual({ kind: 'letter', momentId: 'abc-123' });
  });

  it('parses the affirmation link', () => {
    expect(parseDeepLink('aura://affirmation/today')).toEqual({ kind: 'affirmation' });
  });

  it('parses the subscription link', () => {
    expect(parseDeepLink('aura://settings/subscription')).toEqual({ kind: 'subscription' });
  });

  it('parses the auth callback', () => {
    expect(parseDeepLink('aura://auth/callback#token=x')).toEqual({ kind: 'auth_callback' });
  });

  it('accepts a universal link ending the same way (06 §5)', () => {
    expect(parseDeepLink('https://aura.app/moment/abc-123')).toEqual({
      kind: 'moment',
      momentId: 'abc-123',
    });
  });

  it('ignores query strings', () => {
    expect(parseDeepLink('aura://moment/abc-123?source=push')).toMatchObject({
      momentId: 'abc-123',
    });
  });

  it.each([null, undefined, '', 'aura://', 'aura://nonsense', 'aura://moment'])(
    'resolves %p to unknown rather than throwing',
    (url) => {
      expect(parseDeepLink(url as string).kind).toBe('unknown');
    },
  );
});

describe('resolveDeepLink — the funnel always wins', () => {
  const ready: GateState = { onboardingComplete: true, hasLetter: true, letterSeen: true };

  it('opens the moment in the player', () => {
    expect(resolveDeepLink({ kind: 'moment', momentId: 'm1' }, ready)).toBe('/player?momentId=m1');
  });

  it('opens a milestone letter on the cover', () => {
    expect(resolveDeepLink({ kind: 'letter', momentId: 'm1' }, ready)).toBe('/letter?momentId=m1');
  });

  it('opens the affirmations tab', () => {
    expect(resolveDeepLink({ kind: 'affirmation' }, ready)).toBe('/(tabs)/affirmations');
  });

  it('opens the subscription screen, not a paywall', () => {
    expect(resolveDeepLink({ kind: 'subscription' }, ready)).toBe('/settings/subscription');
  });

  it('sends an unrecognised link to Home rather than nowhere', () => {
    expect(resolveDeepLink({ kind: 'unknown' }, ready)).toBe('/(tabs)/home');
  });

  describe('an incomplete onboarding outranks every content link', () => {
    const midOnboarding: GateState = {
      onboardingComplete: false,
      hasLetter: false,
      letterSeen: false,
    };

    it.each([
      { kind: 'moment', momentId: 'm1' },
      { kind: 'letter', momentId: 'm1' },
      { kind: 'affirmation' },
      { kind: 'subscription' },
    ] as const)('queues %p behind the conversation', (target) => {
      expect(resolveDeepLink(target, midOnboarding)).toBe('/(onboarding)');
    });

    it('STILL resolves the auth callback — it is how she gets into an account', () => {
      // Infrastructure, not content. Blocking this would strand anyone signing
      // in on a second device mid-onboarding.
      expect(resolveDeepLink({ kind: 'auth_callback' }, midOnboarding)).toBe('/auth/callback');
    });
  });

  describe('an unheard letter outranks a notification', () => {
    const letterWaiting: GateState = {
      onboardingComplete: true,
      hasLetter: true,
      letterSeen: false,
    };

    it('sends a moment tap to the Letter first', () => {
      expect(resolveDeepLink({ kind: 'moment', momentId: 'm1' }, letterWaiting)).toBe('/letter');
    });

    it('lets content through once she has heard it', () => {
      expect(resolveDeepLink({ kind: 'moment', momentId: 'm1' }, ready)).toContain('/player');
    });
  });
});

describe('isNotificationLaunch — open attribution (11 §5)', () => {
  it('recognises a launch carrying a notification kind', () => {
    expect(isNotificationLaunch({ kind: 'moment_arrival' })).toBe(true);
  });

  it.each([null, undefined, {}, { kind: '' }, { other: 'x' }])(
    'treats %p as an ordinary launch',
    (data) => {
      expect(isNotificationLaunch(data as Record<string, unknown>)).toBe(false);
    },
  );

  it('is what keeps auto-soften from being a one-way ratchet', () => {
    // The backend can see a send but never an open. If this returned false for
    // real opens, ignored_arrival_count would only ever climb and a busy week
    // would quiet her notifications permanently.
    expect(isNotificationLaunch({ kind: 'moment_arrival', momentId: 'm1' })).toBe(true);
  });
});
