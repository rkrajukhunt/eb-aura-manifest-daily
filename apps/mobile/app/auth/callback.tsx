import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Screen } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { consumePendingSignIn, recordEmailSignIn } from '@/features/auth/session';
import { recordEmailClaim } from '@/features/paywall/claim';
import { wipeDeviceState } from '@/lib/accountReset';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * `aura://auth/callback` — the magic-link landing (03 §8.2, 06 §5).
 *
 * This route existing is what makes the email claim path work at all: the sheet
 * sends the link, and without a handler here the tap resolved to nothing and the
 * claim silently never completed.
 *
 * Supabase returns its tokens in the URL FRAGMENT, which `expo-router` surfaces
 * as params. The client is configured with `detectSessionInUrl: false` (correct
 * for a native app — there is no browser to read `window.location`), so the
 * session must be set explicitly here rather than being picked up for us.
 */
export default function AuthCallbackRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    error_description?: string;
  }>();
  const { colors, spacing } = useTheme();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;

      if (!accessToken || !refreshToken) {
        if (active) setFailed(true);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!active) return;

      if (error) {
        // An expired or reused link. She keeps everything — the anonymous
        // session on this device is untouched — so this is a retry, not a loss.
        setFailed(true);
        return;
      }

      // A sign-in link and a claim link are indistinguishable here — both are
      // just tokens — so which one this was is recorded when it is SENT.
      if (consumePendingSignIn()) {
        // She is now a different user. Everything MMKV and TanStack hold
        // belongs to the anonymous account this device was on (03 §2.3).
        recordEmailSignIn();
        wipeDeviceState();
        // Back through the boot gate so it re-routes off the new session —
        // she may be mid-onboarding on one phone and finished on the other.
        router.replace('/');
        return;
      }

      // Not a sign-in link, so it is a brand-new email SIGN-UP being confirmed
      // (03 §2.1 reversal: sign-up now precedes onboarding) or the dormant claim
      // link. Route through the boot gate rather than straight to Home: a
      // just-confirmed new user still has to onboard, and `resolveBootRoute` is
      // the one place that decides that. A finished user still lands on Home.
      recordEmailClaim();
      // Unlike the sign-in branch, the claim keeps every local byte (03 §2.2 —
      // the user id does not change), so there is nothing to wipe. But the boot
      // snapshot must refresh anyway: without a nonce bump the boot gate re-runs
      // on nothing and the new identity isn't picked up until a cold start.
      useAppState.getState().reset();
      router.replace('/');
    })();

    return () => {
      active = false;
    };
  }, [params.access_token, params.refresh_token, router]);

  return (
    <Screen testID="auth-callback">
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}
      >
        {failed && (
          <Text
            testID="auth-callback-failed"
            style={{ color: colors.text.secondary, textAlign: 'center' }}
          >
            {paywallCopy.claim.emailSent}
          </Text>
        )}
      </View>
    </Screen>
  );
}
