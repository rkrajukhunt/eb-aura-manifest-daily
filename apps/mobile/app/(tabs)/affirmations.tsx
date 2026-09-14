import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, ScrollView, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import {
  Card,
  IconTile,
  Label,
  ListRow,
  RowGroup,
  Screen,
  SerifDisplay,
  SkeletonList,
  TextButton,
  useTabBarClearance,
} from '@/components';
import { affirmationsCopy } from '@/copy/affirmations';
import { AffirmationCard } from '@/features/affirmations/AffirmationCard';
import { KeptRow } from '@/features/affirmations/KeptRow';
import { GuidedSheet, type GuidedStep } from '@/features/affirmations/GuidedSheet';
import { useGenerationJob } from '@/features/letter/useGenerationJob';
import { TechniqueSheet } from '@/features/affirmations/TechniqueSheet';
import { captureShareCard, toShareContent } from '@/features/affirmations/shareCard';
import { recordBeat, TECHNIQUES } from '@/features/affirmations/practice';
import { useSpeech } from '@/features/affirmations/useSpeech';
import { LockedFeatureSheet } from '@/features/paywall/LockedFeatureSheet';
import { canUse } from '@/features/paywall/gating';
import { useEntitlement } from '@/features/paywall/useEntitlement';
import {
  useAffirmationCandidates,
  useKeptAffirmations,
  useTodaysAffirmation,
} from '@/features/affirmations/useAffirmations';
import { localDate } from '@/features/gratitude/useGratitude';
import { analytics } from '@/lib/analytics';
import { api } from '@/lib/api';
import { errorCopyFor, errorCopyForKey, errorKeyOf } from '@/lib/errorCopy';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@/stores/appState';
import { haptic } from '@/theme/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

/**
 * The Affirmations tab (product 09 §9.3, v4 layout): today's card on the
 * parchment surface, the guided studio behind a white "Create with Aura" row,
 * then the saved words. Revealing today's card is one of the three ritual
 * beats, so it records progress here (product 09) — the event fires only when
 * all three happen on the same day.
 */
/**
 * How many kept words the tab previews before handing off to the pushed record.
 * Matches Home's recent-moments bound — a tab shows a slice, never an archive.
 */
const SAVED_ROWS = 5;

