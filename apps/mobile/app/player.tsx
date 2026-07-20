import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { RefineSheet } from '@/features/moments/RefineSheet';
import { LockedFeatureSheet } from '@/features/paywall/LockedFeatureSheet';
import { canUse } from '@/features/paywall/gating';
import { useEntitlement } from '@/features/paywall/useEntitlement';
import { PlayerScreen } from '@/features/player/PlayerScreen';
import { usePlayerStore } from '@/features/player/playerStore';
import { usePlayback } from '@/features/player/usePlayback';
import { analytics } from '@/lib/analytics';
import { api } from '@/lib/api';
import { errorCopyFor, errorKeyOf } from '@/lib/errorCopy';
import { supabase } from '@/lib/supabase';

/**
 * `/player` — the full-screen cover (06 §1, §2).
 *
 * Minimizing goes back rather than closing: the store keeps the moment loaded
 * and the mini-player picks it up above the tab bar, which is what makes audio
 * continue while she moves around the app.
 */
export default function PlayerRoute() {
  const router = useRouter();
  const entitlement = useEntitlement();
  const moment = usePlayerStore((s) => s.moment);
  const minimize = usePlayerStore((s) => s.minimize);

  const playback = usePlayback();
  const refineRef = useRef<BottomSheetModal>(null);
  const lockedRef = useRef<BottomSheetModal>(null);
  const [busy, setBusy] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  const onMinimize = useCallback(() => {
    playback.reportDropOff();
    minimize();
    router.back();
  }, [playback, minimize, router]);

  const onFavorite = useCallback(async () => {
    if (!moment) return;
    // Favourites beyond the Letter are premium (12 §4).
    if (!canUse('favorites', entitlement)) {
      lockedRef.current?.present();
      return;
    }

    await supabase
      .from('moments')
      .update({ favorited_at: moment.favoritedAt ? null : new Date().toISOString() })
      .eq('id', moment.id);

    analytics.capture('moment_favorited');
  }, [moment, entitlement]);

  const onRefine = useCallback(() => {
    if (!canUse('refine', entitlement)) {
      lockedRef.current?.present();
      return;
    }
    refineRef.current?.present();
  }, [entitlement]);

  return (
    <>
      <PlayerScreen
        testID="player"
        onToggle={playback.toggle}
        onBack15={playback.back15}
        onForward15={playback.forward15}
        onFavorite={() => void onFavorite()}
        onRefine={onRefine}
        onMinimize={onMinimize}
        // A moment that is itself a refinement cannot be refined again — the cap
        // is on the lineage (product 09 §9.1), and the server enforces it too.
        canRefine={moment?.refineOf === null}
      />

      <RefineSheet
        ref={refineRef}
        busy={busy}
        error={refineError}
        onSubmit={(direction, note) => {
          if (!moment) return;
          setBusy(true);
          setRefineError(null);
          void api
            .refineMoment(moment.id, direction, note)
            .then(() => {
              analytics.capture('moment_refined', { direction });
              refineRef.current?.dismiss();
            })
            .catch((error: unknown) => {
              if (errorKeyOf(error) === 'entitlement_required') {
                refineRef.current?.dismiss();
                lockedRef.current?.present();
                return;
              }
              setRefineError(errorCopyFor(error));
            })
            .finally(() => setBusy(false));
        }}
      />

      <LockedFeatureSheet
        ref={lockedRef}
        feature="refine"
        onSeePlans={() => {
          lockedRef.current?.dismiss();
          router.push('/paywall');
        }}
        onDismiss={() => lockedRef.current?.dismiss()}
      />
    </>
  );
}
