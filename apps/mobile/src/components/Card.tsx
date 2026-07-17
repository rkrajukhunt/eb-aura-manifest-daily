import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/theme/ThemeProvider';

export interface CardProps {
  variant: 'solid' | 'glassy';
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The two card surfaces (product 12 §surfaces). Glassy is for heroes — Today's
 * Moment, the player — and nowhere else: "depth without glass soup" means the
 * translucent card only reads as special while it stays rare.
 */
export function Card({ variant, children, style }: CardProps) {
  const { colors, layout, radii, scheme, spacing } = useTheme();

  const glassy = variant === 'glassy';

  return (
    <View
      style={[
        {
          borderRadius: radii.card,
          padding: layout.cardPadding,
          backgroundColor: glassy ? colors.surface.cardGlassy : colors.surface.card,
        },
        glassy && {
          borderWidth: 1,
          borderColor: colors.surface.border,
        },
        // Shadow in light only. In dark, elevation comes from the border — an ink
        // shadow is invisible against the plum base, and a light one would glow.
        glassy &&
          scheme === 'light' && {
            shadowColor: colors.text.primary,
            shadowOpacity: 0.06,
            shadowRadius: spacing.md,
            shadowOffset: { width: 0, height: spacing.xs },
          },
        style,
      ]}
    >
      {children}
    </View>
  );
}
