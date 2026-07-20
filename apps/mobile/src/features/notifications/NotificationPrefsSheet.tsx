import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef } from 'react';
import { Switch, Text, View } from 'react-native';

import { Chip, Sheet } from '@/components';
import { notificationsCopy } from '@/copy/notifications';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

import { useNotificationPrefs, type NotificationPrefs } from './useNotifications';

const NUDGE_OPTIONS: NotificationPrefs['affirmationNudge'][] = [
  'quiet',
  'once_daily',
  'custom_hours',
];

/**
 * Notification preferences (11 §4).
 *
 * Defaults to QUIET for the affirmation nudge. The arrival note is the one she
 * asked for at S11; a second daily notification is something she has to choose,
 * because the product's position is that no notification exists purely to
 * reopen the app (product 09 hard rule).
 */
export interface NotificationPrefsSheetProps {
  testID?: string;
}

export const NotificationPrefsSheet = forwardRef<BottomSheetModal, NotificationPrefsSheetProps>(
  function NotificationPrefsSheet(_props, ref) {
    const { colors, spacing } = useTheme();
    const scale = clampedFontScale();
    const userId = useAppState((s) => s.userId);
    const { prefs, update } = useNotificationPrefs(userId ?? undefined);

    return (
      <Sheet ref={ref} snapPoints={['46%']}>
        <BottomSheetView
          style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg }}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: 'Fraunces_400Regular',
              fontSize: 22 * scale,
              color: colors.text.primary,
            }}
          >
            {notificationsCopy.prefs.title}
          </Text>

          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text
                allowFontScaling={false}
                style={{ fontSize: 16 * scale, color: colors.text.primary }}
              >
                {notificationsCopy.prefs.arrival}
              </Text>
              <Text
                allowFontScaling={false}
                style={{ fontSize: 13 * scale, color: colors.text.secondary }}
              >
                {notificationsCopy.prefs.arrivalDetail}
              </Text>
            </View>

            <Switch
              value={prefs.arrivalEnabled}
              onValueChange={(value) => void update({ arrivalEnabled: value })}
              testID="prefs-arrival"
            />
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text
              allowFontScaling={false}
              style={{ fontSize: 16 * scale, color: colors.text.primary }}
            >
              {notificationsCopy.prefs.nudge}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {NUDGE_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={notificationsCopy.prefs.nudgeOptions[option]}
                  selected={prefs.affirmationNudge === option}
                  onPress={() => void update({ affirmationNudge: option })}
                />
              ))}
            </View>
          </View>
        </BottomSheetView>
      </Sheet>
    );
  },
);
