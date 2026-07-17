import * as Haptics from 'expo-haptics';

import {
  beginHapticScreen,
  haptic,
  MAX_PER_SCREEN,
  MIN_INTERVAL_MS,
  resetHaptics,
  setHapticsEnabled,
} from './haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Soft: 'soft', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const impactAsync = Haptics.impactAsync as jest.Mock;
const notificationAsync = Haptics.notificationAsync as jest.Mock;

describe('haptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetHaptics();
  });

  it('fires a mapped haptic', async () => {
    await expect(haptic('primaryButton', 1000)).resolves.toBe(true);
    expect(impactAsync).toHaveBeenCalledWith('light');
  });

  it('uses the success notification for favourite', async () => {
    await haptic('favorite', 1000);

    expect(notificationAsync).toHaveBeenCalledWith('success');
  });

  it('uses a medium impact for a milestone arrival', async () => {
    await haptic('milestoneArrival', 1000);

    expect(impactAsync).toHaveBeenCalledWith('medium');
  });

  describe('the 500ms rule', () => {
    it('does not repeat within 500ms', async () => {
      await haptic('primaryButton', 1000);
      const second = await haptic('primaryButton', 1000 + MIN_INTERVAL_MS - 1);

      expect(second).toBe(false);
      expect(impactAsync).toHaveBeenCalledTimes(1);
    });

    it('fires again once the interval has passed', async () => {
      await haptic('primaryButton', 1000);
      const second = await haptic('primaryButton', 1000 + MIN_INTERVAL_MS);

      expect(second).toBe(true);
      expect(impactAsync).toHaveBeenCalledTimes(2);
    });

    it('suppresses a double-tap rather than buzzing twice', async () => {
      await haptic('primaryButton', 1000);
      await haptic('primaryButton', 1050);
      await haptic('primaryButton', 1100);

      expect(impactAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('the system setting', () => {
    it('fires nothing when haptics are disabled', async () => {
      setHapticsEnabled(false);

      await expect(haptic('primaryButton', 1000)).resolves.toBe(false);
      expect(impactAsync).not.toHaveBeenCalled();
    });

    it('resumes when re-enabled', async () => {
      setHapticsEnabled(false);
      await haptic('primaryButton', 1000);
      setHapticsEnabled(true);

      await expect(haptic('primaryButton', 2000)).resolves.toBe(true);
    });
  });

  describe('the per-screen budget', () => {
    it('warns in dev past the cap', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      beginHapticScreen('TestScreen');

      // Spaced past the 500ms rule so the interval guard isn't what's tested.
      for (let i = 0; i <= MAX_PER_SCREEN; i++) {
        await haptic('primaryButton', 1000 + i * MIN_INTERVAL_MS);
      }

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('TestScreen'));
    });

    it('does not warn within the cap', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      beginHapticScreen('TestScreen');

      await haptic('primaryButton', 1000);
      await haptic('favorite', 1000 + MIN_INTERVAL_MS);

      expect(warn).not.toHaveBeenCalled();
    });

    it('resets the budget on a new screen', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      beginHapticScreen('First');
      await haptic('primaryButton', 1000);
      await haptic('favorite', 1500);

      beginHapticScreen('Second');
      await haptic('primaryButton', 2000);

      expect(warn).not.toHaveBeenCalled();
    });

    it('still fires past the cap — the warning is for us, not a limit on her', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      beginHapticScreen('TestScreen');

      await haptic('primaryButton', 1000);
      await haptic('favorite', 1500);
      const third = await haptic('gratitudeSaved', 2000);

      expect(third).toBe(true);
    });
  });

  describe('the banned haptics (product 13)', () => {
    it('never fires an error notification haptic', async () => {
      // Errors get NO haptic: a buzz on failure is the phone flinching at her,
      // and product 13 bans it outright. There is no 'error' event to fire —
      // this asserts the map has no path to one.
      for (const event of [
        'primaryButton',
        'onboardingContinue',
        'reflectionLanded',
        'letterAudioBegan',
        'letterClosingLine',
        'affirmationReveal',
        'favorite',
        'gratitudeSaved',
        'milestoneArrival',
      ] as const) {
        resetHaptics();
        await haptic(event, 1000);
      }

      expect(notificationAsync).not.toHaveBeenCalledWith('error');
      expect(notificationAsync).not.toHaveBeenCalledWith('warning');
    });
  });
});
