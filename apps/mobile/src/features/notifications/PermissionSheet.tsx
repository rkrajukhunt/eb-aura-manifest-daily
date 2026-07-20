import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef } from 'react';
import { Text, View } from 'react-native';

import { PillButton, Sheet, TextButton } from '@/components';
import { notificationsCopy } from '@/copy/notifications';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

export interface PermissionSheetProps {
  /** Her arrival time from S11, e.g. "07:00". */
  arrivalTime: string;
  onAllow: () => void;
  onLater: () => void;
}

/**
 * The banked-context permission sheet (11 §2).
 *
 * She chose an arrival time at S11 and saw NO OS dialog then — deliberately.
 * By the time this appears she has finished onboarding, heard her letter and
 * passed the paywall, so the ask can simply remind her of her own earlier
 * decision instead of making a case for itself. That is the whole reason the
 * dialog was deferred this far.
 *
 * "Not now" is a real answer: the product works without notifications, and
 * denial costs her one quiet hint a week at most (11 §2).
 */
export const PermissionSheet = forwardRef<BottomSheetModal, PermissionSheetProps>(
  function PermissionSheet({ arrivalTime, onAllow, onLater }, ref) {
    const { colors, spacing } = useTheme();
    const scale = clampedFontScale();

    return (
      <Sheet ref={ref} snapPoints={['40%']}>
        <BottomSheetView
          style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md }}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: 'Fraunces_400Regular',
              fontSize: 22 * scale,
              lineHeight: 30 * scale,
              color: colors.text.primary,
            }}
          >
            {notificationsCopy.permission.title.replace('{time}', arrivalTime)}
          </Text>

          <Text
            allowFontScaling={false}
            style={{ fontSize: 15 * scale, lineHeight: 22 * scale, color: colors.text.secondary }}
          >
            {notificationsCopy.permission.body}
          </Text>

          <PillButton
            title={notificationsCopy.permission.allow}
            onPress={onAllow}
            testID="permission-allow"
          />

          <View style={{ alignItems: 'center' }}>
            <TextButton
              title={notificationsCopy.permission.later}
              onPress={onLater}
              testID="permission-later"
            />
          </View>
        </BottomSheetView>
      </Sheet>
    );
  },
);
