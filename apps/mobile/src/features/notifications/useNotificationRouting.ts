import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { hasSeenLetter } from '@/features/letter/keepLetter';
import type { Profile } from '@/hooks/useProfile';
import { analytics } from '@/lib/analytics';

import { isNotificationLaunch, parseDeepLink, resolveDeepLink } from './deepLink';
import { reportNotificationOpened } from './useNotifications';

/**
 * Routes a tapped notification, and reports the open (11 §3, §5).
 *
 * Handles BOTH cases, which are genuinely different: a tap while the app is
 * running fires the listener, while a tap that launched the app from cold has
 * already happened by the time React mounts and must be read from
 * `getLastNotificationResponseAsync`. Missing the cold-start path would mean
 * every notification tapped from a killed app silently landed on Home — the
 * most common case in practice, since the whole point is arriving in the morning
 * before she has opened anything.
 *
 * Reporting the open is not incidental. The backend can observe a SEND but never
 * an open, so without this call `ignored_arrival_count` only ever climbs and a
 * merely busy week quietly drops her to three notifications a week for good.
 */
export function useNotificationRouting(
  userId: string | undefined,
  profile: Pick<Profile, 'onboarding_completed_at'> | undefined,
  hasLetter: boolean,
  /**
   * Derived from the SESSION, not the profile row: linking an identity does not
   * rewrite `profiles.is_anonymous`, so the row would keep claiming she is
   * anonymous long after she signed in. Undefined while the check is in flight.
   */
  claimed: boolean | undefined,
): void {
  const router = useRouter();

  useEffect(() => {
    if (!userId || !profile || claimed === undefined) return;
    let active = true;

    const gate = {
      claimed,
      onboardingComplete: Boolean(profile.onboarding_completed_at),
      hasLetter,
      letterSeen: hasSeenLetter(),
    };

    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!active || !response) return;

      const data = response.notification.request.content.data as Record<string, unknown>;
      if (!isNotificationLaunch(data)) return;

      const kind = typeof data.kind === 'string' ? data.kind : null;

      // Only an arrival open resets the auto-soften counter (11 §5) — an
      // affirmation nudge open must not count as a "heard" moment.
      if (kind === 'moment_arrival') {
        void reportNotificationOpened(userId);
      } else if (kind === 'affirmation_nudge') {
        analytics.capture('affirmation_nudge_opened');
      }

      const url = typeof data.url === 'string' ? data.url : null;
      router.push(resolveDeepLink(parseDeepLink(url), gate) as never);
    };

    // Cold start: the tap already happened before anything mounted.
    void Notifications.getLastNotificationResponseAsync().then(handle);

    // Warm: she tapped while the app was running or backgrounded.
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);

    return () => {
      active = false;
      subscription.remove();
    };
  }, [userId, profile, hasLetter, claimed, router]);
}
