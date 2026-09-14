import { create } from 'zustand';

import { kv, STORAGE_KEYS } from '@/lib/storage';

import { dayCounts, localDay, type DaySignals } from './day';
import {
  countDay,
  emptyStreak,
  milestoneReached,
  seedFromHistory,
  type StreakOutcome,
  type StreakState,
} from './streak';

/**
 * The count, persisted (05 §2: client state in Zustand, small stores).
 *
 * Server data does not live here — this is local-first for the same reason
 * gratitude is: she writes on a train, and a count that needed the network to
 * increment would be a count that silently failed. The Supabase mirror is a
 * backup for a new phone, not the source of truth.
 *
 * `lastOutcome` exists so Home can say the right thing once. A `held` or
 * `reset` is a fact about a moment, not about the state, and the card needs to
 * know it happened without inferring it from numbers that no longer show it.
 */
interface StreakStore {
  state: StreakState;
  /** The most recent transition, for the one line Home shows under the count. */
  lastOutcome: StreakOutcome['kind'] | null;
  /** The milestone just reached, for the letter pipeline to consume and clear. */
  pendingMilestone: 7 | 30 | 100 | null;
  /**
   * Record activity. Safe to call on every relevant event — `countDay` returns
   * `unchanged` for a day already counted, so callers never coordinate.
   */
  record: (signals: DaySignals, now?: Date) => StreakOutcome | null;
  clearMilestone: () => void;
  /**
   * Seed from days she has already lived. Idempotent and refuses to run once
   * anything has been counted, so it can never overwrite a live count.
   */
  seed: (days: string[], now?: Date) => void;
  /** Account deletion and sign-out. Delete must mean delete (14 §6). */
  reset: () => void;
}

function hydrate(): StreakState {
  const stored = kv.get<StreakState>(STORAGE_KEYS.streak);
  if (!stored) return emptyStreak(localDay(new Date()));

  // A partially-written or hand-edited value must not brick Home. Validate the
  // ARRAYS and the null-able field too, not just the scalars (M19): a string in
  // `countedDays` passes `typeof number` checks and later breaks `countDay`/
  // `weekFrom`. Anything failing the shape check is discarded rather than
  // migrated — the cost is one lost count, the alternative a crash on the
  // first screen she sees.
  const shaped =
    typeof stored.current === 'number' &&
    typeof stored.longest === 'number' &&
    typeof stored.heldDaysUsed === 'number' &&
    typeof stored.heldMonth === 'string' &&
    (stored.lastCountedDay === null || typeof stored.lastCountedDay === 'string') &&
    Array.isArray(stored.countedDays) &&
    stored.countedDays.every((d) => typeof d === 'string') &&
    Array.isArray(stored.heldDays) &&
    stored.heldDays.every((d) => typeof d === 'string');

  return shaped ? stored : emptyStreak(localDay(new Date()));
}

function persist(state: StreakState): void {
  kv.set(STORAGE_KEYS.streak, state);
}

export const useStreakStore = create<StreakStore>((set, get) => ({
  state: hydrate(),
  lastOutcome: null,
  pendingMilestone: null,

  record: (signals, now = new Date()) => {
    if (!dayCounts(signals)) return null;

    const today = localDay(now);
    const outcome = countDay(get().state, today);

    // Nothing moved — do not touch storage, and do not overwrite the last
    // outcome, or a "held" line would vanish the moment she opened the app twice.
    if (outcome.kind === 'unchanged') return outcome;

    persist(outcome.state);
    set({
      state: outcome.state,
      lastOutcome: outcome.kind,
      pendingMilestone: milestoneReached(outcome) ?? get().pendingMilestone,
    });

    return outcome;
  },

  clearMilestone: () => set({ pendingMilestone: null }),

  seed: (days, now = new Date()) => {
    const existing = get().state;
    if (existing.lastCountedDay !== null || existing.countedDays.length > 0) return;

    const seeded = seedFromHistory(days, localDay(now));
    if (seeded.lastCountedDay === null) return;

    persist(seeded);
    set({ state: seeded });
  },

  reset: () => {
    const fresh = emptyStreak(localDay(new Date()));
    kv.delete(STORAGE_KEYS.streak);
    set({ state: fresh, lastOutcome: null, pendingMilestone: null });
  },
}));
