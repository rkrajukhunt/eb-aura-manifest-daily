import * as Sentry from '@sentry/react-native';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

/**
 * Session bootstrap (05 §9, 03 §2.1).
 *
 * First launch signs in anonymously — no email, no signup, no wall. The whole
 * onboarding and the Letter happen on this session (00 §D2); it is a real user
 * with real rows and real RLS, not a placeholder.
 */

/** Retry schedule for the first sign-in. Offline launch must not dead-end (05 §3). */
const RETRY_DELAYS_MS = [500, 1500, 4000];

export class AnonymousSignInError extends Error {
  constructor(cause: string) {
    super(`Anonymous sign-in failed: ${cause}`);
    this.name = 'AnonymousSignInError';
  }
}

/**
 * Returns the stored session, or creates an anonymous one.
 *
 * Retries with backoff because a first launch on a bad connection is common and
 * losing here means she cannot use the app at all. The caller shows an honest
 * waiting state — never a spinner with an error code (05 §8).
 */
export async function ensureSession(
  sleep: (ms: number) => Promise<void> = defaultSleep,
): Promise<Session> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  let lastError = 'unknown';

  // One attempt up front, then one per backoff step.
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 0);

    const { data: signInData, error } = await supabase.auth.signInAnonymously();

    if (signInData?.session) return signInData.session;
    lastError = error?.message ?? 'no session returned';
  }

  throw new AnonymousSignInError(lastError);
}

/**
 * Binds the user id to observability (05 §9).
 * Id only — never her name, email or anything she wrote (14, 00 §D10).
 */
export function identifyForObservability(userId: string): void {
  Sentry.setUser({ id: userId });
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
