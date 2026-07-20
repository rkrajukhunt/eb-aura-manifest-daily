import Feather from '@expo/vector-icons/Feather';
import { SymbolView, type SFSymbol } from 'expo-symbols';

/** The four product tabs (06 §6). The IA does not grow tabs, so neither does this. */
export type TabName = 'home' | 'affirmations' | 'gratitude' | 'profile';

/**
 * SF Symbol per tab, with the Feather glyph that stands in off-iOS.
 *
 * Gratitude is deliberately NOT a heart. The heart is already spoken for as the
 * favorite action across moments, affirmations and the Letter ("Hearts live
 * here" — product 09), so a heart in the tab bar would read as "my favorites"
 * and send her to the wrong place. `sun` keeps the warmth without the collision.
 */
// Both halves are typed against their real catalogues, so a symbol that does
// not exist is a compile error rather than a blank square on a device.
const GLYPHS: Record<TabName, { sf: SFSymbol; feather: keyof typeof Feather.glyphMap }> = {
  home: { sf: 'house', feather: 'home' },
  affirmations: { sf: 'sparkles', feather: 'star' },
  gratitude: { sf: 'sun.max', feather: 'sun' },
  profile: { sf: 'person', feather: 'user' },
};

export interface TabIconProps {
  name: string;
  color: string;
  size?: number;
}

/**
 * A tab glyph: real SF Symbols on iOS, Feather everywhere else (product 12 §43
 * — "thin-to-regular weight, rounded, SF-Symbols-first"; 06 §6 — "with
 * fallback"). Feather is the closest match to that brief in a bundled font.
 *
 * `name` is passed to `SymbolView` as a STRING rather than an `{ios, android}`
 * pair on purpose. The pair would opt Android into Material Symbols, which
 * `expo-symbols` fetches over the NETWORK at runtime and renders as an empty
 * box until it arrives — a tab bar that boots blank, and stays blank offline.
 * A plain string makes the non-iOS path fall through to `fallback` instead,
 * which ships in the bundle and draws on the first frame.
 *
 * Unknown route names render nothing rather than throwing: a tab added without
 * a glyph should look unfinished, not crash the shell.
 */
export function TabIcon({ name, color, size = 22 }: TabIconProps) {
  const glyph = GLYPHS[name as TabName];
  if (!glyph) return null;

  const testID = `tab-icon-${name}`;

  return (
    <SymbolView
      name={glyph.sf}
      size={size}
      tintColor={color}
      // Product 12 §43 asks for thin-to-regular. Regular holds up at 22pt where
      // light starts to disappear against the glassy bar.
      weight="regular"
      testID={testID}
      fallback={<Feather name={glyph.feather} size={size} color={color} testID={testID} />}
    />
  );
}
