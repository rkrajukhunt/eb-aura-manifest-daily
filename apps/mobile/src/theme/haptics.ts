import * as Haptics from 'expo-haptics';

/**
 * Haptics as punctuation, not decoration (product 13 §haptics).
 *
 * Every fire in the app goes through this module. That is what makes the global
 * rules enforceable rather than aspirational:
 *
 *   - never repeat within 500ms
 *   - ≤2 per screen typical (dev warning past that)
 *   - NEVER on errors — failures stay calm, no buzz of alarm
 *   - NEVER on the paywall — no haptic pressure on a purchase surface
 *
 * The last two are the ones that matter. A haptic on an error is the phone
 * flinching at her; a haptic on a paywall is a nudge toward spending. Both are
 * banned by product doc 13 and neither is expressible here: there is no API for
 * them. That is deliberate — see `HapticEvent`.
 */

/**
 * The complete set of allowed haptics, from the product-13 table. There is no
 * `error` and no `paywall` member, so a banned haptic cannot be written without
 * changing this union — which is a conversation, not an accident.
 */
export type HapticEvent =
  | 'primaryButton'
  | 'onboardingContinue'
  | 'reflectionLanded'
  | 'letterAudioBegan'
  | 'letterClosingLine'
  | 'affirmationReveal'
  | 'favorite'
  | 'gratitudeSaved'
  | 'milestoneArrival';

type Fire = () => Promise<void>;

const impact =
  (style: Haptics.ImpactFeedbackStyle): Fire =>
  () =>
    Haptics.impactAsync(style);
const notify =
  (type: Haptics.NotificationFeedbackType): Fire =>
  () =>
    Haptics.notificationAsync(type);

/** Event → physical feedback, exactly per the product-13 table. */
const HAPTIC_MAP: Record<HapticEvent, Fire> = {
  primaryButton: impact(Haptics.ImpactFeedbackStyle.Light),
  onboardingContinue: impact(Haptics.ImpactFeedbackStyle.Light),
  // "Soft success tick (subtle)" — Soft impact, not the success notification,
  // which is too emphatic for a reflection landing.
  reflectionLanded: impact(Haptics.ImpactFeedbackStyle.Soft),
  /** Single light impact — marks "this is beginning" (product 08). */
  letterAudioBegan: impact(Haptics.ImpactFeedbackStyle.Light),
  letterClosingLine: impact(Haptics.ImpactFeedbackStyle.Soft),
  affirmationReveal: impact(Haptics.ImpactFeedbackStyle.Light),
  favorite: notify(Haptics.NotificationFeedbackType.Success),
  gratitudeSaved: impact(Haptics.ImpactFeedbackStyle.Soft),
  milestoneArrival: impact(Haptics.ImpactFeedbackStyle.Medium),
};

/** Global minimum gap between any two haptics (product 13). */
export const MIN_INTERVAL_MS = 500;
/** Typical cap per screen; exceeding it warns in dev (product 13). */
export const MAX_PER_SCREEN = 2;

let lastFiredAt = 0;
let enabled = true;
let screenCount = 0;
let currentScreen = '';

/** Honours the system setting (product 13). Set false to mute app-wide. */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

/**
 * Called on screen focus. Resets the per-screen budget so the ≤2 rule is
 * measured per screen rather than per session.
 */
export function beginHapticScreen(screenName: string): void {
  currentScreen = screenName;
  screenCount = 0;
}

/** Test seam — resets the module's guards. */
export function resetHaptics(): void {
  lastFiredAt = 0;
  enabled = true;
  screenCount = 0;
  currentScreen = '';
}

/**
 * Fires a haptic, subject to the guards. Returns whether it actually fired,
 * which is what the tests assert on.
 *
 * `now` is injectable so the 500ms rule can be tested without waiting.
 */
export async function haptic(event: HapticEvent, now: number = Date.now()): Promise<boolean> {
  if (!enabled) return false;

  // Never repeat within 500ms — two taps in quick succession must not buzz twice.
  if (now - lastFiredAt < MIN_INTERVAL_MS) return false;

  screenCount += 1;
  if (screenCount > MAX_PER_SCREEN && __DEV__) {
    console.warn(
      `[haptics] ${screenCount} haptics on "${currentScreen || 'unknown screen'}" — product 13 ` +
        `says ≤${MAX_PER_SCREEN} typical. Haptics are punctuation, not decoration.`,
    );
  }

  lastFiredAt = now;
  await HAPTIC_MAP[event]();
  return true;
}
