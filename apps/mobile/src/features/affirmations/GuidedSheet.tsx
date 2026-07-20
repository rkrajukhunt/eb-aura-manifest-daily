import type { AffirmationTone } from '@aura/shared';
import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Chip, Input, PillButton, SerifDisplay, TextButton } from '@/components';
import { Sheet } from '@/components';
import { affirmationsCopy } from '@/copy/affirmations';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

export type GuidedStep = 'goal' | 'feeling' | 'tone' | 'candidates';

export interface GuidedCandidate {
  id: string;
  text: string;
  whyLine: string | null;
}

export interface GuidedSheetProps {
  step: GuidedStep;
  candidates: GuidedCandidate[];
  busy?: boolean;
  onGenerate: (input: {
    goalArea: string;
    goalText?: string;
    feeling: string;
    tone: AffirmationTone;
  }) => void;
  onKeep: (candidateId: string) => void;
  onStep: (step: GuidedStep) => void;
}

const TONES: AffirmationTone[] = ['gentle', 'bold', 'grounded'];

/**
 * The guided studio (product 09 §9.3b).
 *
 * Three short questions, then three candidates each carrying its own why-line —
 * the education layer no competitor has. The selections are kept in sheet state
 * rather than a store on purpose: product 09's edge case says an abandoned flow
 * keeps its draft for the SESSION, not forever, and sheet state expresses that
 * exactly without anything to clean up.
 *
 * There is deliberately no "regenerate": one set per pass is the documented cost
 * cap, and three candidates is already three generations.
 */
export const GuidedSheet = forwardRef<BottomSheetModal, GuidedSheetProps>(function GuidedSheet(
  { step, candidates, busy = false, onGenerate, onKeep, onStep },
  ref,
) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const [goalArea, setGoalArea] = useState<string | null>(null);
  const [goalText, setGoalText] = useState('');
  const [feeling, setFeeling] = useState<string | null>(null);

  const label = (text: string) => <SerifDisplay variant="title">{text}</SerifDisplay>;

  return (
    <Sheet ref={ref} snapPoints={['70%']}>
      <BottomSheetView
        style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md }}
      >
        {step === 'goal' && (
          <View style={{ gap: spacing.md }} testID="guided-goal">
            {label(affirmationsCopy.guided.goalTitle)}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {affirmationsCopy.guided.goalAreas.map((area) => (
                <Chip
                  key={area}
                  label={area}
                  selected={goalArea === area}
                  onPress={() => setGoalArea(area)}
                />
              ))}
            </View>

            <Input
              value={goalText}
              onChangeText={setGoalText}
              placeholder={affirmationsCopy.guided.goalPlaceholder}
              testID="guided-goal-text"
            />

            <PillButton
              title={affirmationsCopy.guided.next}
              disabled={goalArea === null && goalText.trim() === ''}
              onPress={() => onStep('feeling')}
              testID="guided-goal-next"
            />
          </View>
        )}

        {step === 'feeling' && (
          <View style={{ gap: spacing.md }} testID="guided-feeling">
            {label(affirmationsCopy.guided.feelingTitle)}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {affirmationsCopy.guided.feelings.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={feeling === option}
                  onPress={() => setFeeling(option)}
                />
              ))}
            </View>

            <PillButton
              title={affirmationsCopy.guided.next}
              disabled={feeling === null}
              onPress={() => onStep('tone')}
              testID="guided-feeling-next"
            />
            <View style={{ alignItems: 'center' }}>
              <TextButton
                title={affirmationsCopy.guided.back}
                onPress={() => onStep('goal')}
                testID="guided-feeling-back"
              />
            </View>
          </View>
        )}

        {step === 'tone' && (
          <View style={{ gap: spacing.md }} testID="guided-tone">
            {label(affirmationsCopy.guided.toneTitle)}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {TONES.map((tone) => (
                <Chip
                  key={tone}
                  label={affirmationsCopy.guided.tones[tone]}
                  selected={false}
                  onPress={() =>
                    onGenerate({
                      goalArea: goalArea ?? 'Confidence',
                      ...(goalText.trim() ? { goalText: goalText.trim() } : {}),
                      feeling: feeling ?? 'Calm',
                      tone,
                    })
                  }
                />
              ))}
            </View>

            <View style={{ alignItems: 'center' }}>
              <TextButton
                title={affirmationsCopy.guided.back}
                onPress={() => onStep('feeling')}
                testID="guided-tone-back"
              />
            </View>
          </View>
        )}

        {step === 'candidates' && (
          <View style={{ gap: spacing.md }} testID="guided-candidates">
            {label(affirmationsCopy.guided.candidatesTitle)}

            {busy && (
              <Text
                testID="guided-generating"
                allowFontScaling={false}
                style={{ fontSize: 15 * scale, color: colors.text.secondary }}
              >
                {affirmationsCopy.guided.generating}
              </Text>
            )}

            {candidates.map((candidate) => (
              <View
                key={candidate.id}
                style={{ gap: spacing.xs }}
                testID={`candidate-${candidate.id}`}
              >
                <SerifDisplay variant="momentTitle">{candidate.text}</SerifDisplay>

                {candidate.whyLine && (
                  <Text
                    allowFontScaling={false}
                    style={{ fontSize: 13 * scale, color: colors.text.secondary }}
                  >
                    {candidate.whyLine}
                  </Text>
                )}

                <PillButton
                  title={affirmationsCopy.keep}
                  onPress={() => onKeep(candidate.id)}
                  testID={`candidate-keep-${candidate.id}`}
                />
              </View>
            ))}
          </View>
        )}
      </BottomSheetView>
    </Sheet>
  );
});
