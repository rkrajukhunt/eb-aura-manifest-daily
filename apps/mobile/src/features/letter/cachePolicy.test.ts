import {
  CACHE_MAX_BYTES,
  EVICT_AFTER_DAYS,
  selectEvictions,
  type AudioCacheEntry,
} from './audioCache';

/**
 * The cache eviction policy (10 §6).
 *
 * The rule this suite exists to protect is the first one: `permanent` entries
 * are never evicted. The Letter is promised "yours forever" out loud (product
 * 08) and favourites are cached "while favorited" — an evictor that could take
 * either would break a promise the product makes to her face, and it would do
 * it silently, on the one day she went to replay something that mattered.
 */
describe('cache eviction policy', () => {
  const NOW = Date.UTC(2026, 6, 20, 12, 0, 0);
  const DAY = 86_400_000;
  const MB = 1024 * 1024;

  const entry = (overrides: Partial<AudioCacheEntry> = {}): AudioCacheEntry => ({
    localPath: 'file:///cache/audio/x.mp3',
    cachedAt: NOW,
    lastUsedAt: NOW,
    permanent: false,
    size: MB,
    ...overrides,
  });

  describe('permanent entries', () => {
    it('never evicts the Letter, however old', () => {
      const index = {
        letter: entry({ permanent: true, cachedAt: NOW - 400 * DAY, lastUsedAt: NOW - 400 * DAY }),
      };

      expect(selectEvictions(index, NOW)).toEqual([]);
    });

    it('never evicts a favourite, however far over budget the cache is', () => {
      const index = {
        fav: entry({ permanent: true, size: 500 * MB, lastUsedAt: NOW - 90 * DAY }),
      };

      expect(selectEvictions(index, NOW)).toEqual([]);
    });

    it('still counts protected files against the budget', () => {
      // Otherwise the cache could exceed its ceiling by exactly the size of
      // everything protected, and the ceiling would stop meaning anything.
      const index = {
        fav: entry({ permanent: true, size: CACHE_MAX_BYTES }),
        recent: entry({ size: 10 * MB }),
      };

      expect(selectEvictions(index, NOW)).toContain('recent');
    });
  });

  describe('age', () => {
    it('evicts a moment past the seven-day window', () => {
      const index = {
        stale: entry({ lastUsedAt: NOW - (EVICT_AFTER_DAYS + 1) * DAY }),
      };

      expect(selectEvictions(index, NOW)).toEqual(['stale']);
    });

    it('keeps a moment inside the window', () => {
      const index = { fresh: entry({ lastUsedAt: NOW - 2 * DAY }) };

      expect(selectEvictions(index, NOW)).toEqual([]);
    });

    it('measures from last PLAY, not from when it was downloaded', () => {
      // Something downloaded a month ago but replayed yesterday is in active use.
      const index = {
        replayed: entry({ cachedAt: NOW - 30 * DAY, lastUsedAt: NOW - 1 * DAY }),
      };

      expect(selectEvictions(index, NOW)).toEqual([]);
    });

    it('falls back to cachedAt for entries written before Phase 7', () => {
      const index = {
        legacy: { localPath: 'p', cachedAt: NOW - 30 * DAY, permanent: false } as AudioCacheEntry,
      };

      expect(selectEvictions(index, NOW)).toEqual(['legacy']);
    });
  });

  describe('the 200MB budget', () => {
    it('leaves a cache under budget alone', () => {
      const index = { a: entry({ size: 10 * MB }), b: entry({ size: 10 * MB }) };

      expect(selectEvictions(index, NOW)).toEqual([]);
    });

    it('evicts least-recently-used first once over budget', () => {
      const index = {
        oldest: entry({ size: 120 * MB, lastUsedAt: NOW - 3 * DAY }),
        newest: entry({ size: 120 * MB, lastUsedAt: NOW - 1 * DAY }),
      };

      const evicted = selectEvictions(index, NOW);

      expect(evicted).toContain('oldest');
      expect(evicted).not.toContain('newest');
    });

    it('stops evicting as soon as it fits', () => {
      const index = {
        a: entry({ size: 100 * MB, lastUsedAt: NOW - 5 * DAY }),
        b: entry({ size: 100 * MB, lastUsedAt: NOW - 4 * DAY }),
        c: entry({ size: 100 * MB, lastUsedAt: NOW - 3 * DAY }),
      };

      // 300MB over a 200MB ceiling: one eviction is enough.
      expect(selectEvictions(index, NOW)).toHaveLength(1);
    });

    it('tolerates entries with no recorded size', () => {
      const { size: _omitted, ...unsized } = entry();
      const index = { unsized: unsized as AudioCacheEntry };

      expect(() => selectEvictions(index, NOW)).not.toThrow();
    });
  });

  it('does nothing to an empty cache', () => {
    expect(selectEvictions({}, NOW)).toEqual([]);
  });
});
