import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useBoot } from '@/hooks/useBoot';
import { useProfile } from '@/hooks/useProfile';
import { resolveBootRoute } from '@/lib/routeGate';
import { useAppState } from '@/stores/appState';

/**
 * Holds the app on the splash until the session and profile exist, then routes
 * per 05 §9.
 *
 * Copy here is placeholder-plain. Phase 1 brings the orb and the real in-voice
 * lines from `src/copy/` — but the rule already applies: never a spinner, never
 * an error code, one honest line (05 §8, product 14).
 */
export function BootGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const status = useAppState((s) => s.status);
  const userId = useAppState((s) => s.userId);

  useBoot();

  const { data: profile } = useProfile(userId ?? undefined);

  useEffect(() => {
    if (status !== 'ready' || !profile) return;
    router.replace(resolveBootRoute(profile));
  }, [status, profile, router]);

  if (status === 'failed') {
    return (
      <View style={styles.center}>
        {/* Phase 1: in-voice copy + retry. Honest waiting, no codes (05 §8). */}
        <Text style={styles.line}>I can&apos;t reach you right now. I&apos;ll keep trying.</Text>
      </View>
    );
  }

  if (status === 'booting' || !profile) {
    // Static holding view — the breathing orb replaces this in Phase 1.
    return <View style={styles.center} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  line: { fontSize: 16, textAlign: 'center' },
});
