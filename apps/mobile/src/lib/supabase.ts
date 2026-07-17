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
  },
);
