import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, View } from 'react-native';

import { Screen } from '@/components';
import { LetterScreen } from '@/features/letter/LetterScreen';
import { PauseSheet } from '@/features/letter/PauseSheet';
import { keepLetter, markLetterSeen } from '@/features/letter/keepLetter';
import { useLetter } from '@/features/letter/useLetter';
import { useEntitlement } from '@/features/paywall/useEntitlement';
import { useAppState } from '@/stores/appState';
import { analytics } from '@/lib/analytics';
import { haptic } from '@/theme/haptics';
import { LetterMotionProvider } from '@/theme/motion';

/**
 * `/letter` — the full-screen cover (06 §1, §2).
 *
 * Wrapped in `LetterMotionProvider` so everything inside breathes 20% slower
 * than the utility world (product 13 §4: slow down for emotion). That single
 * provider is why the Letter feels like a different room without any screen
 * inside it knowing about it.
 *
 * Leaving is intercepted rather than blocked: `beforeRemove` catches every
 * dismissal route — swipe, Android back, programmatic — and offers the pause
 * sheet instead (product 08 §6). "Save for later" then leaves for real.
 */
export default function LetterRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const userId = useAppState((s) => s.userId);
  // Live entitlement decides the hand-off so a mid-session grant or expiry is
  // honoured, not the boot-time snapshot. While RevenueCat is still resolving,
  // fall back to that snapshot — the race-free guarantee stays (see useBoot):
  // the hand-off never depends on useEntitlement resolving in time.
  const { premium: livePremium, loading } = useEntitlement();
  const premium = loading ? useAppState.getState().premium : livePremium;
  const { data: letter } = useLetter(userId ?? undefined);
  // A milestone letter arrives through the same cover (06 §2) but is its own
  // event: D7 retention is measured on whether the week-one letter is actually
  // heard, not on whether the first one was.
  const { momentId } = useLocalSearchParams<{ momentId?: string }>();
  const sheetRef = useRef<BottomSheetModal>(null);
  const leaving = useRef(false);

  useEffect(() => {
    if (momentId && letter?.id === momentId) {
      void haptic('milestoneArrival');
      analytics.capture('milestone_letter_played', { day: 7 });
    }
  }, [momentId, letter?.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (leaving.current) return;
      event.preventDefault();
      sheetRef.current?.present();
    });
    return unsubscribe;
  }, [navigation]);

  /**
   * Android's hardware back, which `beforeRemove` above does NOT cover here.
   *
   * The boot gate REPLACES into this route, so the Letter is usually the only
   * entry in the stack — there is nothing to pop, React Navigation never starts
   * a removal, and the event never fires. Back then fell through to the default
   * handler and dropped her out of the app entirely, mid-letter, with the pause
   * sheet she was supposed to get never appearing (observed on device
   * 2026-07-24).
   *
   * Returning true swallows the press; the sheet is the answer instead, which
   * is what product 08 §6 asks for on every other dismissal route.
   */
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (leaving.current) return false;
      sheetRef.current?.present();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const leave = useCallback(() => {
    leaving.current = true;
    markLetterSeen();
    // The hard gate (2026-08-10): after the letter, Home is reachable only with
    // an active subscription; a non-premium user meets the wall. It inherits this
    // gradient, so it reads as the letter's next page rather than an
    // interruption. Nothing is allowed in between — no permission dialog, no
    // rating prompt (product 08's explicit PRODUCT DECISION).
    router.replace(premium ? '/(tabs)/home' : '/paywall');
  }, [router, premium]);

  const onContinue = useCallback(() => {
    if (letter) void keepLetter(letter.id);
    leave();
  }, [letter, leave]);

  return (
    <LetterMotionProvider>
      {letter ? (
        <View style={{ flex: 1 }}>
          <LetterScreen testID="letter" letter={letter} onContinue={onContinue} />
          <PauseSheet
            ref={sheetRef}
            onResume={() => sheetRef.current?.dismiss()}
            onSaveForLater={() => {
              sheetRef.current?.dismiss();
              if (letter) void keepLetter(letter.id);
              leave();
            }}
          />
        </View>
      ) : (
        // The row is written before this route is ever reached, so this is a
        // sub-second gap, not a state she waits in. Quiet, never a spinner.
        <Screen testID="letter-loading" edgeToEdge>
          <View style={{ flex: 1 }} />
        </Screen>
      )}
    </LetterMotionProvider>
  );
}
