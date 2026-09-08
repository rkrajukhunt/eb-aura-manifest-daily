import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

/** Design v5 row metrics — the icon tile and the check/dot have no token. */
const ICON_TILE = 38;
const CHECK = 21;
const DOT = 18;

export interface AnswerRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /**
  * An icon makes it the design's tile row (goals, obstacles): an ember tile
  * on the left and a ✓ circle on the right. Without one it is the plain
    * radio row (priority, context, mood, language, calibration, time), with
    * the selection indicator still on the right.
   */
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
}

/**
 * The one answer control of the v5 conversation. Unselected sits on the glassy
 * white with a faint hairline; selected turns the hairline ink, the surface
 * solid white, and fills the dot (or lights the tile ember and draws the ✓).
 */
export function AnswerRow({ label, selected, onPress, icon, testID }: AnswerRowProps) {
  const { colors, radii, spacing } = useTheme();
  const tile = icon !== undefined;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: tile ? spacing.md + 1 : spacing.md,
        paddingVertical: tile ? spacing.sm + 1 : spacing.md + 5,
        paddingLeft: tile ? spacing.sm + 1 : spacing.md + 6,
        paddingRight: tile ? spacing.md + 2 : spacing.md + 6,
        borderRadius: tile ? radii.card - 4 : radii.field,
        borderWidth: 1,
        borderColor: selected ? colors.text.primary : colors.surface.border,
        backgroundColor: selected ? colors.surface.card : colors.surface.cardGlassy,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {tile ? (
        selected ? (
          <LinearGradient
            colors={[colors.accent.emberSoft, colors.accent.emberDeep]}
            style={{
              width: ICON_TILE,
              height: ICON_TILE,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={20} color={colors.text.onCta} />
          </LinearGradient>
        ) : (
          <View
            style={{
              width: ICON_TILE,
              height: ICON_TILE,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accent.parchment,
            }}
          >
            <Ionicons name={icon} size={20} color={colors.text.label} />
          </View>
        )
      ) : null}

      <Text
        style={{
          flex: 1,
          fontFamily: fonts.sansMedium,
          fontSize: 16,
          lineHeight: 22,
          color: colors.text.primary,
        }}
      >
        {label}
      </Text>

      <View
        style={{
          width: tile ? CHECK : DOT,
          height: tile ? CHECK : DOT,
          borderRadius: (tile ? CHECK : DOT) / 2,
          borderWidth: 1.5,
          borderColor: selected ? colors.text.primary : colors.surface.border,
          backgroundColor: selected ? colors.text.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && tile ? <Ionicons name="checkmark" size={12} color={colors.text.onCta} /> : null}
      </View>
    </Pressable>
  );
}
