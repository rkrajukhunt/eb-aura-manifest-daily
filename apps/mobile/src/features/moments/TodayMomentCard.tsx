import { Image, Pressable, Text, View } from 'react-native';

import { Card, PlayCircle, SerifDisplay, TextButton } from '@/components';
import { momentsCopy } from '@/copy/moments';
import { playerCopy } from '@/copy/player';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import orbHero from '../../../assets/brand/orb-hero.png';

import type { HomeMomentState } from './momentState';
import type { PlayableMoment } from './useMoments';

/** Inline play disc inside cards (v4 §home). */
const PLAY_DISC_SIZE = 44;

/** "Listen · N min", N rounded up; just "Listen" when the duration is unknown. */
export function listenLabel(durationMs: number | null): string {
  if (!durationMs || durationMs <= 0) return momentsCopy.home.listen;
  const minutes = Math.max(1, Math.ceil(durationMs / 60_000));
  return momentsCopy.home.listenDuration.replace('{n}', String(minutes));
}

/**
 * The "Today's moment" card (v4 §home): every branch of `HomeMomentState` in
 * the same glassy-card language. The honest lines stay — forming and failed
 * speak in voice, never as a fault — and every branch still gives her
 * something to press.
 */
export function TodayMomentCard({
  state,
  onPlay,
  onRetry,
  onFavorite,
  secondary,
}: {
  state: HomeMomentState;
  onPlay: (momentId: string) => void;
  onRetry: () => void;
  /** Toggles the keep mark. Premium beyond the Letter, gated by the caller (12 §4). */
  onFavorite: (momentId: string) => void;
  /** Overrides the quiet line under a ready moment — the legible "why" (2026-08-10). */
  secondary?: string | undefined;
}) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const quiet = (text: string) => (
    <Text
      allowFontScaling={false}
      style={[scaledType('body', scale), { color: colors.text.secondary }]}
    >
      {text}
    </Text>
  );

  if (state.kind === 'ready') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={state.moment.title ?? momentsCopy.home.todayLabel}
        onPress={() => onPlay(state.moment.id)}
        testID="home-today"
      >
        <ReadyCard
          moment={state.moment}
          onPlay={onPlay}
          onFavorite={onFavorite}
          secondary={secondary}
        />
      </Pressable>
    );
  }

  if (state.kind === 'first_run') {
    // A genuine, filled empty state — never a bare screen (product 09 §9.1, 12
    // §empty states): the orb (presence, in its writing state since the on-open
    // fallback is generating now) over one warm serif line and a quiet promise.
    return (
      <View testID="home-first-run">
        <Card
          variant="glassy"
          style={{
            alignItems: 'center',
            gap: spacing.md,
            paddingVertical: spacing.xl,
          }}
        >
          <Image
            source={orbHero}
            style={{ width: 128, height: 128 }}
            resizeMode="contain"
            testID="home-first-run-orb"
          />
          <SerifDisplay variant="momentTitle">{momentsCopy.states.firstRunTitle}</SerifDisplay>
          <Text
            allowFontScaling={false}
            style={[
              scaledType('body', scale),
              { color: colors.text.secondary, textAlign: 'center' },
            ]}
          >
            {momentsCopy.states.firstRunBody}
          </Text>
        </Card>
      </View>
    );
  }

  if (state.kind === 'forming') {
    return (
      <View style={{ gap: spacing.sm }} testID="home-forming-state">
        <Card variant="glassy">{quiet(momentsCopy.states.stillForming)}</Card>
        {/* The fallback is the point: she still has something to listen to. */}
        {state.fallback && (
          <FallbackCard
            fallback={state.fallback}
            offerLine={momentsCopy.states.replayOffer}
            onPlay={onPlay}
          />
        )}
      </View>
    );
  }

  // Failed — an in-voice line and a way forward, never a code (product 09 §9.1).
  return (
    <View style={{ gap: spacing.sm }} testID="home-failed">
      <Card variant="glassy">{quiet(momentsCopy.states.didNotArrive)}</Card>
      <TextButton title={momentsCopy.states.retry} onPress={onRetry} testID="home-retry" />
      {state.fallback && (
        <FallbackCard fallback={state.fallback} offerLine={null} onPlay={onPlay} />
      )}
    </View>
  );
}

/** The full morning card: serif title, one quiet line, then the action row. */
function ReadyCard({
  moment,
  onPlay,
  onFavorite,
  secondary,
}: {
  moment: PlayableMoment;
  onPlay: (momentId: string) => void;
  onFavorite: (momentId: string) => void;
  secondary?: string | undefined;
}) {
  const { colors, layout, spacing } = useTheme();
  const scale = clampedFontScale();
  const favorited = moment.favoritedAt !== null;

  return (
    <Card variant="glassy" style={{ gap: spacing.xs, padding: layout.momentCardPadding }}>
      <SerifDisplay variant="momentTitle">
        {moment.title ?? momentsCopy.home.todayLabel}
      </SerifDisplay>
      <Text
        allowFontScaling={false}
        style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
      >
        {secondary ?? momentsCopy.home.todaySecondary}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          marginTop: spacing.sm,
        }}
      >
        <PlayCircle
          size={PLAY_DISC_SIZE}
          playing={false}
          onPress={() => onPlay(moment.id)}
          accessibilityLabel={playerCopy.play}
          testID="home-today-play"
        />
        <Text
          allowFontScaling={false}
          style={[scaledType('cardButton', scale), { color: colors.text.primary }]}
        >
          {listenLabel(moment.durationMs)}
        </Text>
        <View style={{ flex: 1 }} />
        {/* A real control, not an ornament. The glyph rendered the moment's
            `favorited_at` from the start but was never pressable, so the only
            working keep-mark in the app was the one on the player cover — this
            one read as broken because it looked identical and did nothing. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorited ? playerCopy.unfavorite : playerCopy.favorite}
          accessibilityState={{ selected: favorited }}
          hitSlop={12}
          onPress={() => onFavorite(moment.id)}
          testID="home-today-favorite"
        >
          <Text
            allowFontScaling={false}
            style={[scaledType('body', scale), { color: colors.accent.heart }]}
          >
            {favorited ? '♥' : '♡'}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

/** Yesterday's, offered while today's forms or after a failure. */
function FallbackCard({
  fallback,
  offerLine,
  onPlay,
}: {
  fallback: PlayableMoment;
  offerLine: string | null;
  onPlay: (momentId: string) => void;
}) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fallback.title ?? 'Yesterday’s moment'}
      onPress={() => onPlay(fallback.id)}
      testID="home-fallback"
    >
      <Card variant="glassy" style={{ gap: spacing.xs }}>
        {offerLine && (
          <Text
            allowFontScaling={false}
            style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
          >
            {offerLine}
          </Text>
        )}
        <SerifDisplay variant="momentTitle">{fallback.title ?? 'Yesterday'}</SerifDisplay>
      </Card>
    </Pressable>
  );
}
