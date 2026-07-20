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

  // iOS-only at V1 (05 §1, product 05). No `android` or `web` block on purpose —
  // Android lands at V3 and there is no web surface.
  platforms: ['ios'],

  ios: {
    bundleIdentifier: `${BRAND.bundleIdentifier}${suffix}`,
    supportsTablet: false,
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
    [
      // The Letter's playback (10 §4). `microphonePermission: false` DELETES
      // NSMicrophoneUsageDescription, which the plugin would otherwise add by
      // default: Aura never records, and shipping a microphone prompt for a
      // capability the product does not have is exactly the "data harvest smell"
      // product 02 and 18 are built to avoid.
      'expo-audio',
      { microphonePermission: false },
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
