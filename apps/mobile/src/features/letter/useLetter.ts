import type { Row } from '@aura/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { cacheAudio, getCachedAudioPath } from './audioCache';
import { groupIntoLines, type KaraokeLine, type WordTiming } from './karaoke';

export type Moment = Row<'moments'>;

export const letterKeys = {
  all: ['letter'] as const,
  latest: (userId: string) => [...letterKeys.all, 'latest', userId] as const,
};

export interface Letter {
  id: string;
  title: string | null;
  body: string;
  /** Local file path when cached, otherwise a signed remote URL (10 §3). */
  audioSource: string | null;
  durationMs: number | null;
  lines: KaraokeLine[];
}

/** Signed URLs last an hour and are never persisted (10 §3) — re-signed on demand. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Loads her letter and resolves something playable.
 *
 * OFFLINE-FIRST, because the letter is promised "forever" (product 08): if the
 * mp3 is already on disk we hand back the local path and never touch the
 * network, so a replay on a plane works exactly like the first play. Only a
 * cache miss reaches for a signed URL, and that download is then kept
 * permanently.
 *
 * A missing audio file is NOT an error: the row is `ready` with body text, and
 * showing her the letter silently is far better than showing her nothing. The
 * screen degrades to a readable letter (Phase 6 edge cases).
 */
export async function fetchLetter(userId: string): Promise<Letter | null> {
  const { data, error } = await supabase
    .from('moments')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'letter')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    body: data.body ?? '',
    audioSource: await resolveAudioSource(data.id, data.audio_path),
    durationMs: data.duration_ms,
    lines: groupIntoLines(toWordTimings(data.word_timings)),
  };
}

export function useLetter(userId: string | undefined): UseQueryResult<Letter | null, Error> {
  return useQuery({
    queryKey: letterKeys.latest(userId ?? 'anonymous'),
    queryFn: () => fetchLetter(userId as string),
    enabled: Boolean(userId),
    // The letter never changes once written, so refetching it on every focus
    // would only burn a signed-URL request against an immutable row.
    staleTime: Infinity,
  });
}

/**
 * Local path if cached; otherwise sign, download, and keep. A download failure
 * falls back to streaming the signed URL rather than failing the whole letter.
 */
async function resolveAudioSource(
  momentId: string,
  audioPath: string | null,
): Promise<string | null> {
  if (!audioPath) return null;

  const cached = getCachedAudioPath(momentId);
  if (cached) return cached;

  const { data, error } = await supabase.storage
    .from('audio')
    .createSignedUrl(audioPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;

  try {
    return await cacheAudio(momentId, data.signedUrl, { permanent: true });
  } catch {
    // Disk full, or the cache directory vanished. She still gets her letter —
    // it just streams this time and caches on the next play.
    return data.signedUrl;
  }
}

/**
 * `word_timings` arrives as untyped jsonb. Anything malformed degrades to an
 * empty list, which renders the letter as plain text rather than crashing the
 * wow on a bad row.
 */
function toWordTimings(value: unknown): WordTiming[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (entry): entry is WordTiming =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as WordTiming).word === 'string' &&
      typeof (entry as WordTiming).startMs === 'number' &&
      typeof (entry as WordTiming).endMs === 'number',
  );
}
