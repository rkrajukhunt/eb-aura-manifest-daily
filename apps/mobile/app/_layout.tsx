import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_600SemiBold,
  useFonts,
} from '@expo-google-fonts/fraunces';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '@/lib/instrument';

import { BootGate } from '@/components/BootGate';
import { queryClient } from '@/lib/queryClient';
import { MotionProvider } from '@/theme/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Hold the splash until fonts exist: serif is the product's voice made visible
// (product 12 — "typography is the hero"), so a sans flash-of-fallback on the
// very first frame would be the brand arriving underdressed.
void SplashScreen.preventAutoHideAsync();

/**
 * Root layout (01 §2: routes stay thin and delegate to features).
 *
 * Provider order matters: theme and motion wrap everything so no screen can
 * render unthemed; the boot gate sits inside them because its holding view is
 * themed too. Phase 6 adds /letter, Phase 7 /player (full-screen covers, 06 §1).
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold,
  });

  useEffect(() => {
    // A font failure must not brick the launch — the system serif steps in and
    // she gets her Letter. fontError is captured upstream by Sentry.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    // Gesture root is mandatory for the sheet library; sheets are where every
    // input flow lives (product 12 §bottom sheets), so it belongs at the top.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <MotionProvider>
          <QueryClientProvider client={queryClient}>
            <BottomSheetModalProvider>
              <StatusBar style="auto" />
              <BootGate>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(onboarding)" />
                </Stack>
              </BootGate>
            </BottomSheetModalProvider>
          </QueryClientProvider>
        </MotionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
