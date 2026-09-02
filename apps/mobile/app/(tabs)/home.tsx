import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Screen } from '@/components';
import { momentsCopy } from '@/copy/moments';
import { EXPERIMENTS, ON_OFF_VARIANTS } from '@/features/experiments/keys';
import { useVariant } from '@/features/experiments/useVariant';
import { HomeScreen } from '@/features/moments/HomeScreen';
import { hasSeenFirstRun, markFirstRunSeen } from '@/features/moments/firstRun';
import { ManifestSheet } from '@/features/moments/ManifestSheet';
import { resolveHomeMoment } from '@/features/moments/momentState';
import {
  localDateToday,
  toPlayable,
  useCollectionMoments,
  useFormingMoments,
  useRecentMoments,
  useTodaysMoment,
} from '@/features/moments/useMoments';
import { notificationsCopy } from '@/copy/notifications';
import { PermissionSheet } from '@/features/notifications/PermissionSheet';
import {
  markDeniedHintShown,
  markPermissionAsked,
  shouldAskPermission,
  shouldShowDeniedHint,
} from '@/features/notifications/permissionGate';
import { requestPermissionAndRegister } from '@/features/notifications/useNotifications';
import { formatArrivalTime } from '@/features/notifications/arrivalTime';
import { hasSeenPaywall } from '@/features/paywall/paywallSeen';
import { LockedFeatureSheet } from '@/features/paywall/LockedFeatureSheet';
import { canUse } from '@/features/paywall/gating';
import { useEntitlement } from '@/features/paywall/useEntitlement';
import { usePlayerStore } from '@/features/player/playerStore';
import { readEntries } from '@/features/gratitude/gratitudeStore';
import { useStreakStore } from '@/features/streak/streakStore';
import { isTerminalJobStatus, useGenerationJob } from '@/features/letter/useGenerationJob';
import { useProfile } from '@/hooks/useProfile';
import { LIMITS } from '@aura/shared';

import { analytics } from '@/lib/analytics';
import { api } from '@/lib/api';
import { errorCopyFor, errorCopyForKey, errorKeyOf } from '@/lib/errorCopy';
import { requestTrackingPermission } from '@/lib/tracking';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@/stores/appState';
import { haptic } from '@/theme/haptics';

