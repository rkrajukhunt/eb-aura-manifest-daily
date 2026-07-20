import { useCallback, useEffect, useState } from 'react';

import { recordBeat } from '@/features/affirmations/practice';
import { analytics } from '@/lib/analytics';
import { kv, STORAGE_KEYS } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { haptic } from '@/theme/haptics';

import {
  markSynced,
  mergeRemote,
  pendingSync,
  readEntries,
  upsertLocal,
  weekDots,
  writeEntries,
  type GratitudeIndex,
} from './gratitudeStore';

/** Her local calendar date — the identity of an entry (product 09 §9.4). */
export function localDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Free-text length as a bucket, never content or exact length (13 §2). */
function charCountBucket(text: string): 'empty' | 'short' | 'medium' | 'long' {
  const length = text.trim().length;
  if (length === 0) return 'empty';
  if (length < 40) return 'short';
  if (length < 120) return 'medium';
  return 'long';
}

/**
 * Gratitude, local-first (product 09 §9.4).
 *
 * The save path never awaits the network: the entry is written to MMKV, the dot
 * fills, the tick fires, and the sync happens behind her. That ordering is the
 * feature — a ten-second habit that can fail is not a ten-second habit.
 */
export function useGratitude(userId: string | undefined) {
  const [index, setIndex] = useState<GratitudeIndex>(() => readEntries());
  const today = localDate();

  const persist = useCallback((next: GratitudeIndex) => {
    writeEntries(next);
    setIndex(next);
  }, []);

  /** Pushes anything queued. Silent by design — failures simply stay queued. */
  const drain = useCallback(
    async (current: GratitudeIndex) => {
      if (!userId) return;
      let working = current;

      for (const entry of pendingSync(current)) {
        const { error } = await supabase.from('gratitude_entries').upsert(
          {
            user_id: userId,
            entry: entry.entry,
            entry_date: entry.entryDate,
            prompt_shown: entry.promptShown,
            prompt_was_personalized: entry.promptWasPersonalized,
            synced_from_local: true,
          },
          { onConflict: 'user_id,entry_date' },
        );

        // A failure leaves it queued for the next attempt, and she is never told.
        if (!error) working = markSynced(working, entry.entryDate, entry.entry);
      }

      if (working !== current) persist(working);
    },
    [userId, persist],
  );

  // Pull the server's copy once, then push anything queued.
  useEffect(() => {
    if (!userId) return;
    let active = true;

    void (async () => {
      const { data } = await supabase
        .from('gratitude_entries')
        .select('entry, entry_date, prompt_shown')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false })
        .limit(60);

      if (!active) return;

      const merged = mergeRemote(
        readEntries(),
        (data ?? []).map((row) => ({
          entryDate: row.entry_date,
          entry: row.entry,
          promptShown: row.prompt_shown,
        })),
      );

      persist(merged);
      await drain(merged);
    })();

    return () => {
      active = false;
    };
  }, [userId, persist, drain]);

  const save = useCallback(
    (entry: string, promptShown: string | null, personalized: boolean) => {
      const next = upsertLocal(index, {
        entryDate: today,
        entry,
        promptShown,
        promptWasPersonalized: personalized,
      });

      // Local write, soft tick, dot fills — all before the network is touched.
      persist(next);
      void haptic('gratitudeSaved');
      analytics.capture('gratitude_entry_saved', {
        char_count_bucket: charCountBucket(entry),
        prompt_was_personalized: personalized,
      });

      // Beat three (product 09). `ritual_completed` fires only when all three
      // happened the same day, whichever order she did them in.
      if (recordBeat(today, 'gratitude').justCompleted) {
        analytics.capture('ritual_completed');
      }

      void drain(next);
    },
    [index, today, persist, drain],
  );

  const contractSeen = kv.get<boolean>(STORAGE_KEYS.gratitudeContractSeen) === true;

  const acknowledgeContract = useCallback(() => {
    kv.set(STORAGE_KEYS.gratitudeContractSeen, true);
  }, []);

  return {
    today,
    todaysEntry: index[today]?.entry ?? null,
    dots: weekDots(index, today),
    history: Object.values(index)
      .filter((entry) => entry.entry.trim() !== '')
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
      .slice(0, 30),
    showContract: !contractSeen,
    acknowledgeContract,
    save,
  };
}
