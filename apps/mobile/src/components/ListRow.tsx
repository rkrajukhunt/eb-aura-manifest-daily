import { Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

export interface ListRowProps {
  title: string;
  /** One quiet line of real data under the title — v4 rows always show what's inside. */
  subtitle?: string | null;
  /** An IconTile, orb, toggle — anything that leads the row. */
  leading?: ReactNode;
  /** 'chevron' is the standard "this opens" affordance; pass a node for toggles or text actions. */
  trailing?: 'chevron' | ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  testID?: string;
}

/**
 * One row inside a RowGroup (v4 §profile/settings). Its single job: lay out
 * leading · title/subtitle · trailing and acknowledge the press by dimming.
 * Grouping, hairlines and card chrome belong to RowGroup, not here.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing = 'chevron',
  onPress,
  destructive = false,
  testID,
}: ListRowProps) {
  const { colors, layout, spacing } = useTheme();
  const scale = clampedFontScale();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        // v4 §profile/settings. A tiled row runs 1pt tighter than a plain one:
        // the 32pt tile already gives it the height a bare row needs padding for.
        paddingVertical: leading ? layout.listRowPaddingV - 1 : layout.listRowPaddingV,
        paddingHorizontal: layout.listRowPaddingH,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {leading}

      <View style={{ flex: 1, gap: spacing.xs / 2 }}>
        <Text
          allowFontScaling={false}
          style={[
            scaledType('listTitle', scale),
            { color: destructive ? colors.text.destructive : colors.text.primary },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={[scaledType('listSubtitle', scale), { color: colors.text.secondary }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing === 'chevron' ? <Chevron /> : trailing}
    </Pressable>
  );
}

/** The one affordance saying "this opens" — hidden from screen readers, which already hear the row's role. */
function Chevron() {
  const { colors } = useTheme();
  const scale = clampedFontScale();

  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      allowFontScaling={false}
      style={[scaledType('body', scale), { color: colors.text.disabled }]}
    >
      ›
    </Text>
  );
}
