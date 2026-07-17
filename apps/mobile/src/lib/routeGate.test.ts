import { resolveBootRoute } from './routeGate';

describe('resolveBootRoute', () => {
  it('sends a user who has not finished onboarding to the conversation', () => {
    expect(resolveBootRoute({ onboarding_completed_at: null })).toBe('/(onboarding)');
  });

  it('sends a user who finished onboarding to Home', () => {
    expect(resolveBootRoute({ onboarding_completed_at: '2026-07-17T10:00:00Z' })).toBe(
      '/(tabs)/home',
    );
  });

  it('treats an empty-string timestamp as not completed', () => {
    // Defensive: a falsy-but-present value must not skip onboarding, which would
    // drop her into an empty Home with no Letter — the worst possible first run.
    expect(resolveBootRoute({ onboarding_completed_at: '' })).toBe('/(onboarding)');
  });
});
