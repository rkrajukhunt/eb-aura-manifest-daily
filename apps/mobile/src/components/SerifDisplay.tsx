import { Text } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

export interface SerifDisplayProps {
  variant: 'letterLine' | 'affirmationHero' | 'momentTitle' | 'title';
  children: ReactNode;
}

/**
 * The serif surfaces — letters, affirmations, moment titles. Typography is the
 * hero here (product 12 §principles), so these are the only sizes that get a
 * Dynamic Type clamp.
 *
 * The clamp is applied by hand rather than by RN: `allowFontScaling` only turns
 * scaling fully on or off, and neither is acceptable. Off would ignore her
 * accessibility setting; on would let a Letter line hit 3× and reflow to two
 * words per screen, destroying the karaoke rhythm the whole wow depends on
 * (product 08). So we multiply by the clamped scale ourselves and then set
 * `allowFontScaling={false}` — otherwise RN would scale the already-scaled size
 * a second time.
 */
export function SerifDisplay({ variant, children }: SerifDisplayProps) {
  const { colors, typography } = useTheme();
  const { fontSize, lineHeight, ...rest } = typography[variant];
  const scale = clampedFontScale();

  return (
    <Text
      allowFontScaling={false}
      style={[
        rest,
        { color: colors.text.primary },
        ...(fontSize !== undefined ? [{ fontSize: fontSize * scale }] : []),
        ...(lineHeight !== undefined ? [{ lineHeight: lineHeight * scale }] : []),
      ]}
    >
      {children}
    </Text>
  );
}