/** Home's "Recently played" shows this many rows; the rest live in collections. */
const RECENT_ROWS = 5;
/** Wide enough to count favourites and on-demand moments for the grid (v4 §home). */
const COLLECTION_SCAN_LIMIT = 50;

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

  useEffect(() => {
    if (!entitlement.loading && !entitlement.premium) {
      router.replace('/paywall');
    }
  }, [entitlement.loading, entitlement.premium, router]);

  const today = useTodaysMoment(userId ?? undefined);
  const forming = useFormingMoments(userId ?? undefined);
  const recent = useRecentMoments(userId ?? undefined, RECENT_ROWS);
  // Collections count what she owns (kept / on-demand), played or not — the
  // "Recently played" list above is the only surface that needs `played_at`.
  const collections = useCollectionMoments(userId ?? undefined, COLLECTION_SCAN_LIMIT);

  // Selected individually so Home re-renders on a count change but not on the
  // store's other fields.
  const streak = useStreakStore((s) => s.state);
  const lastOutcome = useStreakStore((s) => s.lastOutcome);
  const seedStreak = useStreakStore((s) => s.seed);

  /**
   * Seed the count from days she has already lived, once.
   *
   * Home is where the count is shown, so it is where the backfill belongs —
   * seeding only inside the Gratitude tab would leave anyone who never opens
   * that tab looking at a zero underneath a week of filled dots. `seed` refuses
   * to run once anything has been counted, so this is safe on every mount.
   */
  useEffect(() => {
    seedStreak(Object.keys(readEntries()));
  }, [seedStreak]);

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
  const [deniedHint, setDeniedHint] = useState(false);
  // The one-time first-Home welcome card (2026-08-10) — the calm equivalent of
  // Glow's post-onboarding tutorial. Shown once, then dismissed for good.
  const [showFirstRun, setShowFirstRun] = useState(() => !hasSeenFirstRun());

  // home-first-run experiment (2026-08-14) — the reference wiring for useVariant.
  // `control` (shipped) shows the welcome card; `off` hides it, to test whether a
  // leaner first Home lifts activation. Reading the flag makes PostHog emit
  // `$feature_flag_called` (the exposure); `firstrun_welcome_*` are the typed
  // outcome events the Experiments dashboard breaks down by `$feature/home-first-run`.
  const firstRunVariant = useVariant(EXPERIMENTS.homeFirstRun, 'control', ON_OFF_VARIANTS);
  const showFirstRunCard = showFirstRun && firstRunVariant === 'control';
  const firstRunReportedRef = useRef(false);

  // The legible "why" under today's moment — named from a value she chose in
  // onboarding, so the personalization she can't see (Living Memory) is felt.
  const topValue = profile?.values?.[0];
  const personalization = topValue
    ? momentsCopy.home.personalization.replace('{value}', topValue.toLowerCase())
    : null;

  // Report the first-Home welcome exposure once, the first time the card actually
  // shows (control variant + not yet seen). Flags load async, so this can fire a
  // render or two after mount; the ref guards against a double count. Dismissing
  // flips `showFirstRunCard` false and must not re-fire.
  useEffect(() => {
    if (showFirstRunCard && !firstRunReportedRef.current) {
      firstRunReportedRef.current = true;
      analytics.capture('firstrun_welcome_shown', {});
    }
  }, [showFirstRunCard]);

  // iOS ad-attribution consent (spec §7). Asked once, on the first Home landing
  // after the Letter/paywall — never mid-onboarding. No-op on Android and after
  // any prior decision. Kept separate from the notification ask below so the two
  // stay independent.
  useEffect(() => {
    void requestTrackingPermission();
  }, []);

  // The permission ask lands HERE — the first Home landing after the paywall
  // (11 §2), which is the earliest moment product 08's "nothing between the
  // letter and the paywall" rule stops applying.
  useEffect(() => {
    if (shouldAskPermission(hasSeenPaywall())) {
      permissionRef.current?.present();
      return;
    }
    // Declined earlier: one quiet line a week, never a re-ask (11 §2).
    if (shouldShowDeniedHint()) {
      setDeniedHint(true);
      markDeniedHintShown();
    }
  }, []);

  const state = resolveHomeMoment({
    latest: today.data ?? null,
    latestScheduledFor: null,
    today: localDateToday(),
    generating: today.isFetching,
    failed,
  });

  /**
   * The on-open fallback (product 09 §9.1, 04 §5).
   *
   * The scheduler pre-generates a daily moment ~30 min before her arrival time,
   * but anyone who opens Home BEFORE that window — most obviously right after
   * onboarding — would otherwise land on an empty first-run Home with no audio.
   * `momentState` and the scheduler both defer to "the on-open fallback" for
   * exactly this gap; this is that fallback. When nothing is here yet, generate
   * today's on demand. The request is keyed to her local date server-side
   * (07 §1), so repeat opens — and a racing cron — collapse to a single job.
   */
  const [fallbackJobId, setFallbackJobId] = useState<string | undefined>();
  const fallbackJob = useGenerationJob(fallbackJobId);
  const fallbackTriggered = useRef(false);

  useEffect(() => {
    if (!userId || !today.isSuccess || state.kind !== 'first_run') return;
    if (fallbackTriggered.current) return;
    fallbackTriggered.current = true;

    void (async () => {
      try {
        const { jobId } = await api.requestMoment(localDateToday());
        setFallbackJobId(jobId);
      } catch (error) {
        // A moment already exists (409): just re-read it. Anything else is a
        // real failure, so Home shows the honest retry rather than spinning.
        if (errorKeyOf(error) === 'already_ready') void today.refetch();
        else setFailed(true);
      }
    })();
  }, [userId, today.isSuccess, state.kind, today]);

  // When the fallback job lands, surface the moment (or the honest failed state).
  const fallbackStatus = fallbackJob.data?.status;
  useEffect(() => {
    if (!fallbackStatus) return;
    if (fallbackStatus === 'succeeded') void today.refetch();
    if (fallbackStatus === 'failed' || fallbackStatus === 'qa_failed') setFailed(true);
  }, [fallbackStatus, today]);

  /**
   * Manifest Anything reveal (product 09 §9.2).
   *
   * `POST /manifest` only ENQUEUES the job, so the on-demand moment is not
   * written when the request returns. Without polling, the sheet dismissed onto
   * an unchanged Home and the moment she just asked for was invisible until the
   * next cold start. We keep the sheet on "Writing it…" until the job lands, then
   * refetch — the new moment is the newest one, so it becomes Home's hero card.
   */
  const [manifestJobId, setManifestJobId] = useState<string | undefined>();
  const manifestJob = useGenerationJob(manifestJobId);
  const manifestStatus = manifestJob.data?.status;
  useEffect(() => {
    // Only react once the job is DONE. The poll reports `queued`/`running` first,
    // and treating those as terminal cleared the job id — killing the poll before
    // it ever saw `succeeded`, so the sheet never closed and the list never
    // refreshed. Stay put until the status is genuinely terminal.
    if (!isTerminalJobStatus(manifestStatus)) return;
    if (manifestStatus === 'succeeded') {
      void today.refetch();
      // A manifest is an on-demand moment, so the On demand collection re-reads.
      void collections.refetch();
      manifestRef.current?.dismiss();
    }
    if (manifestStatus === 'failed' || manifestStatus === 'qa_failed') {
      setManifestError(errorCopyForKey('generation_failed'));
    }
    // Terminal either way: stop the spinner and the poll.
    setManifestJobId(undefined);
    setBusy(false);
  }, [manifestStatus, today, collections]);

  const play = useCallback(
    (momentId: string) => {
      const moment = today.data;
      if (moment?.id === momentId) {
        open(moment);
        router.push('/player');
        return;
      }
      // A recent row: only the slim listing is in memory, so fetch the full
      // moment before handing it to the player — same shape as `collection/[id]`.
      void (async () => {
        const { data } = await supabase
          .from('moments')
          .select('*')
          .eq('id', momentId)
          .maybeSingle();
        if (!data) return;
        open(await toPlayable(data), 'replay');
        router.push('/player');
      })();
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

  /**
   * Keep / un-keep today's moment (12 §4).
   *
   * The same write the player cover does — `favorited_at` is one of the three
   * engagement columns her own JWT may update, so this needs no endpoint. Home's
   * heart rendered that column from the start but was never pressable, which is
   * why keeping only worked from inside the player.
   */
  const onFavorite = useCallback(
    async (momentId: string) => {
      if (!canUse('favorites', entitlement)) {
        lockedRef.current?.present();
        return;
      }

      const current = today.data?.favoritedAt ?? null;
      await supabase
        .from('moments')
        .update({ favorited_at: current ? null : new Date().toISOString() })
        .eq('id', momentId);

      void haptic('favorite');
      await today.refetch();
      // The Favorites collection reads the same column, so it re-reads too.
      await collections.refetch();
    },
    [entitlement, today, collections],
  );

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
        streak={streak}
        lastOutcome={lastOutcome}
        forming={forming.data ?? []}
        recent={(recent.data ?? []).slice(0, RECENT_ROWS).map((m) => ({
          id: m.id,
          title: m.title,
          durationMs: m.duration_ms,
        }))}
        favoritesCount={(collections.data ?? []).filter((m) => m.favorited_at !== null).length}
        onDemandCount={(collections.data ?? []).filter((m) => m.type === 'ondemand').length}
        onPlay={play}
        onRetry={() => void retry()}
        onFavorite={(id) => void onFavorite(id)}
        onManifest={onManifest}
        onCollection={(id) => router.push(`/collection/${id}`)}
        notificationHint={
          deniedHint
            ? notificationsCopy.deniedHint.replace(
                '{time}',
                formatArrivalTime(profile?.arrival_time),
              )
            : null
        }
        personalization={personalization}
        showFirstRun={showFirstRunCard}
        onDismissFirstRun={() => {
          analytics.capture('firstrun_welcome_dismissed', {});
          markFirstRunSeen();
          setShowFirstRun(false);
        }}
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
              // Do NOT dismiss yet — the moment is still being written. Hand off
              // to the poll; the sheet stays on "Writing it…" and closes onto the
              // finished moment (see the manifest reveal effect above). `busy`
              // stays true, so it is only cleared when the job is terminal.
              setManifestJobId(result.jobId);
            })
            .catch((error: unknown) => {
              // Every documented failure lands here now: 402, 429 credits,
              // 422 crisis. Before this, all three did nothing at all.
              if (errorKeyOf(error) === 'entitlement_required') {
                manifestRef.current?.dismiss();
                lockedRef.current?.present();
              } else {
                if (errorKeyOf(error) === 'credits_exhausted') setCredits(0);
                setManifestError(errorCopyFor(error));
              }
              // Only the enqueue failed here; the poll owns the success path's spinner.
              setBusy(false);
            });
        }}
      />

      <PermissionSheet
        ref={permissionRef}
        arrivalTime={formatArrivalTime(profile?.arrival_time)}
        onAllow={() => {
          markPermissionAsked(true);
          permissionRef.current?.dismiss();
          if (!userId) return;

          void (async () => {
            const { granted, registered } = await requestPermissionAndRegister(userId);

            // "Turn them on" used to end here regardless of what happened, so a
            // grant that never produced a push token looked exactly like one
            // that did. Below Android 13 the OS shows no dialog at all, which
            // made the button appear inert even on the happy path. Anything
            // short of a registered token now falls back to the same quiet
            // weekly line a decline gets — never a claim we cannot keep.
            if (granted && registered) return;

            setDeniedHint(true);
            markDeniedHintShown();
          })();
        }}
        onLater={() => {
          // Asked and declined is still asked: the dialog never returns
          // uninvited (11 §2). A quiet weekly hint is the only follow-up.
          markPermissionAsked(true);
          setDeniedHint(true);
          markDeniedHintShown();
          permissionRef.current?.dismiss();
        }}
      />

      <LockedFeatureSheet
        ref={lockedRef}
        feature="manifest_anything"
        onSeePlans={() => {
          lockedRef.current?.dismiss();
          // Same tag Settings uses: she asked for plans, so an absent offering
          // owes her a line rather than a silent bounce back to Home.
          router.push('/paywall?from=settings');
        }}
        onDismiss={() => lockedRef.current?.dismiss()}
      />
    </Screen>
  );
}
