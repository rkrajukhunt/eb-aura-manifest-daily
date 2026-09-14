import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { analytics } from '@/lib/analytics';
import { haptic } from '@/theme/haptics';

import { configureLetterAudio } from './audioMode';

/**
 * How long a letter may stay silent before she is offered it to read instead.
 *
 * Short on purpose, and safe to be short because the fallback UNDOES itself the
 * moment audio starts (see the `status.playing` effect below). A premature
 * fallback on a slow network therefore costs a brief glimpse of the text before
 * the voice takes over; too LONG a wait costs her a blank screen she has no
 * reason to believe will ever change. Measured on device, the real failure sits
 * at ~0.7s and a cached local file starts instantly (10 §3), so five seconds is
 * far past either.
 */
const AUDIO_LOAD_TIMEOUT_MS = 5_000;
import { closingLineIndex, lineIndexAt, listenedPct, type KaraokeLine } from './karaoke';

export interface LetterPlayback {
  /** Absolute playback position, driven at frame rate for the renderer (10 §5). */
  positionMs: SharedValue<number>;
  playing: SharedValue<number>;
  /** True once the audio has run to its end. */
  ended: boolean;
  /**
   * The audio will never play: the source failed to load, or there is none.
   *
   * Distinct from "not started yet", and the distinction is the whole point.
   * Everything on this screen is driven by playback position, so without this
   * flag a file ExoPlayer cannot read leaves her on a blank screen with no
   * ending and no way out — which is exactly what shipped (see LetterScreen.test).
   */
  failed: boolean;
  durationMs: number;
  /** 0–100, for the drop-off event when she leaves early. */
  currentPct: () => number;
}

/**
 * Drives Letter playback and its two haptic beats (product 08 §8).
 *
 * POSITION (10 §5): the status callback fires only a few times a second, which
 * is far too coarse for karaoke — words would land in visible steps. So a frame
 * callback advances the position between callbacks, and every status callback
 * SNAPS it back to the absolute truth. That is the drift guard: interpolation
 * makes it smooth, re-anchoring makes it correct, and nothing accumulates error.
 * A background pause, a seek, or a stalled buffer all self-correct on the next
 * status update instead of sliding permanently out of sync.
 *
 * HAPTICS run off the status callback rather than the frame callback on purpose.
 * ~100ms precision is imperceptible for a haptic, and firing from the UI thread
 * would mean a `runOnJS` hop every frame for something that must happen twice in
 * ninety seconds. Twice — the haptic module's own ≤2-per-screen budget is
 * exactly this screen's spec.
 */
