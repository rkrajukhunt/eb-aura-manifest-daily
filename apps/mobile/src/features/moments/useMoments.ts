import type { Row } from '@aura/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { cacheAudio, getCachedAudioPath } from '@/features/letter/audioCache';
import { groupIntoLines, type KaraokeLine, type WordTiming } from '@/features/letter/karaoke';
import { supabase } from '@/lib/supabase';

export type MomentRow = Row<'moments'>;

export const momentKeys = {
  all: ['moments'] as const,
  today: (userId: string) => [...momentKeys.all, 'today', userId] as const,
  recent: (userId: string) => [...momentKeys.all, 'recent', userId] as const,
  forming: (userId: string) => [...momentKeys.all, 'forming', userId] as const,
};

export interface PlayableMoment {
  id: string;
  type: string;
  status: string;
  title: string | null;
  body: string;
  audioSource: string | null;
  durationMs: number | null;
  favoritedAt: string | null;
  refineOf: string | null;
  lines: KaraokeLine[];
}

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Her local calendar date — whose "today" it is (matches the cron, 04 §5). */
export function localDateToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Today's moment, or the most recent one if today's has not landed.
 *
 * Product 09 §9.1 is explicit that this surface has NO empty state: generation
 * is scheduled ahead, and the fallback is yesterday's moment plus an honest
 * line. So this returns the newest READY daily moment regardless of date, and
 * Home compares its `scheduled_for` against today to decide which state to show.
 * Returning nothing for a missing morning would push an empty screen at exactly
 * the moment the habit is being formed.
 */
export async function fetchTodaysMoment(userId: string): Promise<PlayableMoment | null> {
  const { data, error } = await supabase
    .from('moments')
    .select('*')
    .eq('user_id', userId)
    .in('type', ['daily', 'ondemand', 'milestone'])
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toPlayable(data) : null;
}

export function useTodaysMoment(userId: string | undefined): UseQueryResult<PlayableMoment | null> {
  return useQuery({
    queryKey: momentKeys.today(userId ?? 'anonymous'),
    queryFn: () => fetchTodaysMoment(userId as string),
    enabled: Boolean(userId),
  });
}

/** Recently played, for Home's third row (product 11). */
export function useRecentMoments(userId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: momentKeys.recent(userId ?? 'anonymous'),
    queryFn: async () => {
      const { data } = await supabase
        .from('moments')
        .select('id, title, type, played_at, favorited_at')
        .eq('user_id', userId as string)
        .eq('status', 'ready')
        .not('played_at', 'is', null)
        .order('played_at', { ascending: false })
        .limit(limit);

      return data ?? [];
    },
    enabled: Boolean(userId),
  });
}

/**
 * "Coming for you" — moments still being written (product 11).
 *
 * These are `forming` rows with a title and no body yet: the anticipation
 * surface, not a loading state. Showing what is coming is the point.
 */
export function useFormingMoments(userId: string | undefined, limit = 3) {
  return useQuery({
    queryKey: momentKeys.forming(userId ?? 'anonymous'),
    queryFn: async () => {
      const { data } = await supabase
        .from('moments')
        .select('id, title, scheduled_for')
        .eq('user_id', userId as string)
        .eq('status', 'forming')
        .order('scheduled_for', { ascending: true })
        .limit(limit);

      return data ?? [];
    },
    enabled: Boolean(userId),
  });
}

/**
 * Turns a row into something playable, resolving audio offline-first.
 *
 * A cached file is used without touching the network, which is what makes the
 * <300ms start budget reachable (product 13) and what lets a cached moment play
 * on a plane. Only a miss reaches for a signed URL (10 §3).
 */
export async function toPlayable(row: MomentRow): Promise<PlayableMoment> {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    title: row.title,
    body: row.body ?? '',
    audioSource: await resolveAudio(row.id, row.audio_path),
    durationMs: row.duration_ms,
    favoritedAt: row.favorited_at,
    refineOf: row.refine_of,
    lines: groupIntoLines(toWordTimings(row.word_timings)),
  };
}

async function resolveAudio(momentId: string, audioPath: string | null): Promise<string | null> {
  if (!audioPath) return null;

  const cached = getCachedAudioPath(momentId);
  if (cached) return cached;

  const { data, error } = await supabase.storage
    .from('audio')
    .createSignedUrl(audioPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;

  try {
    // Daily moments are evictable (10 §6) — only the Letter and favourites are
    // permanent, and marking these permanent would grow the cache without bound.
    return await cacheAudio(momentId, data.signedUrl);
  } catch {
    return data.signedUrl;
  }
}

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
