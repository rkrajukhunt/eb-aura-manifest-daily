import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCallback, useRef, useState } from 'react';
import { Share, ScrollView, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { Card, PillButton, Screen, SerifDisplay, TextButton } from '@/components';
import { affirmationsCopy } from '@/copy/affirmations';
import { AffirmationCard } from '@/features/affirmations/AffirmationCard';
import { GuidedSheet, type GuidedStep } from '@/features/affirmations/GuidedSheet';
import { TechniqueSheet } from '@/features/affirmations/TechniqueSheet';
import { captureShareCard, toShareContent } from '@/features/affirmations/shareCard';
import { recordBeat, TECHNIQUES } from '@/features/affirmations/practice';
import {
  useAffirmationCandidates,
  useKeptAffirmations,
  useTodaysAffirmation,
} from '@/features/affirmations/useAffirmations';
import { localDate } from '@/features/gratitude/useGratitude';
import { analytics } from '@/lib/analytics';
import { api } from '@/lib/api';
import { useAppState } from '@/stores/appState';
import { haptic } from '@/theme/haptics';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The Affirmations tab (product 09 §9.3).
 *
 * Today's card first, then her collection, with the guided studio behind a
 * single CTA. Revealing today's card is one of the three ritual beats, so it
 * records progress here (product 09) — the event fires only when all three
 * happen on the same day.
 */
export default function AffirmationsRoute() {
  const { spacing } = useTheme();
  const userId = useAppState((s) => s.userId);

  const today = useTodaysAffirmation(userId ?? undefined);
  const kept = useKeptAffirmations(userId ?? undefined);
  const candidates = useAffirmationCandidates(userId ?? undefined);

  const guidedRef = useRef<BottomSheetModal>(null);
  const techniqueRef = useRef<BottomSheetModal>(null);
  const shareRef = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [step, setStep] = useState<GuidedStep>('goal');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);

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
      setStep('candidates');
      void api
        .generateGuidedAffirmation(input)
        .then(() => {
          analytics.capture('affirmation_generated_guided', {
            goal_area: input.goalArea,
            tone: input.tone,
          });
          return candidates.refetch();
        })
        .finally(() => setBusy(false));
    },
    [candidates],
  );

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
    const uri = await captureShareCard(shareRef.current as never);

    await Share.share({ url: uri, message: content.affirmation });
    analytics.capture('affirmation_shared', { format: 'image' });
  }, [today.data]);

  const keep = useCallback(
    (candidateId: string) => {
      void api.keepAffirmation(candidateId).then(() => {
        analytics.capture('affirmation_saved');
        guidedRef.current?.dismiss();
        void kept.refetch();
        void candidates.refetch();
      });
    },
    [kept, candidates],
  );

  return (
    <Screen testID="affirmations" edgeToEdge>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <SerifDisplay variant="title">{affirmationsCopy.todayTitle}</SerifDisplay>

        {today.data && (
          <ViewShot ref={shareRef} options={{ format: 'png', quality: 1 }}>
            <AffirmationCard
              text={today.data.text}
              whyLine={today.data.why_line}
              // The generator stores a technique per card; identity is the default
              // form the prompt asks for (product 09 §9.3a), so an older row with
              // none still gets a chip rather than silently losing the layer.
              technique={technique}
              revealed={revealed}
              onReveal={reveal}
              onTechnique={() => {
                analytics.capture('technique_chip_opened', { technique });
                techniqueRef.current?.present();
              }}
              testID="affirmation-today"
            />
          </ViewShot>
        )}

        {revealed && today.data && (
          <TextButton
            title={affirmationsCopy.share}
            onPress={() => void share()}
            testID="affirmation-share"
          />
        )}

        {revealed && (
          <Text testID="affirmation-enough" style={{ textAlign: 'center' }}>
            {affirmationsCopy.enough}
          </Text>
        )}

        <PillButton
          title={affirmationsCopy.create}
          onPress={() => {
            setStep('goal');
            guidedRef.current?.present();
          }}
          testID="affirmations-create"
        />

        <View style={{ gap: spacing.sm }}>
          <SerifDisplay variant="momentTitle">{affirmationsCopy.collectionTitle}</SerifDisplay>

          {(kept.data ?? []).length === 0 ? (
            <Card variant="solid">
              <Text testID="affirmations-collection-empty">{affirmationsCopy.collectionEmpty}</Text>
            </Card>
          ) : (
            (kept.data ?? []).map((item) => (
              <Card key={item.id} variant="solid">
                <Text>{item.text}</Text>
              </Card>
            ))
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
        onStep={setStep}
        onGenerate={generate}
        onKeep={keep}
      />
    </Screen>
  );
}
