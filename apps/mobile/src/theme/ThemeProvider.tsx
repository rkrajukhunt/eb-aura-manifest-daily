import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  colorSchemes,
  durations,
  layout,
  radii,
  spacing,
  type ColorScheme,
  type ColorTokens,
} from './tokens';
import { typography } from './typography';

export interface Theme {
  scheme: ColorScheme;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  layout: typeof layout;
  durations: typeof durations;
  typography: typeof typography;
}

const ThemeContext = createContext<Theme | null>(null);

/**
 * Resolves tokens for the active colour scheme (05 §4).
 *
 * `forceScheme` exists for the gallery (which shows light and dark side by side)
 * and for tests. Nothing in the product should force a scheme — dark mode follows
 * the system, day one.
 */
export function ThemeProvider({
  children,
  forceScheme,
}: {
  children: ReactNode;
  forceScheme?: ColorScheme;
}) {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = forceScheme ?? (systemScheme === 'dark' ? 'dark' : 'light');

  const theme = useMemo<Theme>(
    () => ({
      scheme,
      colors: colorSchemes[scheme],
      spacing,
      radii,
      layout,
      durations,
      typography,
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);

  if (!theme) {
    // Failing loudly beats silently rendering unthemed: an unthemed screen looks
    // "fine" in light mode and broken in dark, which is exactly the bug that
    // survives to production.
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }

  return theme;
}
