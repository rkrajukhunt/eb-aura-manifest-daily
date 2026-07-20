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
import { useHapticScreen } from '@/theme/useHapticScreen';
import { MotionProvider } from '@/theme/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Hold the splash until fonts exist: serif is the product's voice made visible
// (product 12 — "typography is the hero"), so a sans flash-of-fallback on the
// very first frame would be the brand arriving underdressed.
void SplashScreen.preventAutoHideAsync();

/**
 * Resets the per-screen haptic budget on each navigation (product 13). Lives as
 * a child of the router so `usePathname` has a navigation context; renders
 * nothing.
 */
function HapticScreenTracker(): null {
  useHapticScreen();
  return null;
}

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
                <HapticScreenTracker />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(onboarding)" />
                  {/* The Letter is a full-screen cover with no chrome (06 §2).
                      The gesture stays ENABLED so she is never trapped; the
                      route intercepts it and offers the pause sheet instead
                      (product 08 §6). */}
                  <Stack.Screen
                    name="letter"
                    options={{ presentation: 'fullScreenModal', gestureEnabled: true }}
                  />
                  {/* The first paywall is a cover too (06 §2). Gesture-dismiss
                      is OFF: the X appears after 2s and is the one way out, so
                      a swipe cannot skip past it before it is even readable.
                      She is never trapped — the X always arrives. */}
                  <Stack.Screen
                    name="paywall"
                    options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
                  />
                  {/* The player is a cover she pulls DOWN to minimize (06 §2),
                      so the dismiss gesture stays on — the route turns it into
                      "minimize" rather than "close", and audio continues. */}
                  <Stack.Screen
                    name="player"
                    options={{ presentation: 'fullScreenModal', gestureEnabled: true }}
                  />
                </Stack>
              </BootGate>
            </BottomSheetModalProvider>
          </QueryClientProvider>
        </MotionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
