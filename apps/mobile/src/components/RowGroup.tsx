import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface RowGroupProps {
  children: ReactNode;
  /**
   * Where the hairline between rows starts. 'leading' aligns it with row text
   * past an icon tile (v4 profile); 'edge' runs it from the row padding
   * (v4 settings, no tiles).
   */
  separatorInset?: 'leading' | 'edge';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The grouped-rows card (v4 §profile/settings): a white bordered surface whose
 * only job is to stack ListRows with a hairline between each pair. Rows carry
 * their own padding and press behaviour.
 */
export function RowGroup({ children, separatorInset = 'edge', style, testID }: RowGroupProps) {
  const { colors, layout, radii, spacing } = useTheme();

  const rows = Children.toArray(children).filter(Boolean);

  // Text in a tiled row starts after: row padding + 32pt tile + the row gap.
  const inset =
    separatorInset === 'leading'
      ? layout.listRowPaddingH + layout.iconTileSize + spacing.md
      : layout.listRowPaddingH;

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: colors.surface.card,
          borderRadius: radii.group,
          borderWidth: 1,
          borderColor: colors.surface.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                marginLeft: inset,
                // Lighter than the card's own border — v4 uses #EFECE0 for every
                // in-card separator, so a row never looks like a second card.
                backgroundColor: colors.surface.divider,
              }}
            />
          )}
          {row}
        </Fragment>
      ))}
    </View>
  );
}
