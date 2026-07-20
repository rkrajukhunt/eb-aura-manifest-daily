import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { GeneratingRitual } from '@/features/letter/GeneratingRitual';
import { useLetterGeneration } from '@/features/letter/useLetterGeneration';
import { useProfile } from '@/hooks/useProfile';
import { useAppState } from '@/stores/appState';

/**
 * S12 — the generation ritual (06 §1, product 07 S12).
 *
 * The route stays thin (01 §2): it owns only the two things a route should own
 * — who is here, and where she goes next. The ritual itself is a feature
 * component so it can be rendered in a test without a navigator.
 *
 * `replace`, never `push`: the letter must not have the ritual sitting behind it
 * in the stack, or a back-swipe from the wow would land her in a screen that is
 * generating a letter she already has.
 */
export default function GeneratingScreen() {
  const router = useRouter();
  const userId = useAppState((s) => s.userId);
  const { data: profile } = useProfile(userId ?? undefined);
  const { phase, takingLonger, retry } = useLetterGeneration(userId ?? undefined);

  useEffect(() => {
    if (phase === 'ready') router.replace('/letter');
  }, [phase, router]);

  return (
    <GeneratingRitual
      testID="generating"
      name={profile?.name ?? null}
      takingLonger={takingLonger}
      failed={phase === 'failed'}
      onRetry={retry}
    />
  );
}
