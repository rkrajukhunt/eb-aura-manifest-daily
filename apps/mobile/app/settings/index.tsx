import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Screen } from '@/components';
import { ClaimSheet } from '@/features/paywall/ClaimSheet';
import { paywallCopy } from '@/copy/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

/**
 * `settings/index` — reached from the gear on Profile (06 §7: the gear lives on
 * Profile, never on Home).
 *
 * Subscription is the first row so that "manage or cancel" is two taps from
 * anywhere in the app (checklist #5). Claiming an account is offered here as its
 * second entry point (03 §89) — the same sheet the purchase flow presents.
 *
 * Notifications and delete-account rows land with Phases 9 and 12.
 */
export default function SettingsRoute() {
  const router = useRouter();
  const claimRef = useRef<BottomSheetModal>(null);

  return (
    <Screen testID="settings">
      <View style={{ flex: 1 }}>
        <SettingsRow
          label={paywallCopy.subscription.title}
          onPress={() => router.push('/settings/subscription')}
          testID="settings-subscription-row"
        />
        <SettingsRow
          label={paywallCopy.claim.title}
          onPress={() => claimRef.current?.present()}
          testID="settings-claim-row"
        />
      </View>

      <ClaimSheet ref={claimRef} onDone={() => claimRef.current?.dismiss()} />
    </Screen>
  );
}

function SettingsRow({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors, spacing, layout } = useTheme();
  const scale = clampedFontScale();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: layout.buttonHeight,
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface.border,
      }}
    >
      <Text allowFontScaling={false} style={{ fontSize: 17 * scale, color: colors.text.primary }}>
        {label}
      </Text>
    </Pressable>
  );
}
