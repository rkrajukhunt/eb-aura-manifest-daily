import { seedMemoryFromOnboarding, type Row, type SeedProfile } from '@aura/shared';

import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

export type MemoryItem = Row<'memory_items'>;
export type NeverIncludeTerm = Row<'never_include'>;

/**
 * Memory data access (09 §6). All Supabase-direct — no backend hop (00 §D1).
 * RLS scopes every query to her own rows; the `.eq(user_id)` filters exist for
 * the index, never as the security boundary.
 */

/** Items shown on "What Aura Knows", newest first. */
export async function fetchMemoryItems(userId: string): Promise<MemoryItem[]> {
  const { data, error } = await supabase
    .from('memory_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Per-item delete is a HARD delete (09 §6, product 18: "delete means delete").
 * There is no soft-delete path here and there must never be one — `deleted_at`
 * on the table is for system expiry audit only.
 */
export async function deleteMemoryItem(item: Pick<MemoryItem, 'id' | 'category'>): Promise<void> {
  const { error } = await supabase.from('memory_items').delete().eq('id', item.id);
  if (error) throw new Error(error.message);

  analytics.capture('memory_item_deleted', { category: item.category });
}

export async function fetchNeverInclude(userId: string): Promise<NeverIncludeTerm[]> {
  const { data, error } = await supabase
    .from('never_include')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addNeverIncludeTerm(userId: string, term: string): Promise<void> {
  const trimmed = term.trim();
  if (trimmed === '') return;

  const { error } = await supabase.from('never_include').insert({ user_id: userId, term: trimmed });

  // A duplicate is not a failure from her point of view — the term is already
  // excluded, which is exactly what she asked for. Don't show an error for a
  // request that is, in effect, already satisfied.
  if (error && !isUniqueViolation(error)) throw new Error(error.message);

  // No payload: the term itself never leaves the device (13 §2).
  analytics.capture('never_include_added');
}

export async function removeNeverIncludeTerm(id: string): Promise<void> {
  const { error } = await supabase.from('never_include').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * The onboarding seed write path (09 §1). Called by Phase 3 on completion.
 *
 * Runs client-side against Supabase, which keeps the backend out of the write
 * path entirely (00 §D1) — the harvester lives in `@aura/shared` precisely so
 * this can happen here without duplicating logic.
 */
export async function seedMemoryForUser(userId: string, profile: SeedProfile): Promise<void> {
  const { items, phrases } = seedMemoryFromOnboarding(profile);
  if (items.length === 0 && phrases.length === 0) return;

  if (items.length > 0) {
    const { error } = await supabase
      .from('memory_items')
      .insert(items.map((item) => ({ ...item, user_id: userId })));

    if (error) throw new Error(error.message);

    for (const item of items) {
      analytics.capture('memory_item_created', { category: item.category, source: item.source });
    }
  }

  if (phrases.length > 0) {
    // Uniqueness is enforced by an EXPRESSION index — (user_id, lower(phrase)) —
    // which PostgREST's `onConflict` cannot name, since it only takes plain
    // columns. So the existing phrases are read and filtered here instead.
    // A batch insert would otherwise fail wholesale on one repeat, and a retried
    // seed must never cost her the rest of her memory.
    const fresh = await withoutExistingPhrases(userId, phrases);

    if (fresh.length > 0) {
      const { error } = await supabase
        .from('exact_phrases')
        .insert(fresh.map((phrase) => ({ ...phrase, user_id: userId })));

      if (error) throw new Error(error.message);
    }
  }
}

async function withoutExistingPhrases<T extends { phrase: string }>(
  userId: string,
  phrases: T[],
): Promise<T[]> {
  const { data } = await supabase.from('exact_phrases').select('phrase').eq('user_id', userId);

  const existing = new Set((data ?? []).map((row) => row.phrase.toLowerCase()));

  return phrases.filter((p) => !existing.has(p.phrase.toLowerCase()));
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505';
}
