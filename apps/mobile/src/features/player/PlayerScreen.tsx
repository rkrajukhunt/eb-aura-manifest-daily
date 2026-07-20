import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Orb, TextButton } from '@/components';
import { momentsCopy } from '@/copy/moments';
import { KaraokeLetter } from '@/features/letter/KaraokeLetter';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';
import { useSharedValue } from 'react-native-reanimated';
import { useEffect } from 'react';

import { ReadMode } from './ReadMode';
import { formatTime, progressOf, usePlayerStore } from './playerStore';

export interface PlayerScreenProps {
  onToggle: () => void;
  onBack15: () => void;
  onForward15: () => void;
  onFavorite: () => void;
  onRefine: () => void;
  onMinimize: () => void;
  /** Refine is premium and one-per-moment; the screen just hides the entry. */
  canRefine?: boolean;
  testID?: string;
}

/**
 * The full player (product 09 §9.1, 12).
 *
 * Unlike the Letter — which has no controls at all, deliberately — this surface
 * is a normal player, because a daily moment is something she returns to rather
 * than a performance she is hearing once. Transport, speed, a favourite heart
 * and a Refine entry all belong here.
 *
 * The orb is present but calm: it reacts to the voice rather than performing.
 */
export function PlayerScreen({
  onToggle,
  onBack15,
  onForward15,
  onFavorite,
  onRefine,
  onMinimize,
  canRefine = true,
  testID,
}: PlayerScreenProps) {
  const { colors, spacing, layout } = useTheme();
  const scale = clampedFontScale();

  const moment = usePlayerStore((s) => s.moment);
  const playing = usePlayerStore((s) => s.playing);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const speed = usePlayerStore((s) => s.speed);
  const mode = usePlayerStore((s) => s.mode);
  const cycleSpeed = usePlayerStore((s) => s.cycleSpeed);
  const toggleMode = usePlayerStore((s) => s.toggleMode);

  // The karaoke renderer reads position from a shared value; the store holds it
  // as plain state, so it is mirrored here rather than threaded through.
  const position = useSharedValue(0);
  useEffect(() => {
    position.value = positionMs;
  }, [positionMs, position]);

  if (!moment) return null;

  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <LinearGradient
        colors={[colors.bg.gradientTop, colors.bg.gradientMid, colors.bg.gradientBottom]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: layout.screenMargin,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={momentsCopy.player.minimize}
            onPress={onMinimize}
            hitSlop={12}
            testID="player-minimize"
          >
            <Text style={{ fontSize: 20 * scale, color: colors.text.secondary }}>⌄</Text>
          </Pressable>

          <TextButton
            title={mode === 'listen' ? momentsCopy.player.readMode : momentsCopy.player.listenMode}
            onPress={() => {
              toggleMode();
              analytics.capture('moment_read_mode_toggled');
            }}
            testID="player-mode-toggle"
          />
        </View>

        {mode === 'read' ? (
          <ReadMode
            lines={moment.lines}
            body={moment.body}
            positionMs={positionMs}
            testID="player-read"
          />
        ) : moment.lines.length > 0 ? (
          <KaraokeLetter lines={moment.lines} positionMs={position} testID="player-karaoke" />
        ) : (
          // No timings (audio never synthesized): show the orb rather than an
          // empty screen. The moment is still hers to listen to.
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Orb state={playing ? 'speaking' : 'idle'} size={160} testID="player-orb" />
          </View>
        )}

        <View style={{ paddingHorizontal: layout.screenMargin, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12 * scale, color: colors.text.secondary }}>
              {formatTime(positionMs)}
            </Text>
            <Text style={{ fontSize: 12 * scale, color: colors.text.secondary }}>
              {formatTime(durationMs)}
            </Text>
          </View>

          <View style={{ height: 2, backgroundColor: colors.surface.border }}>
            <View
              testID="player-progress"
              style={{
                height: 2,
                width: `${progressOf(positionMs, durationMs) * 100}%`,
                backgroundColor: colors.cta.background,
              }}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <TransportButton
              label={momentsCopy.player.back15}
              glyph="↺"
              onPress={onBack15}
              testID="player-back15"
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={playing ? momentsCopy.player.pause : momentsCopy.player.play}
              onPress={onToggle}
              hitSlop={12}
              testID="player-toggle"
            >
              <Text style={{ fontSize: 34 * scale, color: colors.cta.background }}>
                {playing ? '❙❙' : '▶'}
              </Text>
            </Pressable>

            <TransportButton
              label={momentsCopy.player.forward15}
              glyph="↻"
              onPress={onForward15}
              testID="player-forward15"
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: spacing.lg,
            }}
          >
            <TextButton title={`${speed}×`} onPress={() => cycleSpeed()} testID="player-speed" />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                moment.favoritedAt ? momentsCopy.player.unfavorite : momentsCopy.player.favorite
              }
              onPress={onFavorite}
              hitSlop={12}
              testID="player-favorite"
            >
              <Text style={{ fontSize: 22 * scale }}>{moment.favoritedAt ? '♥' : '♡'}</Text>
            </Pressable>

            {canRefine && (
              <TextButton
                title={momentsCopy.player.refine}
                onPress={onRefine}
                testID="player-refine"
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function TransportButton({
  label,
  glyph,
  onPress,
  testID,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  testID: string;
}) {
  const { colors } = useTheme();
  const scale = clampedFontScale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={12}
      testID={testID}
    >
      <Text style={{ fontSize: 22 * scale, color: colors.text.primary }}>{glyph}</Text>
    </Pressable>
  );
}