export default function AffirmationsRoute() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const scale = clampedFontScale();
  const tabBarClearance = useTabBarClearance();
  const userId = useAppState((s) => s.userId);
  const entitlement = useEntitlement();

  const today = useTodaysAffirmation(userId ?? undefined);
  const kept = useKeptAffirmations(userId ?? undefined);
  const candidates = useAffirmationCandidates(userId ?? undefined);

  const guidedRef = useRef<BottomSheetModal>(null);
  const techniqueRef = useRef<BottomSheetModal>(null);
  const lockedRef = useRef<BottomSheetModal>(null);
  const shareRef = useRef<React.ComponentRef<typeof ViewShot>>(null);
  // One generation per pass (09 §9.3b): a fresh key when the studio opens, so a
  // double-submit of the same pass is one job, never two.
  const guidedPassKey = useRef<string>(`guided:${Date.now()}:${Math.random()}`);
  const [step, setStep] = useState<GuidedStep>('goal');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const speech = useSpeech();
  // The guided pass is async: the POST only enqueues a job, so the candidates
  // are not written until it finishes. We poll the job and refetch the candidate
  // rows only once it succeeds — refetching at enqueue (the old bug) always read
  // an empty set and left the sheet stuck on "Writing them…".
  const [guidedJobId, setGuidedJobId] = useState<string | undefined>();
  const guidedJob = useGenerationJob(guidedJobId);
  const [guidedError, setGuidedError] = useState<string | null>(null);

  /**
   * The on-open fallback for today's affirmation (07 §1), mirroring Home's.
   *
   * `api.requestDailyAffirmation` existed with nothing calling it, so the
   * primary path — the `pregenerate-daily` cron — was the ONLY way a daily
   * affirmation ever appeared. A missed sweep left this screen showing
   * yesterday's card indefinitely, with nothing in the app able to recover it.
   *
   * Keyed to her local date on both sides, so repeat opens and a racing cron
   * collapse to one job.
   */
  const [dailyJobId, setDailyJobId] = useState<string | undefined>();
  const dailyJob = useGenerationJob(dailyJobId);
  const dailyTriggered = useRef(false);

  const todayDate = localDate();
  const hasTodays =
    today.data?.created_at !== undefined &&
    localDate(new Date(today.data.created_at)) === todayDate;

  useEffect(() => {
    if (!userId || !today.isSuccess || hasTodays) return;
    if (dailyTriggered.current) return;
    dailyTriggered.current = true;

    void (async () => {
      try {
        const { jobId } = await api.requestDailyAffirmation(todayDate);
        setDailyJobId(jobId);
      } catch {
        // Nothing to say here: yesterday's card is still on screen, which is
        // the designed fallback (product 09 §9.3a — this surface has no empty
        // state). An error banner would be noise over content that is fine.
      }
    })();
  }, [userId, today.isSuccess, hasTodays, todayDate]);

  const dailyStatus = dailyJob.data?.status;
  useEffect(() => {
    if (dailyStatus === 'succeeded') void today.refetch();
  }, [dailyStatus, today]);

  // `affirmations.technique` is a free text column the generator fills; anything
  // unrecognised falls back to identity rather than rendering no chip at all.
  const stored = today.data?.technique;
  const technique = TECHNIQUES.includes(stored as never)
    ? (stored as (typeof TECHNIQUES)[number])
    : 'identity';

  const reveal = useCallback(() => {
    setRevealed(true);
    void haptic('affirmationReveal');
    analytics.capture('affirmation_revealed');

    const { justCompleted } = recordBeat(localDate(), 'affirmation');
    if (justCompleted) analytics.capture('ritual_completed');
  }, []);

  const generate = useCallback(
    (input: Parameters<React.ComponentProps<typeof GuidedSheet>['onGenerate']>[0]) => {
      setBusy(true);
      setGuidedError(null);
      setStep('candidates');
      void api
        .generateGuidedAffirmation(input, guidedPassKey.current)
        .then((res) => {
          analytics.capture('affirmation_generated_guided', {
            goal_area: input.goalArea,
          });
          // Hand off to the poll; busy stays true until the job is terminal.
          setGuidedJobId(res.jobId);
        })
        .catch((error: unknown) => {
          setBusy(false);
          // A lapsed entitlement mid-session: the calm locked sheet, exactly
          // like Home's Manifest row, rather than a red server message.
          if (errorKeyOf(error) === 'entitlement_required') {
            lockedRef.current?.present();
            return;
          }
          setGuidedError(errorCopyFor(error));
        });
    },
    [],
  );

  // When the guided job reaches a terminal state, stop the spinner. On success
  // the candidate rows now exist, so refetch to render them.
  const guidedStatus = guidedJob.data?.status;
  useEffect(() => {
    if (!guidedStatus) return;
    if (guidedStatus === 'succeeded') void candidates.refetch();

    // A failed pass wrote no candidate rows, so the candidate step would render
    // its title over an empty panel with nothing to tap — a dead end she can
    // only escape by dismissing the sheet and starting over. Say what happened
    // and put her back on the goal step, where she can generate again.
    if (guidedStatus === 'failed' || guidedStatus === 'qa_failed') {
      setGuidedError(errorCopyForKey('generation_failed'));
      setStep('goal');
      // Clearing the id stops the poll; a retry sets a fresh one.
      setGuidedJobId(undefined);
    }

    if (guidedStatus === 'succeeded' || guidedStatus === 'failed' || guidedStatus === 'qa_failed') {
      setBusy(false);
    }
  }, [guidedStatus, candidates]);

  /**
   * Share-as-image (product 09 §9.3).
   *
   * Captures the card she is looking at rather than a parallel export layout —
   * a second layout would drift from the real card within a release or two. The
   * content passes through `toShareContent`, whose narrow return type is what
   * guarantees only the affirmation text leaves the device (product 18).
   */
  const share = useCallback(async () => {
    if (!today.data || !shareRef.current) return;

    const content = toShareContent({ affirmation: today.data.text });

    // v4 puts the actions ON the card, and the capture photographs that view —
    // so they come off for one frame, or they ride into the shared image.
    speech.stop();
    setCapturing(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const uri = await captureShareCard(shareRef.current as never);
      await Share.share({ url: uri, message: content.affirmation });
    } finally {
      setCapturing(false);
    }

    analytics.capture('affirmation_shared', { format: 'image' });
  }, [today.data, speech]);

  /**
   * Keep / un-keep today's affirmation.
   *
   * `saved_at` is one of the columns her own JWT may update on `affirmations`
   * (02 §5 grants), so this is a direct write like the moment's keep mark.
   */
  const favorite = useCallback(async () => {
    const row = today.data;
    if (!row) return;

    await supabase
      .from('affirmations')
      .update({ saved_at: row.saved_at ? null : new Date().toISOString() })
      .eq('id', row.id);

    void haptic('favorite');
    await today.refetch();
    await kept.refetch();
  }, [today, kept]);

  const keep = useCallback(
    (candidateId: string) => {
      setGuidedError(null);
      api
        .keepAffirmation(candidateId)
        .then(() => {
          analytics.capture('affirmation_saved');
          guidedRef.current?.dismiss();
          void kept.refetch();
          void candidates.refetch();
        })
        // Without this the request rejected unhandled and the failure surfaced
        // as a redbox with a Java stack trace — a technical string reaching the
        // surface, which 05 §8 forbids. She keeps the sheet and a line she can
        // act on instead.
        .catch((error: unknown) => setGuidedError(errorCopyFor(error)));
    },
    [kept, candidates],
  );

  // "Today · July 22" — the device's own month-day words, no invented format.
  const dateLabel = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  const keptItems = kept.data ?? [];

  return (
    <Screen testID="affirmations" edgeToEdge>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          // The tab bar floats over this screen and reserves nothing, so the
          // last kept card ends up underneath it without this. The other three
          // tab screens already do the same.
          paddingBottom: tabBarClearance,
        }}
      >
        <SerifDisplay variant="title">{affirmationsCopy.title}</SerifDisplay>

        {today.data && (
          <ViewShot ref={shareRef} options={{ format: 'png', quality: 1 }}>
            <AffirmationCard
              text={today.data.text}
              // The generator stores a technique per card; identity is the default
              // form the prompt asks for (product 09 §9.3a), so an older row with
              // none still gets a chip rather than silently losing the layer.
              technique={technique}
              // v4's second chip. Only rendered when the row actually carries a
              // goal area — a fabricated provenance would be worse than none.
              sourceWord={today.data.goal_area}
              dateLabel={dateLabel}
              revealed={revealed}
              favorited={today.data.saved_at !== null}
              capturing={capturing}
              onReveal={reveal}
              onFavorite={() => void favorite()}
              onTechnique={() => {
                analytics.capture('technique_chip_opened', { technique });
                techniqueRef.current?.present();
              }}
              // The DEVICE voice reads it — affirmations have no synthesized
              // audio (10 §7), and this is the one way to honour v4's button
              // without a per-card vendor bill.
              onHear={() => speech.toggle(today.data?.text ?? '')}
              hearing={speech.speaking}
              onShare={() => void share()}
              testID="affirmation-today"
            />
          </ViewShot>
        )}

        {revealed && (
          <Text
            testID="affirmation-enough"
            style={[typography.bodySmall, { color: colors.text.secondary, textAlign: 'center' }]}
          >
            {affirmationsCopy.enough}
          </Text>
        )}

        <RowGroup separatorInset="leading">
          <ListRow
            title={affirmationsCopy.create}
            subtitle={affirmationsCopy.createSubtitle}
            leading={<IconTile tint="orb" />}
            trailing={
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                allowFontScaling={false}
                style={[scaledType('body', scale), { color: colors.cta.link }]}
              >
                ›
              </Text>
            }
            onPress={() => {
              // The guided studio is the premium creation surface (each pass is
              // three flagship candidates). Free tier keeps today's one daily
              // affirmation — the calm locked sheet explains that, never a dead tap.
              if (!canUse('guided_affirmation', entitlement)) {
                analytics.capture('locked_feature_touched', {
                  feature: 'guided_affirmation',
                });
                lockedRef.current?.present();
                return;
              }
              setStep('goal');
              setGuidedError(null);
              // Fresh pass key: a double-submit of THIS pass is one job. Next
              // open is a new pass and may legitimately generate again.
              guidedPassKey.current = `guided:${Date.now()}:${Math.random()}`;
              guidedRef.current?.present();
            }}
            testID="affirmations-create"
          />
        </RowGroup>

        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Label>{`${affirmationsCopy.savedLabel} · ${keptItems.length}`}</Label>

          {kept.isLoading ? (
            <SkeletonList rows={3} rowHeight={72} testID="affirmations-saved-loading" />
          ) : keptItems.length === 0 ? (
            <Card variant="solid">
              <Text
                testID="affirmations-collection-empty"
                style={[typography.body, { color: colors.text.secondary }]}
              >
                {affirmationsCopy.collectionEmpty}
              </Text>
            </Card>
          ) : (
            keptItems.slice(0, SAVED_ROWS).map((item) => <KeptRow key={item.id} text={item.text} />)
          )}

          {/* Only once the preview stops showing all of them — with five or
              fewer there is nothing further to open, and the label would be
              pointing at the list she is already reading. */}
          {keptItems.length > SAVED_ROWS && (
            <TextButton
              title={affirmationsCopy.allSaved}
              onPress={() => router.push('/affirmations/saved')}
              testID="affirmations-all-saved"
            />
          )}
        </View>
      </ScrollView>

      <TechniqueSheet ref={techniqueRef} technique={technique} today={localDate()} />

      <GuidedSheet
        ref={guidedRef}
        step={step}
        busy={busy}
        candidates={(candidates.data ?? []).map((c) => ({
          id: c.id,
          text: c.text,
          whyLine: c.why_line,
        }))}
        error={guidedError}
        onGenerate={generate}
        onKeep={keep}
      />

      <LockedFeatureSheet
        ref={lockedRef}
        feature="guided_affirmation"
        onSeePlans={() => {
          lockedRef.current?.dismiss();
          router.push('/paywall?from=settings');
        }}
        onDismiss={() => lockedRef.current?.dismiss()}
      />
    </Screen>
  );
}
