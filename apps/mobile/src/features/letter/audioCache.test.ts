import { File } from 'expo-file-system';

import { kv, STORAGE_KEYS } from '@/lib/storage';

import { cacheAudio, clearAudioCache, forgetCachedAudio, getCachedAudioPath } from './audioCache';

const fs = jest.requireMock('expo-file-system') as { __files: Set<string> };

/**
 * The audio cache (10 §6).
 *
 * The behaviour that matters is the promise behind it: product 08 tells her the
 * letter is hers forever, so these assert that it survives on disk, that a
 * replay costs nothing, and that a cache the OS quietly wiped self-heals instead
 * of handing the player a dead path.
 */
describe('audioCache', () => {
  beforeEach(() => {
    fs.__files.clear();
    kv.delete(STORAGE_KEYS.audioCacheIndex);
    jest.clearAllMocks();
  });

  describe('getCachedAudioPath', () => {
    it('reports nothing for a moment that was never cached', () => {
      expect(getCachedAudioPath('moment-1')).toBeNull();
    });

    it('returns the path once cached', async () => {
      await cacheAudio('moment-1', 'https://signed.example/audio.mp3');

      expect(getCachedAudioPath('moment-1')).toContain('moment-1.mp3');
    });

    it('self-heals when the OS cleared the cache directory under it', async () => {
      await cacheAudio('moment-1', 'https://signed.example/audio.mp3');
      // The index still points at it, but the file is gone.
      fs.__files.clear();

      expect(getCachedAudioPath('moment-1')).toBeNull();
      // And the stale entry is dropped, so the next call re-downloads cleanly.
      expect(kv.get<Record<string, unknown>>(STORAGE_KEYS.audioCacheIndex)).toEqual({});
    });
  });

  describe('cacheAudio', () => {
    it('downloads and records the file', async () => {
      const path = await cacheAudio('moment-1', 'https://signed.example/audio.mp3');

      expect(File.downloadFileAsync).toHaveBeenCalledTimes(1);
      expect(path).toContain('moment-1.mp3');
    });

    it('does not re-download a moment it already has — a replay is free', async () => {
      await cacheAudio('moment-1', 'https://signed.example/audio.mp3');
      await cacheAudio('moment-1', 'https://signed.example/audio.mp3');

      expect(File.downloadFileAsync).toHaveBeenCalledTimes(1);
    });

    it('marks the Letter permanent so a later eviction sweep cannot take it', async () => {
      await cacheAudio('letter-1', 'https://signed.example/audio.mp3', { permanent: true });

      const index = kv.get<Record<string, { permanent: boolean }>>(STORAGE_KEYS.audioCacheIndex);
      expect(index?.['letter-1']?.permanent).toBe(true);
    });

    it('defaults to evictable for everything else', async () => {
      await cacheAudio('moment-1', 'https://signed.example/audio.mp3');

      const index = kv.get<Record<string, { permanent: boolean }>>(STORAGE_KEYS.audioCacheIndex);
      expect(index?.['moment-1']?.permanent).toBe(false);
    });

    it('stamps when it was cached, for the Phase 7 sweep', async () => {
      await cacheAudio('moment-1', 'https://signed.example/audio.mp3');

      const index = kv.get<Record<string, { cachedAt: number }>>(STORAGE_KEYS.audioCacheIndex);
      expect(index?.['moment-1']?.cachedAt).toBeGreaterThan(0);
    });

    it('never stores the signed URL — it expires in an hour (10 §3)', async () => {
      const url = 'https://signed.example/audio.mp3?token=secret';
      await cacheAudio('moment-1', url);

      const raw = JSON.stringify(kv.get(STORAGE_KEYS.audioCacheIndex));
      expect(raw).not.toContain('token=secret');
      expect(raw).not.toContain('https://signed.example');
    });
  });

  describe('forgetCachedAudio', () => {
    it('drops the entry and the file', async () => {
      await cacheAudio('moment-1', 'https://signed.example/audio.mp3');

      forgetCachedAudio('moment-1');

      expect(getCachedAudioPath('moment-1')).toBeNull();
    });

    it('is a no-op for an unknown moment', () => {
      expect(() => forgetCachedAudio('nope')).not.toThrow();
    });
  });

  describe('clearAudioCache', () => {
    it('wipes everything, permanent included — deletion means deletion (03 §5)', async () => {
      await cacheAudio('letter-1', 'https://a.example/1.mp3', { permanent: true });
      await cacheAudio('moment-2', 'https://a.example/2.mp3');

      clearAudioCache();

      expect(getCachedAudioPath('letter-1')).toBeNull();
      expect(getCachedAudioPath('moment-2')).toBeNull();
      expect(kv.get(STORAGE_KEYS.audioCacheIndex)).toBeUndefined();
    });
  });
});
