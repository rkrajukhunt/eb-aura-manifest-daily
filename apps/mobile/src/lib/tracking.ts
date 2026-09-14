import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { Platform } from 'react-native';

/**
 * The iOS App Tracking Transparency ask (spec §7), reporting whether tracking
 * is allowed afterwards — GA4 (the ad-conversion sink) is only enabled when the
 * user granted it (M11).
 *
 * iOS only — Android has no ATT. Asks at most once: if the OS has already
 * recorded a decision (granted/denied/restricted) we never re-prompt. Android
 * and a prior grant both count as "tracking allowed" (no IDFA gate exists
 * there); a denial or restriction means "reduced, non-IDFA only", which the
 * catalog treats as off.
 */
export async function requestTrackingPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') return true;

  const { status } = await getTrackingPermissionsAsync();
  if (status === 'granted') return true;
  if (status !== 'undetermined') return false;

  const { status: asked } = await requestTrackingPermissionsAsync();
  return asked === 'granted';
}
