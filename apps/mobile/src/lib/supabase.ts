import type { Database } from '@aura/shared';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { env } from './env';

/**
 * Supabase client, typed by the generated DB types (01 §2).
 *
 * The session is the one thing that must survive a reinstall-free relaunch — an
 * anonymous user who loses it loses everything, since there's no credential to
 * recover with until she claims (03 §2.1). So it lives in the Keychain via
 * expo-secure-store, not MMKV.
 */

/**
 * NOTE for Phase 2: SecureStore warns above 2048 bytes per value, and a Supabase
 * session (access + refresh JWT) can approach that. If it trips in practice, chunk
 * the value across keys here — this adapter is the single place that would change.
 */
const secureStoreAdapter: SupportedStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

/**
 * Ceiling on any single Supabase request.
 *
 * Long enough that a slow cellular round-trip still succeeds, short enough that
 * a stalled one is a failure she is told about rather than a wait she cannot
 * tell apart from a hang.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * supabase-js ships no request timeout, and iOS will hold a stalled TLS socket
 * open for its own ~15 MINUTES before giving up. Boot awaits
 * `auth.getSession()`, which refreshes an expired token over the network — so
 * one stalled refresh left the app on BootGate's holding view indefinitely: a
 * blank themed screen, no message, no retry, for as long as the socket lasted.
 * Observed on a QUIC connection to /auth/v1/token that hung for 912s.
 *
 * A bounded request turns that silent hang into an ordinary error, which the
 * boot sequence already knows how to report (useBoot → setFailed → the
 * "can't reach" line). Every Supabase call gets this, not just auth — a query
 * that hangs forever is the same bug wearing a different hat.
 */
export const timeoutFetch: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // A caller's own signal still has to work — supabase-js passes one for
  // realtime and for cancelled queries, and dropping it would leak those.
  const caller = init?.signal;
  if (caller) {
    if (caller.aborted) controller.abort();
    else caller.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export const supabase = createClient<Database>(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      // No deep-link-based OAuth callback to parse; Sign in with Apple (Phase 10)
      // goes through the native flow.
      detectSessionInUrl: false,
    },
    global: { fetch: timeoutFetch },
  },
);
