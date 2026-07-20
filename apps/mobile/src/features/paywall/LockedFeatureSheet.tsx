import type { GatedFeature } from '@aura/shared';
import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useEffect } from 'react';
import { Text, View } from 'react-native';

import { PillButton, TextButton } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { analytics } from '@/lib/analytics';
import { Sheet } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

export interface LockedFeatureSheetProps {
  feature: GatedFeature | null;
  onSeePlans: () => void;
  onDismiss: () => void;
}

/**
 * The locked-feature sheet (12 §3).
 *
 * A CALM BOTTOM SHEET, never a full-screen interrupt — that distinction is the
 * whole design. She reached for something specific; taking over her screen in
 * response would punish curiosity, and the free tier is supposed to be a good
 * experience rather than a nagging one.
 *
 * "Not now" is a real answer and is always present. There is no second, quieter
 * offer if she takes it (product 15 bans Aya's discount-chase pattern outright).
 */
export const LockedFeatureSheet = forwardRef<BottomSheetModal, LockedFeatureSheetProps>(
  function LockedFeatureSheet({ feature, onSeePlans, onDismiss }, ref) {
    const { colors, spacing } = useTheme();
    const scale = clampedFontScale();

    useEffect(() => {
      if (!feature) return;
      // Which locked feature she reached for is the most useful signal the free
      // tier produces — it says what to build, and what to unlock.
      analytics.capture('locked_feature_touched', { feature });
      analytics.capture('paywall_viewed', { surface: 'locked_feature' });
    }, [feature]);

    return (
      <Sheet ref={ref} snapPoints={['38%']} onDismiss={onDismiss}>
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
            {paywallCopy.locked.title}
          </Text>

          {feature && (
            <Text
              allowFontScaling={false}
              style={{
                fontSize: 16 * scale,
                lineHeight: 24 * scale,
                color: colors.text.secondary,
              }}
            >
              {paywallCopy.locked.features[feature]}
            </Text>
          )}

          <PillButton
            title={paywallCopy.locked.cta}
            onPress={onSeePlans}
            testID="locked-see-plans"
          />

          <View style={{ alignItems: 'center' }}>
            <TextButton
              title={paywallCopy.locked.dismiss}
              onPress={onDismiss}
              testID="locked-not-now"
            />
          </View>
        </BottomSheetView>
      </Sheet>
    );
  },
);
