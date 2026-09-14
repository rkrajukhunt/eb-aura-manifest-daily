import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { bootCopy } from '@/copy/boot';
import { useAccountStatus } from '@/features/auth/useAccountStatus';
import { hasSeenLetter } from '@/features/letter/keepLetter';
import { configureNotifications } from '@/features/notifications/useNotifications';
import { useNotificationRouting } from '@/features/notifications/useNotificationRouting';
import { useLetter } from '@/features/letter/useLetter';
import { useBoot } from '@/hooks/useBoot';
import { useProfile } from '@/hooks/useProfile';
import { resolveBootRoute } from '@/lib/routeGate';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Holds the app on a quiet themed view until the session and profile exist,
 * then routes per 05 §9. The idle orb joins this screen when the boot flow is
 * polished in Phase 3 — the failure line is already in-voice (05 §8).
 */
export function BootGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const status = useAppState((s) => s.status);
  const userId = useAppState((s) => s.userId);
  // The hard-gate inputs, captured at boot (see useBoot) so routing never races
  // the RevenueCat SDK's configuration.
  const premium = useAppState((s) => s.premium);
  const bootError = useAppState((s) => s.bootError);
  const { colors, spacing, typography } = useTheme();

  useBoot();

  // Sets the foreground handler and the Android notification channel once, up
  // front (11 §2) — the channel must exist before any push can render, and this
  // needs neither a session nor permission, so it runs on every boot.
  useEffect(() => {
    void configureNotifications();
  }, []);

  // Re-asked on every boot (and after a sign-out bumps the nonce), because it
  // is what decides whether she meets the gate at all.
  const { claimed } = useAccountStatus();

  const { data: profile } = useProfile(userId ?? undefined);

  // Only asked for once onboarding is done — before that the answer is always
  // "no letter yet", and querying would spend a round-trip on a certainty.
  const letterQuery = useLetter(
    profile?.onboarding_completed_at ? (userId ?? undefined) : undefined,
  );

  // A tapped notification routes AFTER the boot gate has decided where she
  // belongs (06 §5), so a link can never skip the funnel. This also reports the
  // open, which is the only way auto-soften can ever reset (11 §5).
  useNotificationRouting(userId ?? undefined, profile, Boolean(letterQuery.data), claimed);

  useEffect(() => {
    // No session at all (03 §2.1 reversal): there is no profile to wait on and
    // nothing to resolve — she has never signed in. Send her to the wall. The
    // render below lets the `(auth)` stack actually appear rather than holding.
    if (status === 'unauthenticated') {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (status !== 'ready' || !profile) return;

    // The claim check decides the very first gate, so routing before it settles
    // would flash whichever screen the default happened to pick.
    if (claimed === undefined) return;

    // Wait for the letter lookup to settle before routing, or a completed user
    // would be sent to Home for a frame and then yanked to the Letter — the wow
    // arriving as a glitch.
    if (profile.onboarding_completed_at && letterQuery.isPending) return;

    router.replace(
      resolveBootRoute({
        claimed,
        profile,
        hasLetter: Boolean(letterQuery.data),
        letterSeen: hasSeenLetter(),
        premium,
      }),
    );
  }, [status, claimed, profile, letterQuery.isPending, letterQuery.data, premium, router]);

  const holding = (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        backgroundColor: colors.bg.base,
      }}
    >
      {status === 'failed' && (
        <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>
          {bootCopy.cantReach}
        </Text>
      )}
      {/* DEVELOPMENT ONLY. She never sees a code (05 §8) — but on a real device
          this line is the only place a boot failure is legible at all, and a
          device-only failure is exactly the kind the simulator cannot show us. */}
      {__DEV__ && status === 'failed' && bootError && (
        <Text
          selectable
          style={[
            typography.body,
            {
              color: colors.text.secondary,
              textAlign: 'center',
              marginTop: spacing.lg,
              opacity: 0.7,
            },
          ]}
        >
          {bootError}
        </Text>
      )}
    </View>
  );

  // Unauthenticated renders the app so the sign-in wall (an `(auth)` route) can
  // show — it has no profile and never will until she signs in, so it must not
  // be caught by the `!profile` hold below.
  if (status === 'unauthenticated') return <>{children}</>;

  if (status === 'failed' || status === 'booting' || !profile) return holding;

  return <>{children}</>;
}
