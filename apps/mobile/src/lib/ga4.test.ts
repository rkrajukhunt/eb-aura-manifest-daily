// jest-expo's Constants.expoConfig is not writable, so mock a mutable one the
// test can drive per case.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { buildEnv: undefined } } },
}));

import {
  getAnalytics,
  logEvent,
  setAnalyticsCollectionEnabled,
} from '@react-native-firebase/analytics';
import Constants from 'expo-constants';

import { initGa4, isGa4Enabled, logGa4Event } from './ga4';

const mockLogEvent = logEvent as jest.Mock;
const mockSetEnabled = setAnalyticsCollectionEnabled as jest.Mock;
const mockGetAnalytics = getAnalytics as jest.Mock;

/**
 * What an unconfigured native Firebase does: `getAnalytics()` throws
 * SYNCHRONOUSLY, before any promise exists to attach a `.catch()` to.
 */
function breakNativeFirebase(): void {
  mockGetAnalytics.mockImplementation(() => {
    throw new Error("No Firebase App '[DEFAULT]' has been created - call firebase.initializeApp()");
  });
}

/**
 * Drives the REAL runtime source. GA4 reads `Constants.expoConfig.extra.buildEnv`
 * (baked in by app.config at build time), NOT `process.env.APP_ENV` — Metro does
 * not inline the latter into the device bundle, so a test on `process.env` would
 * validate a source that is always undefined on-device. Set the value the app
 * actually reads.
 */
function setBuildEnv(buildEnv: string | undefined): void {
  (Constants.expoConfig!.extra as Record<string, unknown>).buildEnv = buildEnv;
}

describe('ga4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Both the production AND preview EAS profiles bake APP_ENV=production, so a
  // store-bound build (including a preview verification build) resolves to
  // 'production' here — that single value is the enable gate.
  it('enables collection in a store-bound build (buildEnv=production)', () => {
    setBuildEnv('production');
    initGa4();

    expect(isGa4Enabled()).toBe(true);
    expect(mockSetEnabled).toHaveBeenCalledWith(expect.anything(), true);
  });

  it('disables collection in development — a complete no-op', async () => {
    setBuildEnv('development');
    initGa4();

    expect(isGa4Enabled()).toBe(false);
    expect(mockSetEnabled).toHaveBeenCalledWith(expect.anything(), false);

    await logGa4Event('purchase');
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  it('disables collection on staging — internal builds never report to GA4', async () => {
    setBuildEnv('staging');
    initGa4();

    expect(isGa4Enabled()).toBe(false);
    await logGa4Event('purchase');
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  it('disables collection when buildEnv is absent — the real device default was undefined', async () => {
    setBuildEnv(undefined);
    initGa4();

    expect(isGa4Enabled()).toBe(false);
    await logGa4Event('purchase');
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  /**
   * The ATT gate (M11): GA4 is the ad-conversion sink, so a denied/restricted
   * prompt keeps collection off even in a store build — a grant is the only
   * way reports flow to Google.
   */
  it('stays off in a store build when she denied the ATT prompt', async () => {
    setBuildEnv('production');
    initGa4(false);

    expect(isGa4Enabled()).toBe(false);
    await logGa4Event('purchase');
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  it('logs a name-only event when enabled', async () => {
    setBuildEnv('production');
    initGa4(true);

    await logGa4Event('purchase');
    expect(mockLogEvent).toHaveBeenCalledWith(expect.anything(), 'purchase');
  });

  /**
   * A dev client built without the Firebase plist has no native `[DEFAULT]` app.
   * Analytics is instrumentation: it must never be the reason the app fails to
   * boot. This is the crash that took the whole app down at the `initGa4` step.
   */
  describe('when the native Firebase app was never configured', () => {
    it('does not throw out of initGa4', () => {
      setBuildEnv('production');
      breakNativeFirebase();

      expect(() => initGa4()).not.toThrow();
      // Collection cannot be on when the SDK it needs is absent.
      expect(isGa4Enabled()).toBe(false);
    });

    it('does not throw out of logGa4Event', async () => {
      setBuildEnv('production');
      breakNativeFirebase();
      initGa4();

      await expect(logGa4Event('purchase')).resolves.toBeUndefined();
    });
  });
});
