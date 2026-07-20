import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Input, PillButton, Sheet, TextButton } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

import { claimWithApple, claimWithEmail } from './claim';

export interface ClaimSheetProps {
  /** True when she has just purchased — changes only the reassurance line. */
  afterPurchase?: boolean;
  appleAvailable?: boolean;
  onDone: () => void;
}

/**
 * The claim-account sheet (03 §2.2, 12 §2).
 *
 * Presented after a purchase, after a restore, and from Settings. It is an
 * OFFER, never a gate: "Later" is always available, and the reassurance line
 * says plainly that her subscription is already active. Holding paid features
 * hostage to account creation would be the exact bait-and-switch this product
 * is positioned against.
 *
 * The honesty that matters here is about risk, not features: her letters live on
 * this device until she adds a way back in. That is true, it is the actual
 * reason to claim, and it is more persuasive than any growth copy.
 */
export const ClaimSheet = forwardRef<BottomSheetModal, ClaimSheetProps>(function ClaimSheet(
  { afterPurchase = false, appleAvailable = true, onDone },
  ref,
) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const runApple = async () => {
    setBusy(true);
    const result = await claimWithApple();
    setBusy(false);
    if (result.status === 'claimed') onDone();
  };

  const runEmail = async () => {
    setBusy(true);
    const { sent: ok } = await claimWithEmail(email.trim());
    setBusy(false);
    setSent(ok);
  };

  return (
    <Sheet ref={ref} snapPoints={['52%']}>
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
          {paywallCopy.claim.title}
        </Text>

        <Text
          allowFontScaling={false}
          style={{ fontSize: 15 * scale, lineHeight: 22 * scale, color: colors.text.secondary }}
        >
          {paywallCopy.claim.body}
        </Text>

        {afterPurchase && (
          <Text
            allowFontScaling={false}
            style={{ fontSize: 14 * scale, color: colors.text.secondary }}
          >
            {paywallCopy.claim.claimNotRequired}
          </Text>
        )}

        {sent ? (
          <Text
            testID="claim-email-sent"
            allowFontScaling={false}
            style={{ fontSize: 15 * scale, color: colors.text.primary }}
          >
            {paywallCopy.claim.emailSent}
          </Text>
        ) : showEmail ? (
          <View style={{ gap: spacing.sm }}>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder={paywallCopy.claim.emailPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="claim-email-input"
            />
            <PillButton
              title={paywallCopy.claim.email}
              onPress={() => void runEmail()}
              disabled={email.trim() === ''}
              loading={busy}
              testID="claim-email-submit"
            />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {appleAvailable && (
              <PillButton
                title={paywallCopy.claim.apple}
                onPress={() => void runApple()}
                loading={busy}
                testID="claim-apple"
              />
            )}
            <View style={{ alignItems: 'center' }}>
              <TextButton
                title={paywallCopy.claim.email}
                onPress={() => setShowEmail(true)}
                testID="claim-use-email"
              />
            </View>
          </View>
        )}

        <View style={{ alignItems: 'center' }}>
          <TextButton title={paywallCopy.claim.later} onPress={onDone} testID="claim-later" />
        </View>
      </BottomSheetView>
    </Sheet>
  );
});
