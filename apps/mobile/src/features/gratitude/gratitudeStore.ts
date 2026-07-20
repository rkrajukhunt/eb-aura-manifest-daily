import { kv, STORAGE_KEYS } from '@/lib/storage';

/**
 * Local-first gratitude (product 09 §9.4).
 *
 * The product promise is that writing a line has NO loading state and NO error
 * state: "Loading: none needed (local write, background sync). Error: saved
 * locally, syncs silently." So the local store is the source of truth for the
 * UI, and the network is a background detail she never waits on or hears about.
 *
 * Everything here is pure over a plain record, so the offline queue, the
 * same-day edit rule and conflict resolution can all be tested without MMKV,
 * Supabase, or a clock.
 */

export interface GratitudeEntry {
  /** Her local calendar date, `YYYY-MM-DD`. The identity of an entry. */
  entryDate: string;
  entry: string;
  promptShown: string | null;
  promptWasPersonalized: boolean;
  /** Local edit time, used to resolve a conflict against the server copy. */
  updatedAt: number;
  /** False until the server has confirmed it. */
  synced: boolean;
}

export type GratitudeIndex = Record<string, GratitudeEntry>;

export function readEntries(): GratitudeIndex {
  return kv.get<GratitudeIndex>(STORAGE_KEYS.gratitudeEntries) ?? {};
}

export function writeEntries(index: GratitudeIndex): void {
  kv.set(STORAGE_KEYS.gratitudeEntries, index);
}

/**
 * Saves an entry locally, immediately.
 *
 * A second write on the same day is an EDIT, never a duplicate (product 09
 * §9.4 edge cases) — which is why the date is the key rather than a generated
 * id. The database's `UNIQUE(user_id, entry_date)` mirrors this, so the sync
 * can upsert blindly without ever inventing a second row for one day.
 */
export function upsertLocal(
  index: GratitudeIndex,
  entry: Omit<GratitudeEntry, 'synced' | 'updatedAt'>,
  now: number = Date.now(),
): GratitudeIndex {
  return {
    ...index,
    [entry.entryDate]: { ...entry, updatedAt: now, synced: false },
  };
}

/** Everything still waiting to reach the server, oldest first. */
export function pendingSync(index: GratitudeIndex): GratitudeEntry[] {
  return Object.values(index)
    .filter((entry) => !entry.synced)
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate));
}

/** Marks an entry confirmed, without disturbing an edit made while it was in flight. */
export function markSynced(
  index: GratitudeIndex,
  entryDate: string,
  syncedText: string,
): GratitudeIndex {
  const entry = index[entryDate];
  if (!entry) return index;

  // She edited the line while the previous version was uploading. Leaving it
  // marked synced would strand the newer text on the device forever, so the
  // flag only flips when what we sent still matches what is on screen.
  if (entry.entry !== syncedText) return index;

  return { ...index, [entryDate]: { ...entry, synced: true } };
}

/**
 * Merges the server's copy in.
 *
 * LOCAL WINS on a genuine conflict. Her device holds what she typed most
 * recently, and this is a personal journal rather than shared data — silently
 * replacing today's line with an older server copy would be the app overwriting
 * her own words, which is the one thing this feature must never do.
 */
export function mergeRemote(
  index: GratitudeIndex,
  remote: { entryDate: string; entry: string; promptShown: string | null }[],
): GratitudeIndex {
  const merged: GratitudeIndex = { ...index };

  for (const row of remote) {
    const local = merged[row.entryDate];

    if (local && !local.synced) continue; // Unsynced local edit outranks the server.

    merged[row.entryDate] = {
      entryDate: row.entryDate,
      entry: row.entry,
      promptShown: row.promptShown,
      promptWasPersonalized: local?.promptWasPersonalized ?? false,
      updatedAt: local?.updatedAt ?? 0,
      synced: true,
    };
  }

  return merged;
}

/** Has she written today? Drives the dot and the done-state. */
export function hasEntryFor(index: GratitudeIndex, entryDate: string): boolean {
  return Boolean(index[entryDate]?.entry.trim());
}

/**
 * The last seven days as dots (product 09 §9.4).
 *
 * Returns filled/unfilled per day and NOTHING else — deliberately no streak,
 * no break state, no "you missed Tuesday". Product 16 is shame-free by design
 * and product 14 bans the guilt vocabulary outright; a dots row that could
 * express a broken streak would be the first place that leaks back in.
 */
export function weekDots(
  index: GratitudeIndex,
  today: string,
  days = 7,
): { date: string; filled: boolean }[] {
  const dots: { date: string; filled: boolean }[] = [];
  const base = new Date(`${today}T00:00:00Z`);

  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(base);
    day.setUTCDate(day.getUTCDate() - offset);
    const date = day.toISOString().slice(0, 10);
    dots.push({ date, filled: hasEntryFor(index, date) });
  }

  return dots;
}
