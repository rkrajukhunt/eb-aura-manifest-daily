import { create } from 'zustand';

/**
 * Boot state (05 §2: client state in Zustand, small stores, no server data).
 *
 * `booting → ready | failed`. There is no `error` UI state here on purpose —
 * `failed` carries no code, and the screen renders one in-voice line (05 §8).
 */
export type BootStatus = 'booting' | 'ready' | 'failed';

interface AppState {
  status: BootStatus;
  userId: string | null;
  setReady: (userId: string) => void;
  setFailed: () => void;
  reset: () => void;
}

export const useAppState = create<AppState>((set) => ({
  status: 'booting',
  userId: null,
  setReady: (userId) => set({ status: 'ready', userId }),
  setFailed: () => set({ status: 'failed', userId: null }),
  reset: () => set({ status: 'booting', userId: null }),
}));
