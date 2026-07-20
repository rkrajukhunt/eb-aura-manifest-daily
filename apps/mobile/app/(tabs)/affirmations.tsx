import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card, PillButton, Screen, SerifDisplay } from '@/components';
import { affirmationsCopy } from '@/copy/affirmations';
import { AffirmationCard } from '@/features/affirmations/AffirmationCard';
import { GuidedSheet, type GuidedStep } from '@/features/affirmations/GuidedSheet';
import { recordBeat } from '@/features/affirmations/practice';
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
  const [step, setStep] = useState<GuidedStep>('goal');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);

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
          <AffirmationCard
            text={today.data.text}
            whyLine={today.data.why_line}
            technique={null}
            revealed={revealed}
            onReveal={reveal}
            testID="affirmation-today"
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
