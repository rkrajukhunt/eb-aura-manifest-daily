import { Pressable, Text, View } from 'react-native';

import { momentsCopy } from '@/copy/moments';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

import { progressOf, usePlayerStore } from './playerStore';

export interface MiniPlayerProps {
  onToggle: () => void;
  testID?: string;
}

/**
 * The mini-player (06 §2, 10 §4).
 *
 * Renders above the tab bar whenever a moment is loaded and the cover is
 * minimized — this is the component that makes "audio continues while she moves
 * around the app" visible rather than merely true.
 *
 * Tapping the bar re-opens the cover; the play/pause control is a separate,
 * smaller target so the common intent (get back to the moment) is the whole bar
 * and the rarer one (stop it) is deliberate.
 */
export function MiniPlayer({ onToggle, testID }: MiniPlayerProps) {
  const { colors, spacing, radii } = useTheme();
  const scale = clampedFontScale();

  const moment = usePlayerStore((s) => s.moment);
  const minimized = usePlayerStore((s) => s.minimized);
  const playing = usePlayerStore((s) => s.playing);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const expand = usePlayerStore((s) => s.expand);

  // Nothing loaded, or the cover is already open — the bar would be a duplicate.
  if (!moment || !minimized) return null;

  const progress = progressOf(positionMs, durationMs);

  return (
    <View
      testID={testID}
      style={{
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: radii.card,
        backgroundColor: colors.surface.cardGlassy,
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={moment.title ?? 'Now playing'}
          onPress={expand}
          style={{ flex: 1 }}
          testID="mini-player-expand"
        >
          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={{
              fontFamily: 'Fraunces_400Regular',
              fontSize: 15 * scale,
              color: colors.text.primary,
            }}
          >
            {moment.title ?? momentsCopy.home.todayLabel}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? momentsCopy.player.pause : momentsCopy.player.play}
          onPress={onToggle}
          hitSlop={12}
          style={{ paddingHorizontal: spacing.sm }}
          testID="mini-player-toggle"
        >
          <Text style={{ fontSize: 18 * scale, color: colors.cta.background }}>
            {playing ? '❙❙' : '▶'}
          </Text>
        </Pressable>
      </View>

      {/* A hairline, not a scrubber: the mini-player reports progress, it does
          not invite you to fiddle with it. Scrubbing lives on the cover. */}
      <View style={{ height: 2, backgroundColor: colors.surface.border }}>
        <View
          testID="mini-player-progress"
          style={{
            height: 2,
            width: `${progress * 100}%`,
            backgroundColor: colors.cta.background,
          }}
        />
      </View>
    </View>
  );
}
