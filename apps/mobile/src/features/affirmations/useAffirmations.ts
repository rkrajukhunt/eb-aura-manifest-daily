import type { Row } from '@aura/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type Affirmation = Row<'affirmations'>;

export const affirmationKeys = {
  all: ['affirmations'] as const,
  today: (userId: string) => [...affirmationKeys.all, 'today', userId] as const,
  kept: (userId: string) => [...affirmationKeys.all, 'kept', userId] as const,
  candidates: (userId: string) => [...affirmationKeys.all, 'candidates', userId] as const,
};

/**
 * Today's affirmation (product 09 §9.3a).
 *
 * One a day is the whole design — "one a day, that's enough" — so this reads
 * the newest daily card rather than a list. If the cron has not written today's
 * yet, yesterday's is shown rather than an empty state, matching the moment's
 * fallback behaviour: the ritual should never present a blank.
 */
export function useTodaysAffirmation(
  userId: string | undefined,
): UseQueryResult<Affirmation | null> {
  return useQuery({
    queryKey: affirmationKeys.today(userId ?? 'anonymous'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affirmations')
        .select('*')
        .eq('user_id', userId as string)
        .eq('kind', 'daily')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: Boolean(userId),
  });
}

/** Her collection — what she chose to keep (product 09 §9.3 "Kept words"). */
export function useKeptAffirmations(userId: string | undefined) {
  return useQuery({
    queryKey: affirmationKeys.kept(userId ?? 'anonymous'),
    queryFn: async () => {
      const { data } = await supabase
        .from('affirmations')
        .select('*')
        .eq('user_id', userId as string)
        .eq('status', 'kept')
        .order('saved_at', { ascending: false });

      return data ?? [];
    },
    enabled: Boolean(userId),
  });
}

/**
 * The three candidates a guided pass produced (product 09 §9.3b).
 *
 * Ordered by creation so the set reads in the order it was written, which is
 * how the model varied them — shuffling would lose the deliberate progression
 * from safest to boldest phrasing.
 */
export function useAffirmationCandidates(userId: string | undefined) {
  return useQuery({
    queryKey: affirmationKeys.candidates(userId ?? 'anonymous'),
    queryFn: async () => {
      const { data } = await supabase
        .from('affirmations')
        .select('*')
        .eq('user_id', userId as string)
        .eq('kind', 'guided')
        .eq('status', 'candidate')
        .order('created_at', { ascending: true });

      return data ?? [];
    },
    enabled: Boolean(userId),
  });
}
