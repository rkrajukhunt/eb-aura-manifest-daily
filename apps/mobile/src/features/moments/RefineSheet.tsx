import type { RefineDirection } from '@aura/shared';
import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Input, PillButton, SelectCard, Sheet } from '@/components';
import { momentsCopy } from '@/copy/moments';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

export interface RefineSheetProps {
  onSubmit: (direction: RefineDirection, note?: string) => void;
  busy?: boolean;
}

const DIRECTIONS: RefineDirection[] = ['more_realistic', 'softer', 'more_ambitious', 'note'];

/**
 * Refine (product 09 §9.1).
 *
 * Framed as "how should it change", never as "what was wrong". The moment was
 * written for her from her own words; treating a refine as a defect report
 * would make asking for one feel like a complaint about herself.
 *
 * The free-note direction reveals its field rather than showing an input she
 * has to ignore — three taps for the common case, four for the specific one.
 */
export const RefineSheet = forwardRef<BottomSheetModal, RefineSheetProps>(function RefineSheet(
  { onSubmit, busy = false },
  ref,
) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const [direction, setDirection] = useState<RefineDirection>('more_realistic');
  const [note, setNote] = useState('');

  const needsNote = direction === 'note';

  return (
    <Sheet ref={ref} snapPoints={['56%']}>
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
          {momentsCopy.refine.title}
        </Text>

        <View style={{ gap: spacing.sm }}>
          {DIRECTIONS.map((value) => (
            <View key={value} testID={`refine-${value}`}>
              <SelectCard
                title={momentsCopy.refine[value]}
                selected={direction === value}
                onPress={() => setDirection(value)}
              />
            </View>
          ))}
        </View>

        {needsNote && (
          <Input
            value={note}
            onChangeText={setNote}
            placeholder={momentsCopy.refine.notePlaceholder}
            testID="refine-note"
          />
        )}

        <PillButton
          title={busy ? momentsCopy.refine.working : momentsCopy.refine.submit}
          loading={busy}
          disabled={needsNote && note.trim() === ''}
          onPress={() => onSubmit(direction, needsNote ? note.trim() : undefined)}
          testID="refine-submit"
        />
      </BottomSheetView>
    </Sheet>
  );
});
