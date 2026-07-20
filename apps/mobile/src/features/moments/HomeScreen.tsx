import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card, PillButton, SerifDisplay, TextButton } from '@/components';
import { momentsCopy } from '@/copy/moments';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

import { greetingFor, type HomeMomentState } from './momentState';

export interface HomeScreenProps {
  name: string | null;
  state: HomeMomentState;
  forming: { id: string; title: string | null }[];
  recent: { id: string; title: string | null }[];
  onPlay: (momentId: string) => void;
  onRetry: () => void;
  onManifest: () => void;
  /** One quiet line a week when notifications were declined (11 §2). */
  notificationHint?: string | null;
  testID?: string;
}

/**
 * Home (product 11, 09 §9.1).
 *
 * Ordered by what she came for: the moment first, what is coming next, then
 * what she has already heard. The "+" is the Manifest entry and sits on the
 * Home surface rather than becoming a fifth tab (06 §6/§7 — the IA does not
 * grow tabs).
 *
 * There is no empty state anywhere in here, by design: every branch of
 * `HomeMomentState` renders something she can act on.
 */
export function HomeScreen({
  name,
  state,
  forming,
  recent,
  onPlay,
  onRetry,
  onManifest,
  notificationHint = null,
  testID,
}: HomeScreenProps) {
  const { colors, spacing, layout } = useTheme();
  const scale = clampedFontScale();

  const greeting = name
    ? momentsCopy.home[greetingFor()].replace('{name}', name)
    : momentsCopy.home.anonymousGreeting;

  return (
    <ScrollView
      testID={testID}
      contentContainerStyle={{
        padding: layout.screenMargin,
        gap: spacing.xl,
        paddingBottom: spacing.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <SerifDisplay variant="title">{greeting}</SerifDisplay>

      <View style={{ gap: spacing.sm }}>
        <SectionLabel>{momentsCopy.home.todayLabel}</SectionLabel>
        <TodayCard state={state} onPlay={onPlay} onRetry={onRetry} />
      </View>

      {forming.length > 0 && (
        <View style={{ gap: spacing.sm }} testID="home-forming">
          <SectionLabel>{momentsCopy.home.comingLabel}</SectionLabel>
          {forming.map((item) => (
            <Card key={item.id} variant="solid">
              <Text
                allowFontScaling={false}
                style={{ fontSize: 15 * scale, color: colors.text.secondary }}
              >
                {item.title ?? momentsCopy.states.formingPreview}
              </Text>
            </Card>
          ))}
        </View>
      )}

      {recent.length > 0 && (
        <View style={{ gap: spacing.sm }} testID="home-recent">
          <SectionLabel>{momentsCopy.home.recentLabel}</SectionLabel>
          {recent.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.title ?? 'A moment'}
              onPress={() => onPlay(item.id)}
              testID={`home-recent-${item.id}`}
            >
              <Card variant="solid">
                <Text
                  numberOfLines={1}
                  allowFontScaling={false}
                  style={{ fontSize: 16 * scale, color: colors.text.primary }}
                >
                  {item.title ?? 'A moment'}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
      )}

      {notificationHint && (
        <Text
          testID="home-notification-hint"
          allowFontScaling={false}
          style={{ fontSize: 14 * scale, color: colors.text.secondary }}
        >
          {notificationHint}
        </Text>
      )}

      <PillButton title={momentsCopy.home.manifest} onPress={onManifest} testID="home-manifest" />
    </ScrollView>
  );
}

function TodayCard({
  state,
  onPlay,
  onRetry,
}: {
  state: HomeMomentState;
  onPlay: (momentId: string) => void;
  onRetry: () => void;
}) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const body = (text: string) => (
    <Text
      allowFontScaling={false}
      style={{ fontSize: 15 * scale, lineHeight: 22 * scale, color: colors.text.secondary }}
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
        <Card variant="solid">
          <SerifDisplay variant="momentTitle">
            {state.moment.title ?? momentsCopy.home.todayLabel}
          </SerifDisplay>
        </Card>
      </Pressable>
    );
  }

  if (state.kind === 'first_run') {
    return (
      <View testID="home-first-run">
        <Card variant="solid">{body(momentsCopy.states.stillForming)}</Card>
      </View>
    );
  }

  if (state.kind === 'forming') {
    return (
      <View style={{ gap: spacing.sm }} testID="home-forming-state">
        <Card variant="solid">{body(momentsCopy.states.stillForming)}</Card>
        {/* The fallback is the point: she still has something to listen to. */}
        {state.fallback && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state.fallback.title ?? 'Yesterday’s moment'}
            onPress={() => onPlay(state.fallback!.id)}
            testID="home-fallback"
          >
            <Card variant="solid">
              {body(momentsCopy.states.replayOffer)}
              <SerifDisplay variant="momentTitle">
                {state.fallback.title ?? 'Yesterday'}
              </SerifDisplay>
            </Card>
          </Pressable>
        )}
      </View>
    );
  }

  // Failed — an in-voice line and a way forward, never a code (product 09 §9.1).
  return (
    <View style={{ gap: spacing.sm }} testID="home-failed">
      <Card variant="solid">{body(momentsCopy.states.didNotArrive)}</Card>
      <TextButton title={momentsCopy.states.retry} onPress={onRetry} testID="home-retry" />
      {state.fallback && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={state.fallback.title ?? 'Yesterday’s moment'}
          onPress={() => onPlay(state.fallback!.id)}
          testID="home-fallback"
        >
          <Card variant="solid">
            <SerifDisplay variant="momentTitle">{state.fallback.title ?? 'Yesterday'}</SerifDisplay>
          </Card>
        </Pressable>
      )}
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  const scale = clampedFontScale();

  return (
    <Text
      allowFontScaling={false}
      style={{ fontSize: 12 * scale, letterSpacing: 1, color: colors.text.secondary }}
    >
      {children.toUpperCase()}
    </Text>
  );
}
