import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, ScrollView, Text, View } from 'react-native';

import { Card, PillButton, Screen, SerifDisplay, TextButton } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { markPermissionAsked } from '@/features/notifications/permissionGate';
import {
  registerToken,
  requestPermissionAndRegister,
} from '@/features/notifications/useNotifications';
import { analytics } from '@/lib/analytics';
import { useAppState } from '@/stores/appState';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { haptic } from '@/theme/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { completeOnboarding } from '../commit';
import { firstAffirmationOf, ritualTimeOf } from '../derive';
import { Eyebrow } from '../Eyebrow';
import { ReminderPreview } from '../ReminderPreview';

/**
 * Notifications · second chance (design 27). Shown ONCE, only after "Not now"
 * or an OS decline. It names the concrete loss and shows tomorrow's arrival
 * — a warm second offer, never a guilt screen: "Continue without them" is
 * always right there, and this is the last notification ask in the funnel.
 *
 * The OS will not re-show its prompt once denied, so on that path the primary
 * opens Settings; an AppState listener finishes if she flipped the switch.
 * Like the pre-prompt, THIS screen finishes onboarding on every exit.
 */
export function S12NotificationsMore() {
  const router = useRouter();
  const { colors, radii, shadows, spacing, typography } = useTheme();
  const userId = useAppState((s) => s.userId);
  const answers = useOnboardingDraft((s) => s.answers);
  const [busy, setBusy] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const proceeding = useRef(false);
  const c = onboardingCopy.s12NotificationsMore;
  const time = ritualTimeOf(answers);

  useEffect(() => {
    analytics.capture('onboarding_screen_viewed', { screen_id: 's12b-notifications' });
    analytics.capture('notification_second_chance_viewed', {});
    void Notifications.getPermissionsAsync().then((p) => setCanAskAgain(p.canAskAgain));
  }, []);

  const proceed = useCallback(async (): Promise<void> => {
    if (proceeding.current || !userId) return;
    proceeding.current = true;
    try {
      // Asked as far as we will ever ask — Home's fallback stays quiet.
      markPermissionAsked(true);
      await completeOnboarding(userId);
      router.replace('/(onboarding)/generating');
    } catch (err) {
      // Leave her able to retry rather than stranded. A silent catch here is
      // what once made a failing completion look like a dead button.
      console.warn('[onboarding] second-chance proceed failed:', err);
      proceeding.current = false;
    }
  }, [router, userId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !userId) return;
      void Notifications.getPermissionsAsync().then(async (p) => {
        if (p.status === 'granted') {
          await registerToken(userId);
          void proceed();
        } else {
          setCanAskAgain(p.canAskAgain);
        }
      });
    });
    return () => sub.remove();
  }, [userId, proceed]);

  const onPrimary = async (): Promise<void> => {
    if (busy || !userId) return;
    setBusy(true);
    void haptic('onboardingContinue');
    try {
      const perms = await Notifications.getPermissionsAsync();
      if (perms.status === 'granted') {
        await registerToken(userId);
        await proceed();
        return;
      }
      if (perms.canAskAgain) {
        await requestPermissionAndRegister(userId);
        await proceed();
        return;
      }
      await Linking.openSettings();
    } finally {
      setBusy(false);
    }
  };

  const onSkip = (): void => {
    void haptic('onboardingContinue');
    void proceed();
  };

  return (
    <Screen testID="s12b-notifications">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingTop: spacing.xl, gap: spacing.md + 2 }}
      >
        <Eyebrow tone="muted">{c.eyebrow}</Eyebrow>
        <SerifDisplay variant="question">{c.question}</SerifDisplay>
        <Text style={[typography.body, { color: colors.text.body }]}>{c.helper}</Text>

        <View
          style={{
            marginTop: spacing.sm,
            padding: spacing.md + 4,
            borderRadius: radii.group,
            backgroundColor: colors.surface.card,
            borderWidth: 1,
            borderColor: colors.surface.border,
            gap: spacing.sm + 3,
            ...shadows.card,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: 10,
              letterSpacing: 1.3,
              textTransform: 'uppercase',
              color: colors.text.label,
            }}
          >
            {c.previewLabel.replace('{time}', time)}
          </Text>
          <ReminderPreview
            tone="parchment"
            app={c.previewApp}
            when={c.previewWhen}
            body={firstAffirmationOf(answers)}
          />
        </View>

        <Card variant="solid" style={{ backgroundColor: colors.accent.parchment }}>
          <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>{c.note}</Text>
        </Card>
      </ScrollView>

      <View style={{ paddingBottom: spacing.lg, paddingTop: spacing.md, gap: spacing.sm }}>
        <PillButton
          title={canAskAgain ? c.primary : c.openSettings}
          onPress={() => void onPrimary()}
          disabled={busy}
        />
        <TextButton title={c.skip} onPress={onSkip} />
      </View>
    </Screen>
  );
}
