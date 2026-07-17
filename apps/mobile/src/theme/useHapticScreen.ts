import { usePathname } from 'expo-router';
import { useEffect } from 'react';

import { beginHapticScreen } from './haptics';

/**
 * Scopes the per-screen haptic budget to the focused route.
 *
 * Without this, `beginHapticScreen` is never called in production, so the ≤2
 * rule (product 13) is measured against a session-wide counter that only ever
 * climbs — every screen reads as "unknown screen" and the dev warning fires
 * forever. Wiring it once at the root, keyed on the pathname, resets the budget
 * on each navigation so the rule means what it says.
 *
 * Mounted once in the root layout — a single wiring point so a new screen can
 * never forget to opt in.
 */
export function useHapticScreen(): void {
  const pathname = usePathname();

  useEffect(() => {
    beginHapticScreen(pathname);
  }, [pathname]);
}
