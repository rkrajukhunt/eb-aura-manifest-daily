import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { PillButton, Screen, SerifDisplay, TextButton } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { markPermissionAsked } from '@/features/notifications/permissionGate';
import { requestPermissionAndRegister } from '@/features/notifications/useNotifications';
import { analytics } from '@/lib/analytics';
import { useAppState } from '@/stores/appState';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { haptic } from '@/theme/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { completeOnboarding } from '../commit';
import { ritualTimeOf } from '../derive';

const PROMISE_ICON: readonly (keyof typeof Ionicons.glyphMap)[] = [
  'time-outline',
  'leaf-outline',
  'toggle-outline',
];

/**
 * The notification pre-prompt (design 22): a clear notification illustration,
 * the question, then three lightweight promises. "Yes, remind me" asks the OS;
 * "Not now" offers the second chance.
 *
 * This screen finishes onboarding on a yes: it stamps completion and hands
 * off to the generation ritual. It draws no progress header.
 */
export function S12Notifications() {
  const router = useRouter();
  const { colors, radii, spacing, typography } = useTheme();
  const userId = useAppState((s) => s.userId);
  const answers = useOnboardingDraft((s) => s.answers);
  const [busy, setBusy] = useState(false);
  const c = onboardingCopy.s12Notifications;
  const time = ritualTimeOf(answers);

  useEffect(() => {
    analytics.capture('onboarding_screen_viewed', { screen_id: 's12-notifications' });
  }, []);

  const finish = async (ask: boolean): Promise<void> => {
    if (busy || !userId) return;
    setBusy(true);
    void haptic('onboardingContinue');

    try {
      if (ask) {
        const { granted } = await requestPermissionAndRegister(userId);
        if (granted) {
          markPermissionAsked(true);
          await completeOnboarding(userId);
          router.replace('/(onboarding)/generating');
          return;
        }
      }
      // Declined at the OS, or "Not now": one warm second chance, shown once.
      router.push('/(onboarding)/s12b-notifications');
    } finally {
      // Left un-busy on a sync failure so she can retry rather than stall.
      setBusy(false);
    }
  };

  return (
    <Screen testID="s12-notifications">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingTop: spacing.xl, gap: spacing.lg + 4 }}
      >
        <View
          style={{
            minHeight: 220,
            borderRadius: radii.group,
            backgroundColor: colors.accent.parchment,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: 142,
              height: 142,
              borderRadius: 71,
              backgroundColor: colors.surface.card,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.accent.emberSoft,
            }}
          >
            <Ionicons name="notifications-outline" size={76} color={colors.accent.emberDeep} />
          </View>
          <Ionicons
            name="sparkles-outline"
            size={24}
            color={colors.accent.emberDeep}
            style={{ position: 'absolute', top: 34, right: '24%' }}
          />
          <Ionicons
            name="sparkles-outline"
            size={18}
            color={colors.accent.emberDeep}
            style={{ position: 'absolute', bottom: 30, left: '25%' }}
          />
        </View>

        <SerifDisplay variant="question">{c.question.replace('{time}', time)}</SerifDisplay>

        <View style={{ gap: spacing.md }}>
          {c.promises.map((promise, i) => (
            <View
              key={promise.title}
              style={{
                flexDirection: 'row',
                gap: spacing.md + 1,
                alignItems: 'flex-start',
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.accent.parchment,
                }}
              >
                <Ionicons name={PROMISE_ICON[i]} size={17} color={colors.accent.emberDeep} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  style={{
                    fontFamily: fonts.sansSemiBold,
                    fontSize: 15,
                    color: colors.text.primary,
                  }}
                >
                  {promise.title}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
                  {promise.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ paddingBottom: spacing.lg, paddingTop: spacing.md, gap: spacing.sm }}>
        <PillButton title={c.primary} onPress={() => void finish(true)} disabled={busy} />
        <TextButton title={c.skip} onPress={() => void finish(false)} />
      </View>
    </Screen>
  );
}
