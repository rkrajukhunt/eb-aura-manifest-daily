import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';

import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

/**
 * Permission, token registration and open attribution (11 §1–§2, §5).
 *
 * The app NEVER local-schedules a content notification (11 §1): the content is
 * not known ahead of time and the arrival time is server-driven, so anything
 * scheduled here could only be a guess. This module's whole job is to give the
 * backend an address and to report back when she opens one.
 */

/** Asks the OS, records the answer, and registers the device on success. */
export async function requestPermissionAndRegister(userId: string): Promise<{ granted: boolean }> {
  const existing = await Notifications.getPermissionsAsync();
  const status =
    existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();

  const granted = status.status === 'granted';
  analytics.capture('notification_permission_result', { granted });

  if (granted) await registerToken(userId);
  return { granted };
}

/**
 * Writes this device's Expo push token (11 §1).
 *
 * Upserted on the token itself, so reinstalling or re-granting does not
 * accumulate duplicate rows — and re-activates a token the backend previously
 * retired as `DeviceNotRegistered`.
 */
export async function registerToken(userId: string): Promise<void> {
  // A simulator has no push token; asking for one throws rather than returning
  // null, and a failed registration must never break a launch.
  if (!Device.isDevice) return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    if (!token) return;

    await supabase.from('notification_tokens').upsert(
      {
        user_id: userId,
        expo_push_token: token,
        device_id: Device.modelId ?? null,
        active: true,
      },
      { onConflict: 'expo_push_token' },
    );
  } catch {
    // Silent: notifications are a bonus surface, not a launch dependency.
  }
}

/**
 * Reports that she opened a notification (11 §5).
 *
 * This is the half of auto-soften that the BACKEND cannot observe. Without it
 * `ignored_arrival_count` only ever climbs, and a user who is simply busy for
 * three mornings gets quietly dropped to three-a-week with no way back. Any
 * open resets the counter and unsoftens.
 */
export async function reportNotificationOpened(userId: string): Promise<void> {
  analytics.capture('moment_arrival_notification_opened');

  await supabase
    .from('notification_prefs')
    .upsert(
      { user_id: userId, ignored_arrival_count: 0, softened: false },
      { onConflict: 'user_id' },
    );
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

  useEffect(() => {
    if (!userId) return;
    let active = true;

    void supabase
      .from('notification_prefs')
      .select('arrival_enabled, affirmation_nudge')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        setPrefs({
          arrivalEnabled: data.arrival_enabled,
          affirmationNudge: data.affirmation_nudge,
        });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const update = useCallback(
    async (next: Partial<NotificationPrefs>) => {
      const merged = { ...prefs, ...next };
      setPrefs(merged);

      if (!userId) return;
      await supabase.from('notification_prefs').upsert(
        {
          user_id: userId,
          arrival_enabled: merged.arrivalEnabled,
          affirmation_nudge: merged.affirmationNudge,
        },
        { onConflict: 'user_id' },
      );
    },
    [prefs, userId],
  );

  return { prefs, update };
}
