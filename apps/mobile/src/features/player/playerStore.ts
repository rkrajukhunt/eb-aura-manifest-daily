import { create } from 'zustand';

import type { PlaybackSource } from '@aura/shared';

import type { PlayableMoment } from '@/features/moments/useMoments';

/** Transport speeds (10 §4). 1.0 first — the voice is unhurried by design. */
export const SPEEDS = [1.0, 1.25, 1.5] as const;
export type Speed = (typeof SPEEDS)[number];

/** ±15s skip (10 §4). */
export const SKIP_MS = 15_000;

export type PlayerMode = 'listen' | 'read';

interface PlayerState {
  /** What is loaded. Null means nothing has been played this session. */
  moment: PlayableMoment | null;
  /** Cover open vs minimized to the mini-player (06 §2). */
  minimized: boolean;
  playing: boolean;
  positionMs: number;
  durationMs: number;
  speed: Speed;
  mode: PlayerMode;

  /** How she reached this moment — drives `moment_playback_started {source}`. */
  source: PlaybackSource;
  open: (moment: PlayableMoment, source?: PlaybackSource) => void;
  close: () => void;
  minimize: () => void;
  expand: () => void;
  setPlaying: (playing: boolean) => void;
  setPosition: (positionMs: number, durationMs?: number) => void;
  cycleSpeed: () => Speed;
  toggleMode: () => void;
  reset: () => void;
}

/**
 * Global player state (10 §4, 05 §2).
 *
 * State lives in Zustand rather than in the player screen because the audio
 * OUTLIVES the screen: minimizing the cover keeps playback going behind the tab
 * bar, and the mini-player renders from this same store (06 §2). A screen-local
 * hook — which is what Phase 6's Letter uses, correctly, since it is a single
 * self-contained cover — cannot express that.
 *
 * What is NOT here: the `AudioPlayer` instance itself. Keeping a native object
 * in a state store invites stale references across fast-refresh and makes every
 * consumer a potential owner of its lifecycle. The player component owns the
 * instance; this store owns the facts about it.
 */
export const usePlayerStore = create<PlayerState>((set, get) => ({
  moment: null,
  minimized: false,
  playing: false,
  positionMs: 0,
  durationMs: 0,
  speed: 1.0,
  mode: 'listen',
  source: 'home',

  open: (moment, source = 'home') =>
    set({
      moment,
      source,
      minimized: false,
      // Position resets per moment; carrying it over would start a new moment
      // mid-sentence.
      positionMs: 0,
      durationMs: moment.durationMs ?? 0,
      mode: 'listen',
    }),

  close: () => set({ moment: null, minimized: false, playing: false, positionMs: 0 }),
  minimize: () => set({ minimized: true }),
  expand: () => set({ minimized: false }),

  setPlaying: (playing) => set({ playing }),
  setPosition: (positionMs, durationMs) =>
    set(durationMs === undefined ? { positionMs } : { positionMs, durationMs }),

  /** Cycles 1.0 → 1.25 → 1.5 → 1.0 and returns the new value for the player. */
  cycleSpeed: () => {
    const next = SPEEDS[(SPEEDS.indexOf(get().speed) + 1) % SPEEDS.length] ?? 1.0;
    set({ speed: next });
    return next;
  },

  toggleMode: () => set({ mode: get().mode === 'listen' ? 'read' : 'listen' }),

  reset: () =>
    set({
      moment: null,
      minimized: false,
      playing: false,
      positionMs: 0,
      durationMs: 0,
      speed: 1.0,
      mode: 'listen',
      source: 'home',
    }),
}));

/** Where a scrub or skip should land, clamped to the track (10 §4). */
export function clampSeek(targetMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.min(durationMs, Math.max(0, targetMs));
}

/** Progress 0–1, for the mini-player's hairline and the scrubber. */
export function progressOf(positionMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, positionMs / durationMs));
}

/** `m:ss`, for the transport's two time labels. */
export function formatTime(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
