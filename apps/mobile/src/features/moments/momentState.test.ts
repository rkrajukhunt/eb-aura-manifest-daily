import { greetingFor, resolveHomeMoment, type HomeMomentInput } from './momentState';
import type { PlayableMoment } from './useMoments';

/**
 * Which state Home shows (product 09 §9.1).
 *
 * Product 09 says this surface has **no empty state**: "Empty: never
 * (generation is scheduled ahead; fallback = replay yesterday's + honest
 * 'today's is still forming')". These tests are how that stays true — the
 * tempting simplification is "no moment today → show nothing", and it would
 * hand her a blank screen on exactly the mornings the habit is most fragile.
 */
describe('resolveHomeMoment', () => {
  const moment = (overrides: Partial<PlayableMoment> = {}): PlayableMoment => ({
    id: 'moment-1',
    type: 'daily',
    status: 'ready',
    title: 'The Balcony',
    body: 'Morning light.',
    audioSource: 'file:///cache/audio/moment-1.mp3',
    durationMs: 90_000,
    favoritedAt: null,
    refineOf: null,
    lines: [],
    ...overrides,
  });

  const input = (overrides: Partial<HomeMomentInput> = {}): HomeMomentInput => ({
    latest: moment(),
    latestScheduledFor: '2026-07-20',
    today: '2026-07-20',
    generating: false,
    failed: false,
    ...overrides,
  });

  it('shows today’s moment on a normal morning', () => {
    const state = resolveHomeMoment(input());

    expect(state.kind).toBe('ready');
  });

  it('treats an undated moment (Manifest, milestone) as ready', () => {
    // Telling her something is "still forming" while a moment she just asked
    // for sits there would be a lie about her own library.
    const state = resolveHomeMoment(input({ latestScheduledFor: null }));

    expect(state.kind).toBe('ready');
  });

  it('offers yesterday’s while today’s is still being written', () => {
    const state = resolveHomeMoment(input({ latestScheduledFor: '2026-07-19', generating: true }));

    expect(state.kind).toBe('forming');
    expect(state).toMatchObject({ fallback: expect.objectContaining({ id: 'moment-1' }) });
  });

  it('NEVER returns an empty state when she has any moment at all', () => {
    // The rule product 09 states outright. Every combination that has a moment
    // must render something playable.
    const combinations: HomeMomentInput[] = [
      input({ latestScheduledFor: '2026-07-19' }),
      input({ latestScheduledFor: '2026-07-19', generating: true }),
      input({ latestScheduledFor: '2026-07-19', failed: true }),
      input({ latestScheduledFor: '2026-01-01', failed: true, generating: false }),
    ];

    for (const combination of combinations) {
      const state = resolveHomeMoment(combination);
      const hasSomethingToPlay =
        state.kind === 'ready' || (state.kind !== 'first_run' && state.fallback !== null);

      expect(hasSomethingToPlay).toBe(true);
    }
  });

  it('shows the failure state with a fallback once generation gave up', () => {
    const state = resolveHomeMoment(
      input({ latestScheduledFor: '2026-07-19', failed: true, generating: false }),
    );

    expect(state.kind).toBe('failed');
    expect(state).toMatchObject({ fallback: expect.objectContaining({ id: 'moment-1' }) });
  });

  it('stays in forming while a retry is running, rather than flashing the failure', () => {
    const state = resolveHomeMoment(
      input({ latestScheduledFor: '2026-07-19', failed: true, generating: true }),
    );

    expect(state.kind).toBe('forming');
  });

  it('shows first-run only when she has genuinely never had a moment', () => {
    const state = resolveHomeMoment(input({ latest: null }));

    expect(state.kind).toBe('first_run');
  });

  it('shows the failure state, not first-run, when the very first generation failed', () => {
    const state = resolveHomeMoment(input({ latest: null, failed: true }));

    expect(state).toEqual({ kind: 'failed', fallback: null });
  });

  it('treats a future-dated moment as ready', () => {
    // Pre-generation writes tomorrow's before midnight; it should not read as
    // "still forming" just because its date is ahead of the clock.
    const state = resolveHomeMoment(input({ latestScheduledFor: '2026-07-21' }));

    expect(state.kind).toBe('ready');
  });
});

describe('greetingFor', () => {
  const at = (hour: number) => new Date(2026, 6, 20, hour, 0, 0);

  it.each([
    [6, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [23, 'evening'],
  ])('calls %p o’clock %p', (hour, expected) => {
    expect(greetingFor(at(hour))).toBe(expected);
  });
});
