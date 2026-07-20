import { kv, STORAGE_KEYS } from '@/lib/storage';

import {
  markDeniedHintShown,
  markPermissionAsked,
  shouldAskPermission,
  shouldShowDeniedHint,
} from './permissionGate';

/**
 * When the OS notification dialog may appear (11 §2).
 *
 * The deferral is not politeness, it is sequencing: product 08 forbids anything
 * between the letter and the paywall, and product 07 keeps the dialog out of
 * onboarding so S11 can capture her arrival time without a system alert
 * interrupting the conversation. These tests are what stop it drifting earlier.
 */
describe('permissionGate', () => {
  beforeEach(() => kv.delete(STORAGE_KEYS.notificationGate));

  describe('shouldAskPermission', () => {
    it('does NOT ask before the paywall has been seen', () => {
      // Asking here would put a system dialog inside the wow funnel.
      expect(shouldAskPermission(false)).toBe(false);
    });

    it('asks on the first Home landing after the paywall', () => {
      expect(shouldAskPermission(true)).toBe(true);
    });

    it('never asks twice, whatever she answered', () => {
      markPermissionAsked(true);

      expect(shouldAskPermission(true)).toBe(false);
    });

    it('treats declining as asked — the dialog never returns uninvited', () => {
      // "Not now" is a real answer, not a deferral to next launch.
      markPermissionAsked(true);

      expect(shouldAskPermission(true)).toBe(false);
    });

    it('stays pending if the paywall was seen but the ask never happened', () => {
      markPermissionAsked(false);

      expect(shouldAskPermission(true)).toBe(true);
    });
  });

  describe('the denied-state hint (11 §2 — once a week, max)', () => {
    const NOW = Date.UTC(2026, 6, 20, 12, 0, 0);
    const WEEK = 7 * 86_400_000;

    it('may show the first time', () => {
      expect(shouldShowDeniedHint(NOW)).toBe(true);
    });

    it('stays quiet for the rest of the week', () => {
      markDeniedHintShown(NOW);

      expect(shouldShowDeniedHint(NOW + 86_400_000)).toBe(false);
      expect(shouldShowDeniedHint(NOW + WEEK - 1000)).toBe(false);
    });

    it('may show again after a week', () => {
      markDeniedHintShown(NOW);

      expect(shouldShowDeniedHint(NOW + WEEK)).toBe(true);
    });

    it('never nags — a week is the floor, not a schedule', () => {
      // Shown once, then silent: nothing here escalates or repeats sooner.
      markDeniedHintShown(NOW);
      markDeniedHintShown(NOW);

      expect(shouldShowDeniedHint(NOW + 3 * 86_400_000)).toBe(false);
    });
  });
});
