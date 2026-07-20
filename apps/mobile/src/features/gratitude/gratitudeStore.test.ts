import {
  hasEntryFor,
  markSynced,
  mergeRemote,
  pendingSync,
  upsertLocal,
  weekDots,
  type GratitudeIndex,
} from './gratitudeStore';

/**
 * Local-first gratitude (Phase 8 test list: "offline queue, conflict, date
 * uniqueness").
 *
 * Two rules here are product promises rather than implementation details:
 *
 *  - A second entry on the same day is an EDIT, never a duplicate.
 *  - LOCAL WINS on conflict. This is a personal journal; silently replacing
 *    today's line with an older server copy would be the app overwriting her
 *    own words, which is the one thing this feature must never do.
 */
describe('gratitudeStore', () => {
  const NOW = Date.UTC(2026, 6, 20, 9, 0, 0);

  const entry = (overrides: Partial<Parameters<typeof upsertLocal>[1]> = {}) => ({
    entryDate: '2026-07-20',
    entry: 'the coffee on the balcony',
    promptShown: null,
    promptWasPersonalized: false,
    ...overrides,
  });

  describe('date uniqueness — a same-day write is an edit', () => {
    it('saves the first entry of a day', () => {
      const index = upsertLocal({}, entry(), NOW);

      expect(index['2026-07-20']?.entry).toBe('the coffee on the balcony');
    });

    it('REPLACES rather than duplicating on the same day', () => {
      let index = upsertLocal({}, entry(), NOW);
      index = upsertLocal(index, entry({ entry: 'actually, Nadia called' }), NOW + 1000);

      expect(Object.keys(index)).toHaveLength(1);
      expect(index['2026-07-20']?.entry).toBe('actually, Nadia called');
    });

    it('keeps separate days separate', () => {
      let index = upsertLocal({}, entry(), NOW);
      index = upsertLocal(index, entry({ entryDate: '2026-07-21' }), NOW);

      expect(Object.keys(index).sort()).toEqual(['2026-07-20', '2026-07-21']);
    });

    it('marks a fresh write as unsynced', () => {
      const index = upsertLocal({}, entry(), NOW);

      expect(index['2026-07-20']?.synced).toBe(false);
    });
  });

  describe('the offline queue', () => {
    it('lists everything not yet confirmed', () => {
      let index = upsertLocal({}, entry({ entryDate: '2026-07-19' }), NOW);
      index = upsertLocal(index, entry({ entryDate: '2026-07-20' }), NOW);

      expect(pendingSync(index).map((e) => e.entryDate)).toEqual(['2026-07-19', '2026-07-20']);
    });

    it('drains oldest first', () => {
      let index = upsertLocal({}, entry({ entryDate: '2026-07-20' }), NOW);
      index = upsertLocal(index, entry({ entryDate: '2026-07-18' }), NOW);

      expect(pendingSync(index)[0]?.entryDate).toBe('2026-07-18');
    });

    it('is empty once everything is confirmed', () => {
      let index = upsertLocal({}, entry(), NOW);
      index = markSynced(index, '2026-07-20', 'the coffee on the balcony');

      expect(pendingSync(index)).toEqual([]);
    });

    it('leaves an entry queued if she edited it while it was uploading', () => {
      // Otherwise the newer text would be stranded on the device forever.
      let index = upsertLocal({}, entry(), NOW);
      index = upsertLocal(index, entry({ entry: 'edited mid-flight' }), NOW + 500);

      index = markSynced(index, '2026-07-20', 'the coffee on the balcony');

      expect(index['2026-07-20']?.synced).toBe(false);
      expect(pendingSync(index)).toHaveLength(1);
    });

    it('ignores a confirmation for a day that no longer exists', () => {
      expect(() => markSynced({}, '2026-07-20', 'anything')).not.toThrow();
    });
  });

  describe('conflict — local wins', () => {
    it('does not let the server overwrite an unsynced local edit', () => {
      const index = upsertLocal({}, entry({ entry: 'what she actually wrote' }), NOW);

      const merged = mergeRemote(index, [
        { entryDate: '2026-07-20', entry: 'an older server copy', promptShown: null },
      ]);

      expect(merged['2026-07-20']?.entry).toBe('what she actually wrote');
    });

    it('accepts the server copy for a day she has already synced', () => {
      let index = upsertLocal({}, entry(), NOW);
      index = markSynced(index, '2026-07-20', 'the coffee on the balcony');

      const merged = mergeRemote(index, [
        { entryDate: '2026-07-20', entry: 'edited on another device', promptShown: null },
      ]);

      expect(merged['2026-07-20']?.entry).toBe('edited on another device');
    });

    it('pulls in days this device has never seen', () => {
      const merged = mergeRemote({}, [
        { entryDate: '2026-07-01', entry: 'from the old phone', promptShown: null },
      ]);

      expect(merged['2026-07-01']).toMatchObject({ entry: 'from the old phone', synced: true });
    });

    it('leaves untouched days alone', () => {
      const index = upsertLocal({}, entry({ entryDate: '2026-07-19' }), NOW);

      const merged = mergeRemote(index, [
        { entryDate: '2026-07-01', entry: 'older', promptShown: null },
      ]);

      expect(merged['2026-07-19']?.entry).toBe('the coffee on the balcony');
    });
  });

  describe('hasEntryFor', () => {
    it('is true for a day with a line', () => {
      const index = upsertLocal({}, entry(), NOW);

      expect(hasEntryFor(index, '2026-07-20')).toBe(true);
    });

    it('is false for a day with only whitespace', () => {
      const index = upsertLocal({}, entry({ entry: '   ' }), NOW);

      expect(hasEntryFor(index, '2026-07-20')).toBe(false);
    });

    it('is false for a day she skipped', () => {
      expect(hasEntryFor({}, '2026-07-20')).toBe(false);
    });
  });

  describe('weekDots — shame-free by construction', () => {
    it('returns seven days ending today', () => {
      const dots = weekDots({}, '2026-07-20');

      expect(dots).toHaveLength(7);
      expect(dots[6]?.date).toBe('2026-07-20');
      expect(dots[0]?.date).toBe('2026-07-14');
    });

    it('fills the days she wrote on', () => {
      const index: GratitudeIndex = upsertLocal({}, entry({ entryDate: '2026-07-18' }), NOW);

      const dots = weekDots(index, '2026-07-20');

      expect(dots.find((d) => d.date === '2026-07-18')?.filled).toBe(true);
      expect(dots.find((d) => d.date === '2026-07-19')?.filled).toBe(false);
    });

    it('expresses NOTHING but filled or not — no streak, no break state', () => {
      // Product 16 is shame-free by design and product 14 bans guilt vocabulary.
      // A dots row that could express a broken streak is the first place that
      // would leak back in, so the shape itself forbids it.
      const dots = weekDots({}, '2026-07-20');

      for (const dot of dots) {
        expect(Object.keys(dot).sort()).toEqual(['date', 'filled']);
      }
    });

    it('handles a gap without any notion of "missed"', () => {
      let index = upsertLocal({}, entry({ entryDate: '2026-07-14' }), NOW);
      index = upsertLocal(index, entry({ entryDate: '2026-07-20' }), NOW);

      const dots = weekDots(index, '2026-07-20');

      expect(dots.filter((d) => d.filled)).toHaveLength(2);
    });
  });
});
