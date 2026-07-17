import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import '@/lib/instrument';

import { BootGate } from '@/components/BootGate';
import { queryClient } from '@/lib/queryClient';

/**
 * Root layout (01 §2: routes stay thin and delegate to features).
 *
 * Phase 1 adds the theme + MotionContext providers and bundled fonts.
 * Phase 6 adds /letter, Phase 7 /player (both full-screen covers, 06 §1).
 */
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <BootGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(onboarding)" />
        </Stack>
      </BootGate>
    </QueryClientProvider>
  );
}
