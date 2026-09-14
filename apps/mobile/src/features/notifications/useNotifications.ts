import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { palette } from '@/theme/palette';

/**
 * The Android notification channel id (11 §2).
 *
 * Android 8+ DROPS any notification whose channel does not exist, and the
 * channel — not the message — owns importance, sound and heads-up behaviour.
 * Named `default` so a push that omits `channelId` (Expo's own fallback) still
 * lands in this configured channel rather than an OS-created silent one. The
 * backend sends this exact id (see notifications.service.ts).
 */
export const ANDROID_NOTIFICATION_CHANNEL_ID = 'default';

/**
 * Configures how notifications DISPLAY — the foreground handler and the Android
 * channel — separately from asking for permission or registering a token.
 *
 * Idempotent and permission-free, so it is called once on every boot before the
 * token is ever requested: the channel must exist before any push can render,
 * and the handler must be set before one can arrive while the app is open.
 */
export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    // Show the moment even if she is already in the app — it is content she
    // asked for, not an interruption. No badge (11 §1: no unread scorekeeping).
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
      name: 'Your moments',
      importance: Notifications.AndroidImportance.HIGH,
      // No `sound` key: the channel falls back to the system default tone. A
      // string here is read as a CUSTOM sound file (default.wav) that would have
      // to be bundled via the expo-notifications plugin `sounds` array — which we
      // don't ship, so passing 'default' only logged a "sound not found" warning.
      vibrationPattern: [0, 200, 100, 200],
      lightColor: palette.ember,
    });
  }
}

/**
 * Permission, token registration and open attribution (11 §1–§2, §5).
 *
 * The app NEVER local-schedules a content notification (11 §1): the content is
 * not known ahead of time and the arrival time is server-driven, so anything
 * scheduled here could only be a guess. This module's whole job is to give the
 * backend an address and to report back when she opens one.
 */

/**
 * The outcome of the whole ask, not just the OS answer.
 *
 * `granted` alone was never enough to promise she will hear from us: below
 * Android 13 notifications are granted at install, so `granted` is true before
 * anything has been asked or registered. Only a token in `notification_tokens`
 * means a moment can actually reach her, so the caller gets both.
 */
export interface PermissionOutcome {
  granted: boolean;
  registered: boolean;
}

/** Asks the OS, records the answer, and registers the device on success. */
export async function requestPermissionAndRegister(userId: string): Promise<PermissionOutcome> {
  const existing = await Notifications.getPermissionsAsync();
  const status =
    existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();

  const granted = status.status === 'granted';
  analytics.capture('notification_permission_result', { granted });

  if (!granted) return { granted, registered: false };

  return { granted, registered: await registerToken(userId) };
}

/**
 * Writes this device's Expo push token (11 §1). Returns whether it landed.
 *
 * Upserted on the token itself, so reinstalling or re-granting does not
 * accumulate duplicate rows — and re-activates a token the backend previously
 * retired as `DeviceNotRegistered`.
 *
 * Failures are LOGGED in dev, not swallowed. This used to end in a bare
 * `catch {}` on the reasoning that notifications are a bonus surface — but the
 * common failure here is not transient: `getExpoPushTokenAsync` throws outright
 * when `extra.eas.projectId` is missing, so an unset `EAS_PROJECT_ID` left every
 * install permanently unreachable with no token row, no log line and a
 * permission sheet that looked like it had worked.
 */
export async function registerToken(userId: string): Promise<boolean> {
  // A simulator has no push token; asking for one throws rather than returning
  // null, and a failed registration must never break a launch.
  if (!Device.isDevice) return false;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (!token) return false;

    const { error } = await supabase.from('notification_tokens').upsert(
      {
        user_id: userId,
        expo_push_token: token,
        device_id: Device.modelId ?? null,
        active: true,
      },
      { onConflict: 'expo_push_token' },
    );

    if (error) {
      if (__DEV__) {
        console.warn(`[notifications] push token upsert failed: ${error.message}`);
      }
      return false;
    }
    return true;
  } catch (error) {
    // Still non-fatal to the launch, but no longer invisible in dev.
    if (__DEV__) {
      console.warn('[notifications] token registration failed:', error);
    }
    return false;
  }
}

/**
 * Reports that she opened a notification (11 §5).
 *
 * This is the half of auto-soften that the BACKEND cannot observe. Without it
 * `ignored_arrival_count` only ever climbs, and a user who is simply busy for
 * three mornings gets quietly dropped to three-a-week with no way back. Any
 * open resets the counter and unsoftens.
 *
 * TWO writes, and the second is the one that was missing. Resetting the counter
 * alone is not enough: `soften-notifications` recounts `notification_sends`
 * rows that are older than 36 hours and still have `opened_at IS NULL`. Nothing
 * ever wrote that column, so those rows stayed unopened forever and the nightly
 * sweep re-incremented from them every single night — meaning EVERY user
 * softened within about three days, permanently, no matter how faithfully she
 * opened her notifications. The reset below would be undone by the next 4am run.
 *
 * Marks every outstanding send rather than one, which matches the policy the
 * counter already implements (`recordOpened` zeroes it wholesale rather than
 * decrementing): coming back restores the normal rhythm immediately instead of
 * making her earn it back one morning at a time.
 */
export async function reportNotificationOpened(userId: string): Promise<void> {
  analytics.capture('moment_arrival_notification_opened');

  await supabase
    .from('notification_prefs')
    .upsert(
      { user_id: userId, ignored_arrival_count: 0, softened: false },
      { onConflict: 'user_id' },
    );

  // `opened_at` is the only column of `notification_sends` the client may write
  // (see the column grant in the notifications migration).
  await supabase
    .from('notification_sends')
    .update({ opened_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('opened_at', null);
}

export interface NotificationPrefs {
  arrivalEnabled: boolean;
  affirmationNudge: 'quiet' | 'once_daily' | 'custom_hours';
}

/** Her preferences, read and written directly via Supabase (07: no endpoint). */
export function useNotificationPrefs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    arrivalEnabled: true,
    affirmationNudge: 'quiet',
  });
  // The prefs above are HARD DEFAULTS, not her stored state. Until the initial
  // read resolves, a toggle must not be written: upserting the defaults over
  // stored rows is how a pre-load tap silently overwrote her real choices (M20).
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoaded(false);

    void supabase
      .from('notification_prefs')
      .select('arrival_enabled, affirmation_nudge')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          setPrefs({
            arrivalEnabled: data.arrival_enabled,
            affirmationNudge: data.affirmation_nudge,
          });
        }
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const update = useCallback(
    async (next: Partial<NotificationPrefs>) => {
      if (!loaded) return; // Stored state unknown yet — nothing to merge against.
      const merged = { ...prefs, ...next };
      setPrefs(merged);

      if (!userId) return;
      const { error } = await supabase.from('notification_prefs').upsert(
        {
          user_id: userId,
          arrival_enabled: merged.arrivalEnabled,
          affirmation_nudge: merged.affirmationNudge,
        },
        { onConflict: 'user_id' },
      );
      if (error && __DEV__) {
        console.warn(`[notifications] prefs upsert failed: ${error.message}`);
      }
    },
    [loaded, prefs, userId],
  );

  return { prefs, update, loaded };
}
