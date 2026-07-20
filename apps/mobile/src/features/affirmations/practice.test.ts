import { kv, STORAGE_KEYS } from '@/lib/storage';

import {
  currentBlock,
  emptyPractice,
  increment,
  isBlockComplete,
  isPracticeComplete,
  isRitualComplete,
  loadPractice,
  loadRitual,
  markBeat,
  PRACTICE_TARGETS,
  recordBeat,
  savePractice,
} from './practice';

/**
 * The 369 counter and the ritual tracker.
 *
 * Both encode a product rule that is easy to break by accident: neither may
 * carry a failure forward. Yesterday's incomplete practice is not today's
 * problem, and `ritual_completed` must fire only when all three beats happened
 * on the SAME day — tracking them as independent flags would let Monday's
 * moment and Friday's gratitude count as a completed ritual and corrupt the
 * retention number the habit loop is measured on.
 */
describe('369 practice', () => {
  const TODAY = '2026-07-20';

  beforeEach(() => kv.delete(STORAGE_KEYS.practice369));

  it('uses the documented targets', () => {
    expect(PRACTICE_TARGETS).toEqual({ morning: 3, afternoon: 6, night: 9 });
  });

  it('starts empty', () => {
    expect(emptyPractice(TODAY)).toEqual({ date: TODAY, morning: 0, afternoon: 0, night: 0 });
  });

  describe('counting', () => {
    it('records a repetition', () => {
      const state = increment(emptyPractice(TODAY), 'morning');

      expect(state.morning).toBe(1);
    });

    it('never counts past the target', () => {
      let state = emptyPractice(TODAY);
      for (let i = 0; i < 10; i++) state = increment(state, 'morning');

      expect(state.morning).toBe(3);
    });

    it('keeps the blocks independent', () => {
      const state = increment(emptyPractice(TODAY), 'night');

      expect(state).toMatchObject({ morning: 0, afternoon: 0, night: 1 });
    });

    it('completes a block at its target', () => {
      let state = emptyPractice(TODAY);
      state = increment(increment(increment(state, 'morning'), 'morning'), 'morning');

      expect(isBlockComplete(state, 'morning')).toBe(true);
      expect(isBlockComplete(state, 'afternoon')).toBe(false);
    });

    it('is complete only when all three blocks are', () => {
      const full = { date: TODAY, morning: 3, afternoon: 6, night: 9 };

      expect(isPracticeComplete(full)).toBe(true);
      expect(isPracticeComplete({ ...full, night: 8 })).toBe(false);
    });
  });

  describe('the daily reset — no failure is carried forward', () => {
    it('returns today’s state when it is today’s', () => {
      savePractice({ date: TODAY, morning: 2, afternoon: 0, night: 0 });

      expect(loadPractice(TODAY).morning).toBe(2);
    });

    it('discards yesterday’s half-finished practice entirely', () => {
      // A counter that remembered what she did not finish would be the streak
      // mechanic product 16 bans, wearing a different hat.
      savePractice({ date: '2026-07-19', morning: 3, afternoon: 4, night: 0 });

      expect(loadPractice(TODAY)).toEqual(emptyPractice(TODAY));
    });

    it('starts fresh when nothing is stored', () => {
      expect(loadPractice(TODAY)).toEqual(emptyPractice(TODAY));
    });
  });

  describe('currentBlock', () => {
    const at = (hour: number) => new Date(2026, 6, 20, hour, 0, 0);

    it.each([
      [7, 'morning'],
      [11, 'morning'],
      [12, 'afternoon'],
      [17, 'afternoon'],
      [18, 'night'],
      [23, 'night'],
    ])('puts %p o’clock in %p', (hour, expected) => {
      expect(currentBlock(at(hour))).toBe(expected);
    });
  });
});

describe('the daily ritual', () => {
  const TODAY = '2026-07-20';

  beforeEach(() => kv.delete(STORAGE_KEYS.ritualProgress));

  it('starts with nothing done', () => {
    expect(loadRitual(TODAY)).toEqual({
      date: TODAY,
      moment: false,
      affirmation: false,
      gratitude: false,
    });
  });

  it('is complete only with all three beats', () => {
    const progress = { date: TODAY, moment: true, affirmation: true, gratitude: true };

    expect(isRitualComplete(progress)).toBe(true);
    expect(isRitualComplete({ ...progress, gratitude: false })).toBe(false);
  });

  it('marks a beat', () => {
    expect(markBeat(loadRitual(TODAY), 'moment').moment).toBe(true);
  });

  describe('recordBeat', () => {
    it('reports completion on the beat that finishes the set', () => {
      recordBeat(TODAY, 'moment');
      recordBeat(TODAY, 'affirmation');

      expect(recordBeat(TODAY, 'gratitude').justCompleted).toBe(true);
    });

    it('does not report completion on the earlier beats', () => {
      expect(recordBeat(TODAY, 'moment').justCompleted).toBe(false);
      expect(recordBeat(TODAY, 'affirmation').justCompleted).toBe(false);
    });

    it('fires only ONCE — a repeated beat does not re-complete the ritual', () => {
      recordBeat(TODAY, 'moment');
      recordBeat(TODAY, 'affirmation');
      recordBeat(TODAY, 'gratitude');

      expect(recordBeat(TODAY, 'gratitude').justCompleted).toBe(false);
      expect(recordBeat(TODAY, 'moment').justCompleted).toBe(false);
    });

    it('does not let beats from different days combine', () => {
      // Monday's moment plus Friday's gratitude is not a completed ritual.
      recordBeat('2026-07-19', 'moment');
      recordBeat('2026-07-19', 'affirmation');

      const result = recordBeat(TODAY, 'gratitude');

      expect(result.justCompleted).toBe(false);
      expect(result.progress).toMatchObject({ date: TODAY, moment: false, affirmation: false });
    });

    it('accepts the beats in any order', () => {
      recordBeat(TODAY, 'gratitude');
      recordBeat(TODAY, 'affirmation');

      expect(recordBeat(TODAY, 'moment').justCompleted).toBe(true);
    });
  });
});
