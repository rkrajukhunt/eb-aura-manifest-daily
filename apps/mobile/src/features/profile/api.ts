import type { Database, Row, Update } from '@aura/shared';

import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

type MemoryCategory = Database['public']['Enums']['memory_category'];

export type Person = Row<'people'>;

/**
 * Profile editing (09 §1: profile edits update the PERMANENT memory items, not
 * just the profile row — otherwise What Aura Knows keeps telling her the old
 * truth after she corrected it, which reads as not being listened to).
 */

/** Editable fields → their memory presence. `null` content = no memory echo. */
const FIELD_MEMORY: Partial<
  Record<keyof Update<'profiles'>, { category: MemoryCategory; content: (v: string) => string }>
> = {
  name: { category: 'identity', content: (v) => `Your name is ${v}` },
  self_description: {
    category: 'identity',
    content: (v) => `You described yourself as: ${v}`,
  },
  dream_city: { category: 'dream', content: (v) => `Your dream city is ${v}` },
  dream_home: {
    category: 'dream',
    content: (v) => `Your dream home is ${v.replace(/[-_]/g, ' ')}`,
  },
};

export async function updateProfileField(
  userId: string,
  field: keyof Update<'profiles'>,
  value: string,
): Promise<void> {
  const trimmed = value.trim();

  const { error } = await supabase
    .from('profiles')
    .update({ [field]: trimmed === '' ? null : trimmed } as Update<'profiles'>)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  const memory = FIELD_MEMORY[field];
  if (!memory || trimmed === '') return;

  // Update-in-place keeps the item's id, weight and usage history; only the
  // truth changes. A miss (she edited before any seed existed) inserts fresh.
  const { data: existing } = await supabase
    .from('memory_items')
    .select('id')
    .eq('user_id', userId)
    .eq('category', memory.category)
    .eq('source', 'onboarding')
    .like('content', `${memory.content('').slice(0, 12)}%`)
    .limit(1);

  const patch = { content: memory.content(trimmed), verbatim: trimmed };

  if (existing && existing.length > 0) {
    const first = existing[0] as { id: string };
    const { error: updateError } = await supabase
      .from('memory_items')
      .update({ ...patch, source: 'profile_edit' })
      .eq('id', first.id);
    if (updateError) throw new Error(updateError.message);
  } else {
    const { error: insertError } = await supabase.from('memory_items').insert({
      user_id: userId,
      category: memory.category,
      tier: 'permanent',
      source: 'profile_edit',
      ...patch,
    });
    if (insertError) throw new Error(insertError.message);
    analytics.capture('memory_item_created', {
      category: memory.category,
      source: 'profile_edit',
    });
  }
}

/** "Anything I should know" → evolving memory (09 §1 write-path table). */
export async function saveFreeTextNote(userId: string, note: string): Promise<void> {
  const trimmed = note.trim();

  const { error } = await supabase
    .from('profiles')
    .update({ free_text_note: trimmed === '' ? null : trimmed })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  if (trimmed === '') return;

  const { error: memoryError } = await supabase.from('memory_items').insert({
    user_id: userId,
    category: 'place_lifestyle',
    tier: 'evolving',
    content: `You wanted me to know: ${trimmed}`,
    verbatim: trimmed,
    source: 'profile_edit',
  });
  if (memoryError) throw new Error(memoryError.message);

  analytics.capture('memory_item_created', { category: 'place_lifestyle', source: 'profile_edit' });
}

export async function fetchPeople(userId: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at');

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Removal deactivates, never deletes (02 §1): the row stays for history, but
 * generation context filters on `active` — silence over a wrong guess.
 */
export async function deactivatePerson(personId: string): Promise<void> {
  const { error } = await supabase.from('people').update({ active: false }).eq('id', personId);
  if (error) throw new Error(error.message);
}

export async function addPerson(userId: string, name: string, descriptor: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed === '') return;

  const { error } = await supabase.from('people').insert({
    user_id: userId,
    name: trimmed,
    ...(descriptor.trim() ? { descriptor: descriptor.trim() } : {}),
  });
  if (error) throw new Error(error.message);
}
