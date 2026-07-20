import { Directory, File, Paths } from 'expo-file-system';

import { kv, STORAGE_KEYS } from '@/lib/storage';

/**
 * The audio cache (10 §6).
 *
 * Phase 6 needs exactly one policy: **the Letter is kept forever**. Product 08
 * promises "it's yours forever" on the free tier, and a promise that depends on
 * a network round-trip is not a promise — so first play writes the mp3 to disk
 * and the index marks it `permanent`.
 *
 * The `permanent` flag exists now, unused by any eviction code, because Phase 7
 * adds today's-moment prefetch and a 200MB LRU (10 §6/§8). That sweep must be
 * able to see which files it is forbidden to touch; encoding it at write time
 * means the letter is already safe when the evictor arrives, rather than needing
 * a migration to find out.
 *
 * Signed URLs are never stored — they expire in an hour (10 §3). Only local
 * paths live here.
 */
export interface AudioCacheEntry {
  localPath: string;
  cachedAt: number;
  /** Never evicted. The Letter and favourites (10 §6). */
  permanent: boolean;
}

type AudioCacheIndex = Record<string, AudioCacheEntry>;

const AUDIO_DIR = 'audio';

function readIndex(): AudioCacheIndex {
  return kv.get<AudioCacheIndex>(STORAGE_KEYS.audioCacheIndex) ?? {};
}

function writeIndex(index: AudioCacheIndex): void {
  kv.set(STORAGE_KEYS.audioCacheIndex, index);
}

function audioDirectory(): Directory {
  const dir = new Directory(Paths.cache, AUDIO_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/**
 * The on-disk path for a cached moment, or null.
 *
 * Checks the FILE, not just the index: the OS may clear the cache directory
 * under storage pressure, and an index entry pointing at a deleted file would
 * hand the player a path that silently fails to load. A missing file self-heals
 * by dropping the stale entry so the next call re-downloads.
 */
export function getCachedAudioPath(momentId: string): string | null {
  const entry = readIndex()[momentId];
  if (!entry) return null;

  if (!new File(entry.localPath).exists) {
    forgetCachedAudio(momentId);
    return null;
  }

  return entry.localPath;
}

/**
 * Downloads audio to the cache and records it. Returns the local path.
 *
 * Idempotent: an already-cached moment returns its existing path without
 * re-downloading, so a replay costs nothing.
 */
export async function cacheAudio(
  momentId: string,
  remoteUrl: string,
  options: { permanent?: boolean } = {},
): Promise<string> {
  const existing = getCachedAudioPath(momentId);
  if (existing) return existing;

  const destination = new File(audioDirectory(), `${momentId}.mp3`);
  const downloaded = await File.downloadFileAsync(remoteUrl, destination);

  const index = readIndex();
  index[momentId] = {
    localPath: downloaded.uri,
    cachedAt: Date.now(),
    permanent: options.permanent ?? false,
  };
  writeIndex(index);

  return downloaded.uri;
}

/** Drops an entry from the index and deletes its file if present. */
export function forgetCachedAudio(momentId: string): void {
  const index = readIndex();
  const entry = index[momentId];
  if (!entry) return;

  const file = new File(entry.localPath);
  if (file.exists) file.delete();

  delete index[momentId];
  writeIndex(index);
}

/**
 * Wipes every cached file and the index. Called by account deletion — "deletion
 * wipes cache" (10 §6, 03 §5): her voice must not outlive her account on disk.
 */
export function clearAudioCache(): void {
  for (const momentId of Object.keys(readIndex())) forgetCachedAudio(momentId);

  const dir = new Directory(Paths.cache, AUDIO_DIR);
  if (dir.exists) dir.delete();

  kv.delete(STORAGE_KEYS.audioCacheIndex);
}
