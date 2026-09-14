import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon } from '@/components/TabIcon';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

/**
 * Structural subset of react-navigation's `BottomTabBarProps`. The real type
 * lives in @react-navigation/bottom-tabs — a transitive dependency of
 * expo-router that pnpm's strict node_modules keeps un-importable. The subset
 * states exactly what the bar consumes, and stays assignable to the real
 * props at the `tabBar={...}` call site.
 */
export interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } } | undefined>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

/**
 * The capsule's own height: its `spacing.xs` padding either side of a selection
 * pill that stacks a `lg` glyph over an 11pt caption. Stated as a constant
 * because the scroll clearance below has to know it without measuring.
 */
const BAR_HEIGHT = 58;

/**
 * How far the capsule floats above the bottom edge.
 *
 * On a home-indicator phone the safe-area inset IS that gap — the bar rides
 * just clear of the indicator, which is what iOS's own floating bar does. With
 * no inset (older phones, most Android) there is nothing to clear, so the bar
 * needs a margin of its own or it would sit welded to the screen edge, which is
 * the exact docked look this replaced.
 */
function useTabBarOffset(): number {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();
  return insets.bottom > 0 ? insets.bottom : spacing.md;
}

/**
 * Bottom space a scrolling tab screen must leave clear, for THIS device.
 *
 * The bar no longer docks, so this is the float offset PLUS the capsule itself
 * PLUS a gap — without the last term the final row stops flush against the
 * capsule's underside and reads as clipped rather than as ended.
 */
export function useTabBarClearance(): number {
  const offset = useTabBarOffset();
  const { spacing } = useTheme();
  return offset + BAR_HEIGHT + spacing.md;
}

/**
 * The bottom tab bar (product 12 §navigation, 06 §6): four tabs, no more — the
 * IA does not grow tabs.
 *
 * A FLOATING capsule, not a docked slab. It is inset by the same
 * `layout.screenMargin` every screen already uses down its sides and rides
 * above the home indicator, so the gradient runs on underneath it and the bar
 * reads as a control resting on the page rather than as a white sheet the page
 * stops against. That is the current iOS idiom (the system's own floating bar),
 * and it is what the docked version got wrong: squared to the screen edges and
 * padded by the full safe-area inset, it grew into a slab that owned the whole
 * bottom of the display.
 *
 * The active tab now takes a soft ember pill BEHIND its glyph and caption, the
 * way the system bar capsules its selection. An earlier revision dropped that
 * chip as "noise on our warm surface" — true when the chip sat on the bone page
 * itself, but the capsule gives it a white ground to sit on, and selection that
 * is carried by colour alone is the weaker signal of the two.
 *
 * The title is the label AND the `accessibilityLabel`, so voice and sighted
 * users read the same word.
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors, layout, radii, spacing, iconSizes, shadows } = useTheme();
  const offset = useTabBarOffset();
  const scale = clampedFontScale();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: 'absolute',
        left: layout.screenMargin,
        right: layout.screenMargin,
        bottom: offset,
        flexDirection: 'row',
        backgroundColor: colors.surface.card,
        // Fully round: the capsule is the shape, so the radius is not a
        // softened corner but the silhouette itself.
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: colors.surface.border,
        padding: spacing.xs,
        // A floating control casts DOWNWARD — the docked bar threw its shadow up
        // from a seam that no longer exists.
        ...shadows.card,
      }}
    >
      {state.routes.map((route) => {
        const focused = state.routes.indexOf(route) === state.index;
        const title = descriptors[route.key]?.options.title ?? route.name;
        // Resting glyphs are dark ink (the reference's crisp outline); the active
        // one turns ember. Labels stay a step quieter than their glyph.
        const iconColor = focused ? colors.accent.emberDeep : colors.text.primary;
        const labelColor = focused ? colors.accent.emberDeep : colors.text.secondary;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={title}
            testID={`tab-${route.name}`}
            style={({ pressed }) => ({
              flex: 1,
              opacity: pressed ? 0.6 : 1,
            })}
            onPress={() => {
              // Standard react-navigation contract: a screen may intercept its
              // own tab press (scroll-to-top et al.) by preventing default.
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          >
            {/* The selection capsule. It STRETCHES to its tab's slot rather than
                hugging its contents, so the four pills are one width and the
                mark does not appear to resize as she moves between a short
                label and "Affirmations". Transparent when resting, so the
                unselected tabs stay bare glyphs on the white ground. */}
            <View
              testID={`tab-capsule-${route.name}`}
              style={{
                alignSelf: 'stretch',
                alignItems: 'center',
                gap: 2,
                paddingVertical: 6,
                borderRadius: radii.pill,
                backgroundColor: focused ? colors.accent.tabCapsule : 'transparent',
              }}
            >
              <TabIcon name={route.name} size={iconSizes.lg} color={iconColor} focused={focused} />

              <Text
                numberOfLines={1}
                allowFontScaling={false}
                style={{
                  fontSize: 11 * scale,
                  letterSpacing: 0.1,
                  color: labelColor,
                  fontWeight: focused ? '600' : '400',
                }}
              >
                {title}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
