import type { Row } from '@aura/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type Profile = Row<'profiles'>;

/** Namespaced per feature (05 §2). */
export const profileKeys = {
  all: ['profile'] as const,
  detail: (userId: string) => [...profileKeys.all, userId] as const,
};

export async function fetchProfile(userId: string): Promise<Profile> {
  // RLS already restricts this to her own row; the filter is for index use, not
  // for security (02 §5). Never rely on a client filter as the boundary.
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Server state lives in TanStack Query, never in Zustand (05 §2 rule).
 *
 * The profile row is created by a DB trigger the instant the auth user exists
 * (02 §1), so this should never 404 for a live session.
 */
export function useProfile(userId: string | undefined): UseQueryResult<Profile, Error> {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? 'anonymous'),
    queryFn: () => fetchProfile(userId as string),
    enabled: Boolean(userId),
  });
}
