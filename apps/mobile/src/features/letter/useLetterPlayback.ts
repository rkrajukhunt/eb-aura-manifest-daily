import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { analytics } from '@/lib/analytics';
import { haptic } from '@/theme/haptics';

import { configureLetterAudio } from './audioMode';
import { closingLineIndex, lineIndexAt, listenedPct, type KaraokeLine } from './karaoke';

export interface LetterPlayback {
  /** Absolute playback position, driven at frame rate for the renderer (10 §5). */
  positionMs: SharedValue<number>;
  playing: SharedValue<number>;
  /** True once the audio has run to its end. */
  ended: boolean;
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

  return {
    positionMs,
    playing,
    ended: status.didJustFinish,
    durationMs,
    currentPct: () => listenedPct(lastPositionRef.current, durationMs),
  };
}
