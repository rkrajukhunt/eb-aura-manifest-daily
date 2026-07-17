import { Text, type StyleProp, type TextStyle } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/theme/ThemeProvider';
import { LABEL_OPACITY } from '@/theme/typography';

export interface LabelProps {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}

/**
 * "TODAY'S MOMENT", "COMING FOR YOU" — the category's signature wayfinding
 * (product 12 §type). Uppercase comes from the token's `textTransform`, so
 * callers pass ordinary sentence-case copy and screen readers hear words rather
 * than spelled-out letters.
 */
export function Label({ children, style }: LabelProps) {
  const { colors, typography } = useTheme();

  return (
    <Text style={[typography.label, { color: colors.text.label, opacity: LABEL_OPACITY }, style]}>
      {children}
    </Text>
  );
}
