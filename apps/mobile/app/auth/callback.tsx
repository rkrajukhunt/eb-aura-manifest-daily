import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Screen } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { recordEmailClaim } from '@/features/paywall/claim';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * `aura://auth/callback` — the magic-link landing (03 §82, 06 §5).
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

      // The claim is only complete once the link is followed (03 §2.2).
      recordEmailClaim();
      router.replace('/(tabs)/home');
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
