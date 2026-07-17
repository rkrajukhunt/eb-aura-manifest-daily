import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import '@/lib/instrument';

/**
 * Root layout (01 §2: routes stay thin and delegate to features).
 *
 * Phase 0 is a skeleton. What lands here later:
 *   - Phase 1: theme + MotionContext providers, bundled fonts
 *   - Phase 2: TanStack Query provider, the boot sequence and route gate (05 §9)
 *   - Phase 6: the /letter full-screen cover
 *   - Phase 7: the /player full-screen cover
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
