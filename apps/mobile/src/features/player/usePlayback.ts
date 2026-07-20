import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';

import { configureLetterAudio } from '@/features/letter/audioMode';
import { touchCachedAudio } from '@/features/letter/audioCache';
import { listenedPct } from '@/features/letter/karaoke';
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
      analytics.capture('moment_playback_started', { source: 'home' });
      // The <300ms budget (product 13) is only meaningful if it is measured.
      analytics.capture('audio_start_latency_ms', {
        latency_ms: Math.round(Date.now() - openedAtRef.current),
      });
    }
  }, [status.playing, status.currentTime, status.duration, moment, setPlaying, setPosition]);

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
