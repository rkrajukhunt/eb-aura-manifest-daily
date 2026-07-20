import { setAudioModeAsync } from 'expo-audio';

/**
 * The Letter's audio session (10 §4).
 *
 * `playsInSilentMode` is the important one: the Letter plays through the MEDIA
 * channel, so the hardware silent switch does not mute it — standard for media
 * apps, and the difference between the wow landing and a silent screen for every
 * user who keeps their phone on silent (which is most of them).
 *
 * `doNotMix` takes exclusive focus: the letter is 60–90 seconds of someone's own
 * voice speaking to them, and podcast audio underneath it would be grotesque.
 *
 * `shouldPlayInBackground` keeps it alive if she locks the screen mid-letter —
 * the audio continues and the karaoke re-syncs on return (Phase 6 edge cases).
 */
export async function configureLetterAudio(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });
}

/**
 * The system volume, 0–1, or `null` when the platform will not tell us.
 *
 * Product 08 §4 asks for a pre-check when her volume is at zero. `expo-audio`
 * exposes only the PLAYER's volume, never the device's, so on iOS this currently
 * cannot be answered without an additional native module — and a wrong guess
 * here is worse than silence: telling someone to turn their sound on when it is
 * already on is the app being wrong at the most delicate moment it has.
 *
 * So this returns `null` and the pre-check stays quiet. Wiring a real reading is
 * a native-module decision (see the Phase 6 notes in the plan); the seam exists
 * so that lands as a one-line change rather than a rewrite.
 */
export async function readSystemVolume(): Promise<number | null> {
  return null;
}

/**
 * Whether to show the "turn your sound on" pre-check. Only true when we KNOW the
 * volume is zero — an unknown reading never nags.
 */
export function shouldPromptForSound(volume: number | null): boolean {
  return volume !== null && volume <= 0;
}
