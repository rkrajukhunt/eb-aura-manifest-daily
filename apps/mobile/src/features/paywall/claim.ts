import type { ClaimMethod } from '@aura/shared';
import * as AppleAuthentication from 'expo-apple-authentication';

import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

/**
 * Claiming an anonymous account (03 §2.2).
 *
 * The critical property: claiming LINKS an identity to the existing anonymous
 * user rather than creating a new one. The Supabase `user_id` does not change,
 * which means her memory, her letter and her RevenueCat entitlement — all keyed
 * to that id (03 §4) — survive the claim untouched. A sign-up flow that created
 * a fresh user would silently orphan everything she has told us.
 *
 * Claiming is always OPTIONAL and never gates entitlement (03 §2.2): she paid,
 * so she has premium whether or not she ever creates a way back in.
 */

export type ClaimResult = { status: 'claimed' } | { status: 'cancelled' } | { status: 'failed' };

/** Whether Sign in with Apple can be offered on this device. */
export async function appleAuthAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Links an Apple identity to the current anonymous user.
 *
 * `linkIdentity` rather than `signInWithIdToken`: the latter would authenticate
 * as a DIFFERENT user and strand the anonymous one, taking her data with it.
 */
export async function claimWithApple(): Promise<ClaimResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });

    if (!credential.identityToken) return { status: 'failed' };

    const { error } = await supabase.auth.linkIdentity({
      provider: 'apple',
      options: { skipBrowserRedirect: true },
    } as never);

    if (error) return { status: 'failed' };

    analytics.capture('account_claimed', { method: 'apple' satisfies ClaimMethod });
    return { status: 'claimed' };
  } catch (error) {
    // Apple's sheet reports a user cancel as a thrown error with this code.
    if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') {
      return { status: 'cancelled' };
    }
    return { status: 'failed' };
  }
}

/**
 * Attaches an email to the anonymous user and sends the confirmation link.
 *
 * `updateUser` keeps the same user id (03 §2.2). The claim is not complete until
 * she follows the link, which is why this reports "sent" rather than "claimed" —
 * overstating it would leave her believing her data is safe when it is not yet.
 */
export async function claimWithEmail(email: string): Promise<{ sent: boolean }> {
  const { error } = await supabase.auth.updateUser({ email });
  return { sent: !error };
}

/** Fired once the emailed link is followed and the identity is confirmed. */
export function recordEmailClaim(): void {
  analytics.capture('account_claimed', { method: 'email' satisfies ClaimMethod });
}
