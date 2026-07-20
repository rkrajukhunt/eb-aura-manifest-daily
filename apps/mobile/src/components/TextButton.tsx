import { Pressable, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface TextButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  /**
   * Quiet red text. Product 12 permits destructive styling ONLY inside a
   * confirm — red anywhere else is fight-or-flight on a surface built for calm.
   */
  destructive?: boolean;
  testID?: string;
}

/**
 * The secondary action (product 12 §buttons): tinted text, no fill. No haptic —
 * the product-13 table gives one to the primary button only, and the ≤2 per
 * screen budget is spent where the moment matters.
 */
export function TextButton({
  title,
  onPress,
  disabled = false,
  destructive = false,
  testID,
}: TextButtonProps) {
  const { colors, layout, spacing, typography } = useTheme();

  const color = disabled
    ? // The disabled tint is defined for the CTA colour only; reusing it for the
      // destructive case too keeps "unavailable" reading identically everywhere.
      colors.cta.disabled
    : destructive
      ? colors.text.destructive
      : colors.cta.background;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        // Borderless text still owes a full-height touch target.
        minHeight: layout.buttonHeight,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={[typography.button, { color }]}>{title}</Text>
    </Pressable>
  );
}
