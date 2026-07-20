import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components';
import { LetterScreen } from '@/features/letter/LetterScreen';
import { PauseSheet } from '@/features/letter/PauseSheet';
import { keepLetter, markLetterSeen } from '@/features/letter/keepLetter';
import { useLetter } from '@/features/letter/useLetter';
import { useAppState } from '@/stores/appState';
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
  const { data: letter } = useLetter(userId ?? undefined);
  const sheetRef = useRef<BottomSheetModal>(null);
  const leaving = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (leaving.current) return;
      event.preventDefault();
      sheetRef.current?.present();
    });
    return unsubscribe;
  }, [navigation]);

  const leave = useCallback(() => {
    leaving.current = true;
    markLetterSeen();
    // Phase 10 puts the paywall here — product 08 sends Continue straight to it,
    // and the paywall inherits this gradient so it reads as the letter's next
    // page. Until that phase exists, Home is the honest destination.
    router.replace('/(tabs)/home');
  }, [router]);

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
