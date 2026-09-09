import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

import { configureLetterAudio } from '@/features/letter/audioMode';
import { touchCachedAudio } from '@/features/letter/audioCache';
import { listenedPct } from '@/features/letter/karaoke';
import { recordBeat } from '@/features/affirmations/practice';
import { localDate } from '@/features/gratitude/useGratitude';
import { analytics } from '@/lib/analytics';

import { pickSource } from './pickSource';
import { clampSeek, SKIP_MS, usePlayerStore } from './playerStore';

/**
 * Drives the shared player and keeps the store in step (10 §4).
 *
 * Mounted ONCE, in the tab layout, so the audio survives navigation and the
 * playback keeps running while she moves between tabs. The Letter keeps its
 * own screen-scoped hook: it is a single self-contained cover with no
 * global player, and giving it the global instance would let a half-finished
 * letter reappear over Home.
 */
export function usePlayback() {
  const moment = usePlayerStore((s) => s.moment);
  const speed = usePlayerStore((s) => s.speed);
  const source = usePlayerStore((s) => s.source);
  const ambientEnabled = usePlayerStore((s) => s.ambientEnabled);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const setPosition = usePlayerStore((s) => s.setPosition);

  const setControls = usePlayerStore((s) => s.setControls);

  // One file, one player: the baked voice+bed mp3 when ambient is on and the
  // moment has one, else the voice-only file. Never a second AudioPlayer.
  const audioSrc = pickSource(moment, ambientEnabled);
  const player = useAudioPlayer(audioSrc, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  const startedRef = useRef<string | null>(null);
  const completedRef = useRef<string | null>(null);
  const openedAtRef = useRef<number>(0);

  // The transport callbacks read position/duration through this ref so they stay
  // stable across the 4Hz status ticks — otherwise every tick would rebuild them
  // and re-register a new controls object into the store.
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    void configureLetterAudio();
  }, []);

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
    if (statusRef.current.playing) player.pause();
    else player.play();
  }, [player]);

  const play = useCallback(() => {
    if (moment?.audioSource) {
      openedAtRef.current = Date.now();
      touchCachedAudio(moment.id);
    }
    player.play();
  }, [moment, player]);
  const pause = useCallback(() => player.pause(), [player]);

  // No background playback: when the app leaves the foreground, pause the voice.
  // This is the moment player only — the Letter runs its own player/session and
  // is not touched, so a locked screen mid-letter still continues (its design).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') player.pause();
    });
    return () => sub.remove();
  }, [player]);

  const seekBy = useCallback(
    (deltaMs: number) => {
      const s = statusRef.current;
      const durationMs = s.duration * 1000;
      const target = clampSeek(s.currentTime * 1000 + deltaMs, durationMs);
      void player.seekTo(target / 1000);
    },
    [player],
  );

  const seekTo = useCallback(
    (positionMs: number) => {
      void player.seekTo(clampSeek(positionMs, statusRef.current.duration * 1000) / 1000);
    },
    [player],
  );

  /** Fired when she leaves mid-moment, so drop-off is measurable. */
  const reportDropOff = useCallback(() => {
    const s = statusRef.current;
    if (!moment || completedRef.current === moment.id || startedRef.current !== moment.id) return;
    completedRef.current = moment.id;
    analytics.capture('moment_playback_completed', {
      listened_pct: listenedPct(s.currentTime * 1000, s.duration * 1000),
    });
  }, [moment]);

  // One transport object, driving the one AudioPlayer. The player screen pulls
  // this from the store rather than mounting its own usePlayback (which would
  // start a second player and play the moment twice).
  const controls = useMemo(
    () => ({
      toggle,
      play,
      pause,
      back15: () => seekBy(-SKIP_MS),
      forward15: () => seekBy(SKIP_MS),
      seekTo,
      reportDropOff,
    }),
    [toggle, play, pause, seekBy, seekTo, reportDropOff],
  );

  useEffect(() => {
    setControls(controls);
  }, [controls, setControls]);

  // Only the true unmount (app teardown) clears the transport; a re-register
  // above must not blank it in between.
  useEffect(() => () => setControls(null), [setControls]);

  return { ...controls, playing: status.playing };
}
