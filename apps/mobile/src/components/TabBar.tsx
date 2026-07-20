import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon } from '@/components/TabIcon';
import { useTheme } from '@/theme/ThemeProvider';

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
 * The floating pill tab bar (product 12 §navigation, 06 §6): four tabs, no
 * more — the IA does not grow tabs. It floats clear of the edges rather than
 * docking, so screens keep their full-bleed gradient underneath.
 *
 * Icons, no captions. The four destinations are fixed and their glyphs are
 * conventional, so a caption under each one is a label she reads once and then
 * never again — and product 12 asks for quiet chrome. The title has NOT been
 * dropped though: it still rides on `accessibilityLabel`, which is what
 * VoiceOver announces, so nothing is lost for anyone navigating by voice.
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        // spacing.lg clear of the safe-area edge — above the home indicator on
        // notch devices, above the physical edge elsewhere. Floats, never docks.
        bottom: insets.bottom + spacing.lg,
        flexDirection: 'row',
        borderRadius: radii.pill,
        backgroundColor: colors.surface.cardGlassy,
        // Same hairline as glassy cards — the bar is a glassy surface, not chrome.
        borderWidth: 1,
        borderColor: colors.surface.border,
        paddingVertical: spacing.sm,
      }}
    >
      {state.routes.map((route, index) => {
        const focused = index === state.index;
        const title = descriptors[route.key]?.options.title ?? route.name;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={title}
            testID={`tab-${route.name}`}
            style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.sm }}
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
            <TabIcon
              name={route.name}
              // Periwinkle is the single high-contrast colour; the active tab
              // is one of its few sanctioned uses (product 12 §color). With the
              // caption gone this tint is now the ONLY thing marking the active
              // tab, so it carries more weight than it did.
              color={focused ? colors.cta.background : colors.text.secondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
