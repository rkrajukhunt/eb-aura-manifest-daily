import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

export interface IconTileProps {
  /** Soft accent washes (v4 profile rows); 'orb' is the ember gradient reserved for memory/voice rows. */
  tint: 'parchment' | 'blush' | 'olive' | 'bone' | 'orb';
  /** A centred Ionicons glyph — the row's category at a glance. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Optional small text glyph centered in the tile (✕, ♥ …). Prefer `icon`. */
  glyph?: string;
  testID?: string;
}

/**
 * The small rounded tile that leads a v4 row. One job: a quiet colour swatch
 * that tells the row's category at a glance — never an action.
 */
export function IconTile({ tint, icon, glyph, testID }: IconTileProps) {
  const { colors, layout, radii } = useTheme();
  const scale = clampedFontScale();

  // On the ember orb the glyph reads cream; on the soft washes it reads ink.
  const contentColor = tint === 'orb' ? colors.text.onCta : colors.text.primary;

  const frame = {
    width: layout.iconTileSize,
    height: layout.iconTileSize,
    borderRadius: radii.chip - 4,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  };

  const wash = {
    parchment: colors.accent.parchment,
    blush: colors.accent.blushSoft,
    olive: colors.accent.oliveSoft,
    bone: colors.bg.base,
  };

  const label = icon ? (
    <Ionicons name={icon} size={18} color={contentColor} />
  ) : glyph ? (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      allowFontScaling={false}
      style={[scaledType('bodySmall', scale), { color: contentColor }]}
    >
      {glyph}
    </Text>
  ) : null;

  if (tint === 'orb') {
    return (
      <LinearGradient
        testID={testID}
        colors={[colors.orb.core, colors.orb.halo]}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.9, y: 1 }}
        style={frame}
      >
        {label}
      </LinearGradient>
    );
  }

  return (
    <View testID={testID} style={[frame, { backgroundColor: wash[tint] }]}>
      {label}
    </View>
  );
}
