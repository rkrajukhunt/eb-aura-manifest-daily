import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef } from 'react';
import { View } from 'react-native';

import { PillButton, Sheet, TextButton } from '@/components';
import { letterCopy } from '@/copy/letter';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';
import { Text } from 'react-native';

export interface PauseSheetProps {
  onResume: () => void;
  onSaveForLater: () => void;
}

/**
 * The Letter's only escape hatch (product 08 §6).
 *
 * The design rule is exact: "never trap, but never invite exit". So this exists
 * and works — she can always leave — but "Continue listening" is the primary and
 * comes first, and leaving is a quiet text button rather than a second pill.
 * There is no X, no "are you sure", and nothing that argues with her.
 */
export const PauseSheet = forwardRef<BottomSheetModal, PauseSheetProps>(function PauseSheet(
  { onResume, onSaveForLater },
  ref,
) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  return (
    <Sheet ref={ref} snapPoints={['32%']}>
      <BottomSheetView style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: 'Fraunces_400Regular',
            fontSize: 22 * scale,
            lineHeight: 30 * scale,
            color: colors.text.primary,
            textAlign: 'center',
            marginBottom: spacing.lg,
          }}
        >
          {letterCopy.pauseSheet.title}
        </Text>

        <PillButton
          title={letterCopy.pauseSheet.resume}
          onPress={onResume}
          testID="letter-resume"
        />

        <View style={{ alignItems: 'center', marginTop: spacing.md }}>
          <TextButton
            title={letterCopy.pauseSheet.later}
            onPress={onSaveForLater}
            testID="letter-save-for-later"
          />
        </View>
      </BottomSheetView>
    </Sheet>
  );
});
