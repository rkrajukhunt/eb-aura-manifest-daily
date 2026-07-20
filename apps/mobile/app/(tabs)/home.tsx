import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Screen } from '@/components';
import { HomeScreen } from '@/features/moments/HomeScreen';
import { ManifestSheet } from '@/features/moments/ManifestSheet';
import { resolveHomeMoment } from '@/features/moments/momentState';
import {
  localDateToday,
  useFormingMoments,
  useRecentMoments,
  useTodaysMoment,
} from '@/features/moments/useMoments';
import { PermissionSheet } from '@/features/notifications/PermissionSheet';
import { markPermissionAsked, shouldAskPermission } from '@/features/notifications/permissionGate';
import { requestPermissionAndRegister } from '@/features/notifications/useNotifications';
import { hasSeenPaywall } from '@/features/paywall/paywallSeen';
import { LockedFeatureSheet } from '@/features/paywall/LockedFeatureSheet';
import { canUse } from '@/features/paywall/gating';
import { useEntitlement } from '@/features/paywall/useEntitlement';
import { usePlayerStore } from '@/features/player/playerStore';
import { useProfile } from '@/hooks/useProfile';
import { LIMITS } from '@aura/shared';

import { analytics } from '@/lib/analytics';
import { api } from '@/lib/api';
import { errorCopyFor, errorKeyOf } from '@/lib/errorCopy';
import { useAppState } from '@/stores/appState';

/**
 * Home (product 11). The route stays thin: it resolves which state to show and
 * owns navigation, while `HomeScreen` is pure presentation — so every state can
 * be rendered in a test without a navigator or a network.
 */
export default function HomeRoute() {
  const router = useRouter();
  const userId = useAppState((s) => s.userId);
  const { data: profile } = useProfile(userId ?? undefined);
  const entitlement = useEntitlement();

  const today = useTodaysMoment(userId ?? undefined);
  const forming = useFormingMoments(userId ?? undefined);
  const recent = useRecentMoments(userId ?? undefined);

  const open = usePlayerStore((s) => s.open);
  const manifestRef = useRef<BottomSheetModal>(null);
  const lockedRef = useRef<BottomSheetModal>(null);
  const permissionRef = useRef<BottomSheetModal>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [manifestError, setManifestError] = useState<string | null>(null);
  // Seeded from the shared default and corrected by the server's answer on every
  // manifest (07 §1 returns `creditsRemaining`). Optimistic by design — 12 §4
  // makes the server the authority, so a stale local number costs at most one
  // honest 429 that the sheet now renders.
  const [credits, setCredits] = useState<number>(LIMITS.MANIFEST_WEEKLY_LIMIT);

  // The permission ask lands HERE — the first Home landing after the paywall
  // (11 §2), which is the earliest moment product 08's "nothing between the
  // letter and the paywall" rule stops applying.
  useEffect(() => {
    if (shouldAskPermission(hasSeenPaywall())) permissionRef.current?.present();
  }, []);

  const state = resolveHomeMoment({
    latest: today.data ?? null,
    latestScheduledFor: null,
    today: localDateToday(),
    generating: today.isFetching,
    failed,
  });

  const play = useCallback(
    (momentId: string) => {
      const moment = today.data;
      if (moment?.id !== momentId) return;
      open(moment);
      router.push('/player');
    },
    [today.data, open, router],
  );

  const retry = useCallback(async () => {
    setFailed(false);
    try {
      await api.requestMoment(localDateToday());
      await today.refetch();
    } catch {
      setFailed(true);
    }
  }, [today]);

  const onManifest = useCallback(() => {
    // Manifest is premium (12 §4). The locked sheet is calm and never a
    // full-screen interrupt.
    if (!canUse('manifest_anything', entitlement)) {
      lockedRef.current?.present();
      return;
    }
    manifestRef.current?.present();
  }, [entitlement]);

  return (
    <Screen testID="home" edgeToEdge>
      <HomeScreen
        name={profile?.name ?? null}
        state={state}
        forming={forming.data ?? []}
        recent={recent.data ?? []}
        onPlay={play}
        onRetry={() => void retry()}
        onManifest={onManifest}
      />

      <ManifestSheet
        ref={manifestRef}
        creditsRemaining={credits}
        error={manifestError}
        busy={busy}
        onSubmit={(desireText) => {
          setBusy(true);
          setManifestError(null);
          void api
            .manifest(desireText)
            .then((result) => {
              analytics.capture('manifest_anything_created', {
                credits_remaining: result.creditsRemaining,
              });
              setCredits(result.creditsRemaining);
              manifestRef.current?.dismiss();
            })
            .catch((error: unknown) => {
              // Every documented failure lands here now: 402, 429 credits,
              // 422 crisis. Before this, all three did nothing at all.
              if (errorKeyOf(error) === 'entitlement_required') {
                manifestRef.current?.dismiss();
                lockedRef.current?.present();
                return;
              }
              if (errorKeyOf(error) === 'credits_exhausted') setCredits(0);
              setManifestError(errorCopyFor(error));
            })
            .finally(() => setBusy(false));
        }}
      />

      <PermissionSheet
        ref={permissionRef}
        arrivalTime={profile?.arrival_time ?? '07:00'}
        onAllow={() => {
          markPermissionAsked(true);
          permissionRef.current?.dismiss();
          if (userId) void requestPermissionAndRegister(userId);
        }}
        onLater={() => {
          // Asked and declined is still asked: the dialog never returns
          // uninvited (11 §2). A quiet weekly hint is the only follow-up.
          markPermissionAsked(true);
          permissionRef.current?.dismiss();
        }}
      />

      <LockedFeatureSheet
        ref={lockedRef}
        feature="manifest_anything"
        onSeePlans={() => {
          lockedRef.current?.dismiss();
          router.push('/paywall');
        }}
        onDismiss={() => lockedRef.current?.dismiss()}
      />
    </Screen>
  );
}
