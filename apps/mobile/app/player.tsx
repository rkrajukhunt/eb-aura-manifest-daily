import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { RefineSheet } from '@/features/moments/RefineSheet';
import { fetchMomentById } from '@/features/moments/useMoments';
import { LockedFeatureSheet } from '@/features/paywall/LockedFeatureSheet';
import { canUse } from '@/features/paywall/gating';
import { useEntitlement } from '@/features/paywall/useEntitlement';
import { PlayerScreen } from '@/features/player/PlayerScreen';
import { usePlayerStore } from '@/features/player/playerStore';
import { analytics } from '@/lib/analytics';
import { api } from '@/lib/api';
import { errorCopyFor, errorKeyOf } from '@/lib/errorCopy';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@/stores/appState';

/**
 * `/player` — the full-screen cover (06 §1, §2).
 *
 * Minimizing goes back rather than closing: the store keeps the moment loaded
 * and playback running, which is what makes audio continue while she moves
 * around the app. There is no mini-player — removed by product decision, a
 * departure from v4 — so the way back to a playing moment is its own card on
 * Home rather than a persistent bar.
 */
export default function PlayerRoute() {
  const router = useRouter();
  const entitlement = useEntitlement();
  const moment = usePlayerStore((s) => s.moment);
  const minimize = usePlayerStore((s) => s.minimize);
  // The single AudioPlayer lives in the tab layout's usePlayback; we only drive
  // it. Mounting usePlayback here again would play the moment on a second player.
  const controls = usePlayerStore((s) => s.controls);
  const refineRef = useRef<BottomSheetModal>(null);
  const lockedRef = useRef<BottomSheetModal>(null);
  const [busy, setBusy] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  // Moment-push deep link (`/player?momentId=…`, 06 §5): the store starts empty
  // on a cold-start tap, so fetch the moment this route was asked for and open
  // it. Without this the cover rendered with nothing loaded — a blank player.
  const userId = useAppState((s) => s.userId);
  const { momentId } = useLocalSearchParams<{ momentId?: string }>();

  useEffect(() => {
    if (!userId || !momentId || moment?.id === momentId) return;
    let active = true;
    void fetchMomentById(userId, momentId)
      .then((loaded) => {
        if (!active || !loaded) return;
        usePlayerStore.getState().open(loaded, 'notification');
        // open() swaps the source underneath the shared player; nothing plays
        // until told, so a deep-linked moment must hit play with the new source.
        usePlayerStore.getState().controls?.play();
      })
      .catch(() => {
        // Nothing to play from a bad link; the cover stays quiet rather than
        // erroring on a tap she can't fix.
      });
    return () => {
      active = false;
    };
  }, [userId, momentId, moment?.id]);

  // Playback lives only while the cover is open. Closing it — the chevron, the
  // hardware back, or the swipe-down dismiss — pauses the voice, so nothing plays
  // on in the background; re-opening the cover resumes it. (Departs from the old
  // 06 §2 "keeps playing behind the tab bar" behaviour, by request.)
  useFocusEffect(
    useCallback(() => {
      controls?.play();
      return () => controls?.pause();
    }, [controls]),
  );

  const onMinimize = useCallback(() => {
    controls?.reportDropOff();
    minimize();
    router.back();
  }, [controls, minimize, router]);

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
        onToggle={() => controls?.toggle()}
        onBack15={() => controls?.back15()}
        onForward15={() => controls?.forward15()}
        onSeek={(positionMs) => controls?.seekTo(positionMs)}
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
          // Same tag Settings uses: she asked for plans, so an absent offering
          // owes her a line rather than a silent bounce back to Home.
          router.push('/paywall?from=settings');
        }}
        onDismiss={() => lockedRef.current?.dismiss()}
      />
    </>
  );
}
