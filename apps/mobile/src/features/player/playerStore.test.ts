import { clampSeek, formatTime, progressOf, SKIP_MS, SPEEDS, usePlayerStore } from './playerStore';
import type { PlayableMoment } from '@/features/moments/useMoments';

/**
 * Global player state (10 §4).
 *
 * The behaviour worth pinning is what happens ACROSS screens: minimizing must
 * not stop playback (that is the whole point of a mini-player), and loading a
 * new moment must reset position (or a new moment would start mid-sentence).
 */
describe('playerStore', () => {
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

  beforeEach(() => usePlayerStore.getState().reset());

  describe('opening a moment', () => {
    it('loads it and shows the cover', () => {
      usePlayerStore.getState().open(moment());

      expect(usePlayerStore.getState().moment?.id).toBe('moment-1');
      expect(usePlayerStore.getState().minimized).toBe(false);
    });

    it('takes the duration from the moment, before playback reports one', () => {
      usePlayerStore.getState().open(moment({ durationMs: 90_000 }));

      expect(usePlayerStore.getState().durationMs).toBe(90_000);
    });

    it('resets position, so a new moment does not start mid-sentence', () => {
      usePlayerStore.getState().setPosition(45_000);
      usePlayerStore.getState().open(moment({ id: 'moment-2' }));

      expect(usePlayerStore.getState().positionMs).toBe(0);
    });

    it('always opens in listen mode', () => {
      usePlayerStore.getState().toggleMode();
      usePlayerStore.getState().open(moment());

      expect(usePlayerStore.getState().mode).toBe('listen');
    });
  });

  describe('minimize and expand (06 §2)', () => {
    it('keeps the moment loaded when minimized — audio outlives the screen', () => {
      usePlayerStore.getState().open(moment());
      usePlayerStore.getState().setPlaying(true);

      usePlayerStore.getState().minimize();

      expect(usePlayerStore.getState().minimized).toBe(true);
      expect(usePlayerStore.getState().moment).not.toBeNull();
      expect(usePlayerStore.getState().playing).toBe(true);
    });

    it('restores the cover on expand', () => {
      usePlayerStore.getState().open(moment());
      usePlayerStore.getState().minimize();

      usePlayerStore.getState().expand();

      expect(usePlayerStore.getState().minimized).toBe(false);
    });

    it('closing clears the moment and stops', () => {
      usePlayerStore.getState().open(moment());
      usePlayerStore.getState().setPlaying(true);

      usePlayerStore.getState().close();

      expect(usePlayerStore.getState().moment).toBeNull();
      expect(usePlayerStore.getState().playing).toBe(false);
    });
  });

  describe('speed (10 §4)', () => {
    it('starts at 1.0 — the voice is unhurried by design', () => {
      expect(usePlayerStore.getState().speed).toBe(1.0);
    });

    it('cycles through the three speeds and back', () => {
      const seen = [
        usePlayerStore.getState().cycleSpeed(),
        usePlayerStore.getState().cycleSpeed(),
        usePlayerStore.getState().cycleSpeed(),
      ];

      expect(seen).toEqual([1.25, 1.5, 1.0]);
    });

    it('offers exactly the documented set', () => {
      expect([...SPEEDS]).toEqual([1.0, 1.25, 1.5]);
    });
  });

  describe('read mode', () => {
    it('toggles between listening and reading', () => {
      usePlayerStore.getState().toggleMode();
      expect(usePlayerStore.getState().mode).toBe('read');

      usePlayerStore.getState().toggleMode();
      expect(usePlayerStore.getState().mode).toBe('listen');
    });
  });

  describe('clampSeek', () => {
    it('skips forward within the track', () => {
      expect(clampSeek(30_000 + SKIP_MS, 90_000)).toBe(45_000);
    });

    it('never scrubs past the end (Phase 7 edge case)', () => {
      expect(clampSeek(120_000, 90_000)).toBe(90_000);
    });

    it('never scrubs before the beginning', () => {
      expect(clampSeek(-5_000, 90_000)).toBe(0);
    });

    it('is zero when the duration is not known yet', () => {
      expect(clampSeek(30_000, 0)).toBe(0);
    });
  });

  describe('progressOf', () => {
    it('reports the fraction played', () => {
      expect(progressOf(45_000, 90_000)).toBe(0.5);
    });

    it('clamps an overshoot rather than exceeding one', () => {
      expect(progressOf(95_000, 90_000)).toBe(1);
    });

    it('is zero before a duration is known', () => {
      expect(progressOf(1_000, 0)).toBe(0);
    });
  });

  describe('formatTime', () => {
    it.each([
      [0, '0:00'],
      [9_000, '0:09'],
      [65_000, '1:05'],
      [600_000, '10:00'],
    ])('formats %pms as %p', (ms, expected) => {
      expect(formatTime(ms)).toBe(expected);
    });

    it('treats a nonsensical value as zero rather than showing NaN', () => {
      expect(formatTime(Number.NaN)).toBe('0:00');
      expect(formatTime(-1)).toBe('0:00');
    });
  });
});
