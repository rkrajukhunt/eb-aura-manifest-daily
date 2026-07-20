import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Input, PillButton, Screen, SerifDisplay, TextButton } from '@/components';
import { api } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';

/** She must type this exactly — a slip cannot delete an account (03 §5). */
const CONFIRM_WORD = 'delete';

/**
 * `settings/delete-account` (06 §1, 03 §5, product 18 "delete means delete").
 *
 * The endpoint has existed since Phase 2 and had no surface, which meant the
 * product promised a deletion path a user could not actually reach.
 *
 * The typed confirmation is the one place this product uses friction on
 * purpose: everything else is designed to get out of her way, and this is the
 * single irreversible action in the app.
 */
export default function DeleteAccountRoute() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD;

  return (
    <Screen testID="delete-account">
      <View style={{ flex: 1, gap: spacing.lg, paddingVertical: spacing.lg }}>
        <SerifDisplay variant="title">Delete everything?</SerifDisplay>

        <Text style={{ color: colors.text.secondary, lineHeight: 22 }}>
          Your letter, your moments and everything you’ve told me. This can’t be undone, and I won’t
          keep a copy.
        </Text>

        <Input
          value={typed}
          onChangeText={setTyped}
          placeholder={`Type ${CONFIRM_WORD} to confirm`}
          autoCapitalize="none"
          testID="delete-confirm-input"
        />

        <PillButton
          title="Delete my account"
          disabled={!confirmed}
          loading={busy}
          onPress={() => {
            setBusy(true);
            void api
              .deleteAccount()
              .then(() => router.replace('/(onboarding)'))
              .finally(() => setBusy(false));
          }}
          testID="delete-confirm"
        />

        <View style={{ alignItems: 'center' }}>
          <TextButton
            title="Keep my account"
            onPress={() => router.back()}
            testID="delete-cancel"
          />
        </View>
      </View>
    </Screen>
  );
}
