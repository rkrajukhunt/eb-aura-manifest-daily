import { LIMITS } from '@aura/shared';
import { BottomSheetView, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Input, PillButton, Sheet } from '@/components';
import { momentsCopy } from '@/copy/moments';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

export interface ManifestSheetProps {
  creditsRemaining: number;
  onSubmit: (desireText: string) => void;
  busy?: boolean;
}

/**
 * Manifest Anything (product 09 §9.2).
 *
 * The credits line is framed as SPECIALNESS, not scarcity — "I make them
 * count", never "only 2 left". It is a real cost control (every moment is LLM +
 * TTS spend), and product 09 is explicit that the framing must not become
 * pressure. There is no upsell here when she runs out, just an honest note that
 * they return Monday.
 */
export const ManifestSheet = forwardRef<BottomSheetModal, ManifestSheetProps>(
  function ManifestSheet({ creditsRemaining, onSubmit, busy = false }, ref) {
    const { colors, spacing } = useTheme();
    const scale = clampedFontScale();

    const [desire, setDesire] = useState('');

    const creditLine =
      creditsRemaining <= 0
        ? momentsCopy.manifest.none
        : creditsRemaining === 1
          ? momentsCopy.manifest.lastOne
          : momentsCopy.manifest.remaining.replace('{n}', String(creditsRemaining));

    const tooLong = desire.trim().length > LIMITS.DESIRE_TEXT_MAX;
    const canSubmit = desire.trim() !== '' && !tooLong && creditsRemaining > 0;

    return (
      <Sheet ref={ref} snapPoints={['54%']}>
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
            {momentsCopy.manifest.title}
          </Text>

          <Input
            value={desire}
            onChangeText={setDesire}
            placeholder={momentsCopy.manifest.placeholder}
            multiline
            testID="manifest-input"
          />

          {/* Inspiration rather than instruction — product 09 §9.2 asks for
              examples drawn from her own goal area; until Phase 8 supplies those
              signals these are the neutral defaults. */}
          {desire.trim() === '' && (
            <View style={{ gap: spacing.xs }} testID="manifest-examples">
              {momentsCopy.manifest.examples.map((example) => (
                <Text
                  key={example}
                  allowFontScaling={false}
                  style={{ fontSize: 14 * scale, color: colors.text.secondary }}
                >
                  {example}
                </Text>
              ))}
            </View>
          )}

          <Text
            testID="manifest-credits"
            allowFontScaling={false}
            style={{ fontSize: 14 * scale, color: colors.text.secondary }}
          >
            {creditLine}
          </Text>

          <PillButton
            title={busy ? momentsCopy.manifest.working : momentsCopy.manifest.submit}
            loading={busy}
            disabled={!canSubmit}
            onPress={() => onSubmit(desire.trim())}
            testID="manifest-submit"
          />
        </BottomSheetView>
      </Sheet>
    );
  },
);
