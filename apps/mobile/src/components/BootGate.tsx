import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { bootCopy } from '@/copy/boot';
import { hasSeenLetter } from '@/features/letter/keepLetter';
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
  const { colors, spacing, typography } = useTheme();

  useBoot();

  const { data: profile } = useProfile(userId ?? undefined);

  // Only asked for once onboarding is done — before that the answer is always
  // "no letter yet", and querying would spend a round-trip on a certainty.
  const letterQuery = useLetter(
    profile?.onboarding_completed_at ? (userId ?? undefined) : undefined,
  );

  useEffect(() => {
    if (status !== 'ready' || !profile) return;

    // Wait for the letter lookup to settle before routing, or a completed user
    // would be sent to Home for a frame and then yanked to the Letter — the wow
    // arriving as a glitch.
    if (profile.onboarding_completed_at && letterQuery.isPending) return;

    router.replace(
      resolveBootRoute({
        profile,
        hasLetter: Boolean(letterQuery.data),
        letterSeen: hasSeenLetter(),
      }),
    );
  }, [status, profile, letterQuery.isPending, letterQuery.data, router]);

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
    </View>
  );

  if (status === 'failed' || status === 'booting' || !profile) return holding;

  return <>{children}</>;
}
