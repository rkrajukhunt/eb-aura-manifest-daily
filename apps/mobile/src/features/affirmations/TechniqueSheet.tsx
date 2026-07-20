import type { TechniqueName } from '@aura/shared';
import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Sheet } from '@/components';
import { affirmationsCopy } from '@/copy/affirmations';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

import {
  increment,
  isPracticeComplete,
  loadPractice,
  PRACTICE_TARGETS,
  savePractice,
  type PracticeBlock,
  type PracticeState,
} from './practice';

export interface TechniqueSheetProps {
  technique: TechniqueName;
  today: string;
}

/**
 * The technique layer (product 09 §9.3c) — the education wedge.
 *
 * Every technique explains WHY the phrasing works, grounded in a real mechanism
 * rather than mysticism. That explanation is the differentiator: no competitor
 * tells her why her affirmation is worded the way it is, and product 14 bans
 * the alternative vocabulary outright.
 *
 * 369 gets a real counter because it is a practice rather than a fact. The
 * counter resets daily and carries no failure forward — see `practice.ts`.
 */
export const TechniqueSheet = forwardRef<BottomSheetModal, TechniqueSheetProps>(
  function TechniqueSheet({ technique, today }, ref) {
    const { colors, spacing } = useTheme();
    const scale = clampedFontScale();
    const [practice, setPractice] = useState<PracticeState>(() => loadPractice(today));

    const copy = affirmationsCopy.techniques[technique];

    const tap = (block: PracticeBlock) => {
      const next = increment(practice, block);
      savePractice(next);
      setPractice(next);

      if (isPracticeComplete(next)) {
        analytics.capture('technique_practice_completed', { technique });
      }
    };

    return (
      <Sheet ref={ref} snapPoints={['48%']}>
        <BottomSheetView
          style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md }}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: 'Fraunces_400Regular',
              fontSize: 22 * scale,
              color: colors.text.primary,
            }}
          >
            {copy.label}
          </Text>

          <Text
            testID="technique-why"
            allowFontScaling={false}
            style={{ fontSize: 15 * scale, lineHeight: 23 * scale, color: colors.text.secondary }}
          >
            {copy.why}
          </Text>

          {technique === 'three_six_nine' && (
            <View style={{ gap: spacing.sm }} testID="practice-369">
              {(Object.keys(PRACTICE_TARGETS) as PracticeBlock[]).map((block) => (
                <Pressable
                  key={block}
                  accessibilityRole="button"
                  accessibilityLabel={affirmationsCopy.techniques.three_six_nine[block]}
                  onPress={() => tap(block)}
                  testID={`practice-${block}`}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.sm,
                  }}
                >
                  <Text style={{ fontSize: 15 * scale, color: colors.text.primary }}>
                    {affirmationsCopy.techniques.three_six_nine[block]}
                  </Text>
                  <Text style={{ fontSize: 15 * scale, color: colors.cta.background }}>
                    {practice[block]} / {PRACTICE_TARGETS[block]}
                  </Text>
                </Pressable>
              ))}

              {isPracticeComplete(practice) && (
                <Text testID="practice-done" style={{ color: colors.text.secondary }}>
                  {affirmationsCopy.techniques.three_six_nine.done}
                </Text>
              )}
            </View>
          )}

          {technique === 'scripting' && (
            <Text
              testID="technique-scripting-prompt"
              allowFontScaling={false}
              style={{ fontSize: 15 * scale, color: colors.text.primary }}
            >
              {affirmationsCopy.techniques.scripting.prompt}
            </Text>
          )}
        </BottomSheetView>
      </Sheet>
    );
  },
);