export function useLetterPlayback(
  source: string | null,
  lines: KaraokeLine[],
  fallbackDurationMs: number | null,
): LetterPlayback {
  const player = useAudioPlayer(source ?? null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);

  const positionMs = useSharedValue(0);
  const playing = useSharedValue(0);

  const startedRef = useRef(false);
  const tickedRef = useRef(false);
  const completedRef = useRef(false);
  const lastPositionRef = useRef(0);

  const closingIndex = closingLineIndex(lines);

  // Media-channel playback, so the silent switch does not mute the wow (10 §4).
  useEffect(() => {
    void configureLetterAudio();
  }, []);

  useEffect(() => {
    if (source) player.play();
  }, [source, player]);

  // Interpolate between status callbacks. Guarded on `playing` so a paused
  // letter does not keep sliding forward under a frozen audio stream.
  useFrameCallback((frame) => {
    'worklet';
    if (playing.value === 0) return;
    positionMs.value += frame.timeSincePreviousFrame ?? 0;
  });

  useEffect(() => {
    playing.value = status.playing ? 1 : 0;

    // The absolute re-anchor. This is the line that keeps karaoke honest.
    const absolute = status.currentTime * 1000;
    positionMs.value = absolute;
    lastPositionRef.current = absolute;

    // Beat one: a single light impact as the first word begins (product 08 §3).
    if (!startedRef.current && status.playing && absolute > 0) {
      startedRef.current = true;
      void haptic('letterAudioBegan');
      analytics.capture('letter_playback_started');
    }

    // Beat two: a soft tick on the closing date line (product 08 §8).
    const line = lineIndexAt(lines, absolute);
    if (!tickedRef.current && closingIndex >= 0 && line >= closingIndex) {
      tickedRef.current = true;
      void haptic('letterClosingLine');
    }
  }, [status.playing, status.currentTime, lines, closingIndex, playing, positionMs]);

  /**
   * Whether the audio has given up, decided from what the platform ACTUALLY
   * reports rather than from what its types promise.
   *
   * `AudioStatus.error` exists and is documented, but Android never populates it
   * for a source ExoPlayer cannot parse — measured on device 2026-07-24, where a
   * malformed mp3 produced exactly this and nothing else:
   *
   *   {error: null, isLoaded: false, playbackState: "buffering"}
   *   {error: null, isLoaded: false, playbackState: "idle"}
   *
   * So `error` is kept as the fast path where a platform does set it, and the
   * real signal is the settle: something that tried to load, never loaded, and
   * has now gone idle. The timeout is the backstop for the third case — a load
   * that neither succeeds nor reports anything at all — because a wrong guess
   * here costs her the whole letter.
   */
  const [audioFailed, setAudioFailed] = useState(false);
  const attemptedRef = useRef(false);

  // M24: this assignment used to run mid-render (fragile under concurrent
  // rendering); it lives in an effect now. A load is "attempted" once the
  // platform reports either a buffer or a loaded asset.
  useEffect(() => {
    if (status.playbackState === 'buffering' || status.isLoaded) attemptedRef.current = true;
  }, [status.playbackState, status.isLoaded]);

  useEffect(() => {
    if (status.error) setAudioFailed(true);
  }, [status.error]);

  useEffect(() => {
    // Idle after a load attempt, with nothing loaded, is ExoPlayer having
    // errored out. Guarded on `attemptedRef` because `idle` is also the state
    // BEFORE loading starts, and firing then would cut every letter short.
    if (attemptedRef.current && status.playbackState === 'idle' && !status.isLoaded) {
      setAudioFailed(true);
    }
  }, [status.playbackState, status.isLoaded]);

  useEffect(() => {
    // A source that recovers — a slow network that finally lands — takes the
    // screen back out of the fallback.
    if (status.playing) setAudioFailed(false);
  }, [status.playing]);

  useEffect(() => {
    setAudioFailed(false);
    attemptedRef.current = false;
    if (source === null) return;

    const timer = setTimeout(() => {
      if (!startedRef.current) setAudioFailed(true);
    }, AUDIO_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [source]);

  const durationMs = status.duration > 0 ? status.duration * 1000 : (fallbackDurationMs ?? 0);

  useEffect(() => {
    if (!status.didJustFinish || completedRef.current) return;
    completedRef.current = true;
    analytics.capture('letter_playback_completed', { listened_pct: 100 });
  }, [status.didJustFinish]);

  // Leaving early is still a completion event — drop-off is the number that
  // tells us whether the wow is landing (product 08).
  useEffect(() => {
    return () => {
      if (completedRef.current || !startedRef.current) return;
      completedRef.current = true;
      analytics.capture('letter_playback_completed', {
        listened_pct: listenedPct(lastPositionRef.current, durationMs),
      });
    };
  }, [durationMs]);

  // `source === null` counts as failure, not as "still loading": `useLetter`
  // resolves the path inside its query before the letter is handed over, so a
  // null here means the mp3 could not be resolved at all. Waiting on it would
  // hang forever on the same blank screen `status.error` now rescues.
  const failed = source === null || audioFailed;

  return {
    positionMs,
    playing,
    ended: status.didJustFinish,
    failed,
    durationMs,
    currentPct: () => listenedPct(lastPositionRef.current, durationMs),
  };
}
