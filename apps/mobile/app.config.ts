import type { ExpoConfig } from 'expo/config';

/**
 * Brand is isolated to this file (01 §2, product 00 §7 Q1).
 *
 * Locked by the founder 2026-07-17: brand name "Aura: Manifest Daily"
 * (display name + ASO title); bundle id com.aura.manifestdaily (Phase 0).
 * The bundle id is permanent once submitted — App Store Connect will not change it.
 */
const BRAND = {
  /** Home-screen name. Keep short — iOS truncates past ~12 characters. */
  displayName: 'Aura',
  /** ASO title (product 19). The full locked brand name. */
  storeTitle: 'Aura: Manifest Daily',
  bundleIdentifier: 'com.aura.manifestdaily',
  scheme: 'aura',
} as const;

/** EAS profile driving this build (16 §2). */
type BuildEnv = 'development' | 'staging' | 'production';
const buildEnv = (process.env.APP_ENV ?? 'development') as BuildEnv;

/** Staging and dev get distinct ids + names so all three can coexist on one device. */
const variant: Record<BuildEnv, { suffix: string; nameSuffix: string }> = {
  development: { suffix: '.dev', nameSuffix: ' (Dev)' },
  staging: { suffix: '.staging', nameSuffix: ' (Staging)' },
  production: { suffix: '', nameSuffix: '' },
};

const { suffix, nameSuffix } = variant[buildEnv];

const config: ExpoConfig = {
  name: `${BRAND.displayName}${nameSuffix}`,
  description: BRAND.storeTitle,
  slug: 'aura-manifest-daily',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: BRAND.scheme,

  // Dark mode is a day-one requirement, not a Phase 12 polish item (05 §4, product 12).
  userInterfaceStyle: 'automatic',

  // iOS + Android. No `web` block on purpose — there is no web surface.
  //
  // Android was iOS-only at V1 per 05 §1; that line is now updated. The App
  // Store remains the V1 *launch* target, but the Android build config is real
  // rather than a local adb hack, so a dev build stays reproducible. Two things
  // are still open before Android can actually ship — both founder-blocked and
  // tracked in 05 §1: FCM credentials for push, and a Play Billing key.
  platforms: ['ios', 'android'],

  android: {
    package: `${BRAND.bundleIdentifier}${suffix}`,

    // The Android counterpart to `microphonePermission: false` below. Google
    // Play prints every manifest permission on the store listing, so a stray
    // RECORD_AUDIO is the same "data harvest smell" product 02/18 exist to
    // avoid — worse here, because it is visible before install. The plugin
    // option removes it at the source; this blocks it if a transitive plugin
    // adds it back.
    blockedPermissions: ['android.permission.RECORD_AUDIO'],

    // FCM credentials (11 §2). Android push is inert without this file. No
    // Firebase project exists yet, so the var is unset and the build simply
    // has no push transport — the app runs, notifications do not arrive.
    // The file itself is a credential: never commit it.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? undefined,
  },

  ios: {
    bundleIdentifier: `${BRAND.bundleIdentifier}${suffix}`,
    supportsTablet: false,
    // Sign in with Apple — the primary claim path (03 §2.2) and required by the
    // App Store whenever third-party login is offered. This flag adds the
    // entitlement; the capability must also be enabled on the App Store Connect
    // identifier before a build will install.
    usesAppleSignIn: true,
    config: {
      // Product 12: the app never asks for location. Declared so a plugin can't quietly add it.
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      // The Letter and daily moments keep playing when she locks the screen (05 §7, 10 §4).
      UIBackgroundModes: ['audio'],
    },
  },

  plugins: [
    'expo-router',
    // Required for RevenueCat, Skia and MMKV native modules (05 §1).
    'expo-dev-client',
    '@sentry/react-native/expo',
    // Push arrives from the backend only — the app never local-schedules
    // content (11 §1), so no permission strings beyond the OS default are added.
    'expo-notifications',
    [
      // The Letter's playback (10 §4). `microphonePermission: false` DELETES
      // NSMicrophoneUsageDescription, which the plugin would otherwise add by
      // default: Aura never records, and shipping a microphone prompt for a
      // capability the product does not have is exactly the "data harvest smell"
      // product 02 and 18 are built to avoid.
      'expo-audio',
      {
        microphonePermission: false,
        // The Android half of the same decision. This option DEFAULTS TO TRUE:
        // leaving it off would have put `android.permission.RECORD_AUDIO` in
        // the manifest of an app that never records.
        recordAudioAndroid: false,
        // Left at its default `true`, which is what mirrors iOS's
        // UIBackgroundModes: ['audio'] — it adds FOREGROUND_SERVICE,
        // FOREGROUND_SERVICE_MEDIA_PLAYBACK and the media-session service so
        // the Letter keeps playing with the screen locked (05 §7, 10 §4).
        enableBackgroundPlayback: true,
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    buildEnv,
    eas: {
      // Populated by `eas init` when the EAS project is created (16 §2).
      projectId: process.env.EAS_PROJECT_ID ?? undefined,
    },
  },
};

export default config;
