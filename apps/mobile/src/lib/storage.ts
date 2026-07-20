import { createMMKV } from 'react-native-mmkv';

/**
 * MMKV helpers (05 §2): onboarding draft, audio cache index, "seen" flags.
 *
 * Not for the auth session — that lives in expo-secure-store (see supabase.ts).
 * Not for server data — that is TanStack Query's job (05 §2 rule).
 *
 * v4 exposes `MMKV` as a type only; `createMMKV()` is the factory.
 */
export const storage = createMMKV({ id: 'aura' });

/** Typed JSON accessors so call sites don't hand-roll parse/stringify. */
export const kv = {
  get<T>(key: string): T | undefined {
    const raw = storage.getString(key);
    if (raw === undefined) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // A corrupt value is not worth crashing a launch over — drop it and move on.
      storage.remove(key);
      return undefined;
    }
  },

  set(key: string, value: unknown): void {
    storage.set(key, JSON.stringify(value));
  },

  delete(key: string): void {
    storage.remove(key);
  },

  /** Full local wipe. Used by account deletion (14 §6) — delete must mean delete. */
  clearAll(): void {
    storage.clearAll();
  },
};

/** Namespaced keys — keep every MMKV key declared here, not inline at call sites. */
export const STORAGE_KEYS = {
  onboardingDraft: 'onboarding.draft',
  audioCacheIndex: 'audio.cacheIndex',
  queryCache: 'query.cache',
  /** Which generation attempt the Letter is on — becomes its idempotency key (Phase 6). */
  letterAttempt: 'letter.attempt',
  /** Set once she has actually heard her letter; the boot gate reads it (06 §3). */
  letterSeen: 'letter.seen',
} as const;
