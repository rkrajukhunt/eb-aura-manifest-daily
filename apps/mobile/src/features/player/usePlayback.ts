import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';

import { configureLetterAudio } from '@/features/letter/audioMode';
import { touchCachedAudio } from '@/features/letter/audioCache';
import { listenedPct } from '@/features/letter/karaoke';
import { recordBeat } from '@/features/affirmations/practice';
import { localDate } from '@/features/gratitude/useGratitude';
import { analytics } from '@/lib/analytics';

import { clampSeek, SKIP_MS, usePlayerStore } from './playerStore';

/**
 * Drives the shared player and keeps the store in step (10 §4).
 *
 * Mounted ONCE, in the tab layout, so the audio survives navigation and the
 * mini-player keeps working while she moves between tabs. The Letter keeps its
 * own screen-scoped hook: it is a single self-contained cover with no
 * mini-player, and giving it the global instance would let a half-finished
 * letter reappear over Home.
 */
export function usePlayback() {
  const moment = usePlayerStore((s) => s.moment);
  const speed = usePlayerStore((s) => s.speed);
  const source = usePlayerStore((s) => s.source);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const setPosition = usePlayerStore((s) => s.setPosition);

  const player = useAudioPlayer(moment?.audioSource ?? null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  const startedRef = useRef<string | null>(null);
  const completedRef = useRef<string | null>(null);
  const openedAtRef = useRef<number>(0);

  useEffect(() => {
    void configureLetterAudio();
  }, []);

  // A new moment plays immediately — she tapped it, that IS the intent.
  useEffect(() => {
    if (!moment?.audioSource) return;
    openedAtRef.current = Date.now();
    player.play();
    touchCachedAudio(moment.id);
  }, [moment?.id, moment?.audioSource, player]);

  useEffect(() => {
    player.setPlaybackRate?.(speed);
  }, [speed, player]);

  useEffect(() => {
    setPlaying(status.playing);
    setPosition(
      status.currentTime * 1000,
      status.duration > 0 ? status.duration * 1000 : undefined,
    );

    if (!moment) return;

    if (startedRef.current !== moment.id && status.playing && status.currentTime > 0) {
      startedRef.current = moment.id;
      // Real attribution: a notification tap and a Home tap are the two
      // numbers this event exists to compare, and hardcoding 'home' made that
      // comparison impossible.
      analytics.capture('moment_playback_started', { source });
      // The <300ms budget (product 13) is only meaningful if it is measured.
      analytics.capture('audio_start_latency_ms', {
        latency_ms: Math.round(Date.now() - openedAtRef.current),
      });

      // Beat one of the daily ritual (product 09). Without this and the
      // gratitude beat, `ritual_completed` could never fire — only the
      // affirmation beat was ever recorded.
      if (recordBeat(localDate(), 'moment').justCompleted) {
        analytics.capture('ritual_completed');
      }
    }
  }, [
    status.playing,
    status.currentTime,
    status.duration,
    moment,
    source,
    setPlaying,
    setPosition,
  ]);

  // Playback failure (product 09 §9.1 error state). Before this the player had
  // no error path: a missing file or a decode failure just sat silent forever.
  useEffect(() => {
    if (!moment) return;

    if (!moment.audioSource) {
      analytics.capture('playback_error', { reason: 'missing_audio' });
      return;
    }

    if (status.isLoaded === false && !status.playing && status.currentTime === 0) {
      analytics.capture('playback_error', { reason: 'decode' });
    }
  }, [moment, status.isLoaded, status.playing, status.currentTime]);

  useEffect(() => {
    if (!moment || !status.didJustFinish || completedRef.current === moment.id) return;
    completedRef.current = moment.id;
    analytics.capture('moment_playback_completed', { listened_pct: 100 });
  }, [status.didJustFinish, moment]);

  const toggle = useCallback(() => {
    if (status.playing) player.pause();
    else player.play();
  }, [status.playing, player]);

  const seekBy = useCallback(
    (deltaMs: number) => {
      const durationMs = status.duration * 1000;
      const target = clampSeek(status.currentTime * 1000 + deltaMs, durationMs);
      void player.seekTo(target / 1000);
    },
    [player, status.currentTime, status.duration],
  );

  const seekTo = useCallback(
    (positionMs: number) => {
      void player.seekTo(clampSeek(positionMs, status.duration * 1000) / 1000);
    },
    [player, status.duration],
  );

  /** Fired when she leaves mid-moment, so drop-off is measurable. */
  const reportDropOff = useCallback(() => {
    if (!moment || completedRef.current === moment.id || startedRef.current !== moment.id) return;
    completedRef.current = moment.id;
    analytics.capture('moment_playback_completed', {
      listened_pct: listenedPct(status.currentTime * 1000, status.duration * 1000),
    });
  }, [moment, status.currentTime, status.duration]);

  return {
    toggle,
    back15: () => seekBy(-SKIP_MS),
    forward15: () => seekBy(SKIP_MS),
    seekTo,
    reportDropOff,
    playing: status.playing,
  };
}
