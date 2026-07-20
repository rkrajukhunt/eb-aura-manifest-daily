import { kv, STORAGE_KEYS } from '@/lib/storage';

/**
 * "Shown once; dismissal flag stored" (12 §3).
 *
 * The post-Letter cover is presented exactly one time. Re-presenting it would be
 * the "second, quieter paywall" pattern product 01 §10 bans outright — after she
 * has declined once, the only remaining paywall surfaces are the locked-feature
 * sheets she opens herself and the Settings screen she navigates to.
 *
 * Local, not server, for the same reason `letterSeen` is: this is device
 * presentation state, and a second device may legitimately show it once too.
 */
export function markPaywallSeen(): void {
  kv.set(STORAGE_KEYS.paywallSeen, true);
}

export function hasSeenPaywall(): boolean {
  return kv.get<boolean>(STORAGE_KEYS.paywallSeen) === true;
}
