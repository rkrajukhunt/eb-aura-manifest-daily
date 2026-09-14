/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExpoConfig } from 'expo/config';
import fs from 'fs';
import path from 'path';

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

/**
 * EAS profile driving this build (16 §2).
 *
 * Rides along in `extra` as `buildEnv` (read on-device via expo-constants,
 * since Metro does not inline non-EXPO_PUBLIC_ vars). It does NOT vary the app
 * identity — see below.
 */
type BuildEnv = 'development' | 'staging' | 'production';
const buildEnv = (process.env.APP_ENV ?? 'development') as BuildEnv;

// Resolve paths to the config files
const resolveConfigPath = (fileVar: string | undefined): string | null => {
  if (!fileVar) return null;
  return path.isAbsolute(fileVar) ? fileVar : path.resolve(__dirname, fileVar);
};

const googleServicesJsonPath = resolveConfigPath(
  process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
);
const googleServicesInfoPlistPath = resolveConfigPath(
  process.env.GOOGLE_SERVICES_INFO_PLIST ?? './GoogleService-Info.plist',
);

const hasAndroidGoogleServices = googleServicesJsonPath
  ? fs.existsSync(googleServicesJsonPath)
  : false;
const hasIosGoogleServices = googleServicesInfoPlistPath
  ? fs.existsSync(googleServicesInfoPlistPath)
  : false;

// Detect target platforms during build/prebuild
const isIosBuild =
  process.env.EAS_BUILD_PLATFORM === 'ios' ||
  process.argv.includes('ios') ||
  process.argv.includes('--platform=ios') ||
  process.argv.some((arg) => arg.includes('run:ios'));

const isAndroidBuild =
  process.env.EAS_BUILD_PLATFORM === 'android' ||
  process.argv.includes('android') ||
  process.argv.includes('--platform=android') ||
  process.argv.some((arg) => arg.includes('run:android'));

// Enable Firebase config plugins only when the config file for the targeted platform is present on disk.
const includeFirebase = (() => {
  if (isIosBuild) return hasIosGoogleServices;
  if (isAndroidBuild) return hasAndroidGoogleServices;
  return hasIosGoogleServices && hasAndroidGoogleServices;
})();

/**
 * Store-build env guard.
 *
 * `src/lib/env.ts` treats the RevenueCat keys and legal URLs as OPTIONAL, and for
 * a dev build that is right: the paywall degrades to free tier and the footer
 * omits a link it has no URL for. For a build real people pay money in it is
 * wrong — an unset RevenueCat key ships a paywall that can never complete a
 * purchase, absent legal links fail store review, and a missing Google config
 * file ships a sign-in button that fails on every tap. None of those announce
 * themselves at build time, which is how they reach a store in the first place.
 *
 * Keyed off `EAS_BUILD_PROFILE` — set only on an EAS builder — so local
 * `expo run:ios` / `run:android` are completely unaffected. Keyed off
 * `EAS_BUILD_PLATFORM` too, so an Android build is never blocked by a missing
 * iOS credential or the reverse.
 *
 * Deliberately scoped to the `production` profile only: `preview` is internal
 * distribution and is allowed to be partially configured. Add 'preview' here if
 * you want the same protection for internal testers.
 */
const STORE_BUILD_PROFILES = new Set(['production']);

if (STORE_BUILD_PROFILES.has(process.env.EAS_BUILD_PROFILE ?? '')) {
  const platform = process.env.EAS_BUILD_PLATFORM;

  const required: Record<string, string | undefined> = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    // Both are required before a subscription build passes review (product 12 §6).
    EXPO_PUBLIC_TERMS_URL: process.env.EXPO_PUBLIC_TERMS_URL,
    EXPO_PUBLIC_PRIVACY_URL: process.env.EXPO_PUBLIC_PRIVACY_URL,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // RevenueCat issues one key PER STORE and rejects the other platform's key,
    // so each is required only for its own build.
    ...(platform === 'ios'
      ? {
          EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
          GOOGLE_SERVICES_INFO_PLIST: process.env.GOOGLE_SERVICES_INFO_PLIST,
        }
      : {}),
    ...(platform === 'android'
      ? {
          EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
          GOOGLE_SERVICES_JSON: process.env.GOOGLE_SERVICES_JSON,
        }
      : {}),
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Store build (profile=production, platform=${platform ?? 'unknown'}) is missing ` +
        `required env: ${missing.join(', ')}.\n` +
        `Public EXPO_PUBLIC_* values belong in eas.json's "base.env"; the two Google ` +
        `config files must be uploaded as EAS file secrets:\n` +
        `  eas secret:create --scope project --name GOOGLE_SERVICES_INFO_PLIST --type file --value ./apps/mobile/GoogleService-Info.plist\n` +
        `  eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./apps/mobile/google-services.json\n` +
        `See .env.example for what each one is.`,
    );
  }
}

/**
 * ONE IDENTITY, EVERY ENVIRONMENT (founder decision, 2026-07-29).
 *
 * Local dev, staging, preview and production all build `com.aura.manifestdaily`
 * named "Aura". The per-variant `.dev`/`.staging` suffixes that used to derive
 * these are gone — not defaulted to empty, removed — because a suffix here is
 * not a cosmetic choice: the bundle id is the join key for Firebase's OAuth
 * client, the Google id_token audience, RevenueCat's app, and App Store Connect.
 * A build whose id drifts by one suffix cannot sign in with Google at all, which
 * is exactly how the stale `com.aura.manifestdaily.dev` native project ended up
 * with no Google URL scheme.
 *
 * The value is pinned to `BUNDLE_ID` in GoogleService-Info.plist / the package
 * name in google-services.json. If it ever changes, both Firebase apps must be
 * re-registered — it is not a local edit.
 *
 * Consequence to keep in mind: the variants no longer coexist on a device —
 * installing one replaces the others. And Firebase needs every signing SHA-1
 * that can produce this package (debug keystore for local dev, EAS keystore for
 * internal/preview, Play App Signing for the store) on the one Android app.
 */
const config: ExpoConfig = {
  owner: 'empreror-brains',
  name: BRAND.displayName,
  description: BRAND.storeTitle,
  slug: 'aura',
  version: '1.0.2',
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

  icon: './assets/brand/icon.png',

  android: {
    // Must equal `client_info.android_client_info.package_name` in google-services.json.
    package: BRAND.bundleIdentifier,
    adaptiveIcon: {
      foregroundImage: './assets/brand/adaptive-icon.png',
      backgroundColor: '#ECE9DF',
      monochromeImage: './assets/brand/monochrome-icon.png',
    },

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
    //
    // Spread rather than `?? undefined`: under `exactOptionalPropertyTypes` an
    // explicit `undefined` is not assignable to an optional property.
    ...(hasAndroidGoogleServices ? { googleServicesFile: googleServicesJsonPath as string } : {}),
  },

  ios: {
    // Must equal `BUNDLE_ID` in GoogleService-Info.plist, or the native Google
    // module resolves a CLIENT_ID that does not belong to this app.
    bundleIdentifier: BRAND.bundleIdentifier,
    supportsTablet: false,
    icon: './assets/brand/icon.png',
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
      // App Tracking Transparency (spec §7): shown once before GA4 uses the IDFA
      // for ad attribution. A denial is fine — GA4 works without it.
      NSUserTrackingUsageDescription:
        'Aura uses this to measure which ads led people here, so we can reach the right people. It never accesses your personal content.',
      // Firebase Analytics must wait for the ATT decision. `initGa4` explicitly
      // enables collection after the request completes in the boot sequence.
      FIREBASE_ANALYTICS_COLLECTION_ENABLED: false,
      // SKAdNetwork lets iOS attribute installs to ads without the IDFA. Google's
      // network id; add ad partners' ids here as campaigns expand.
      SKAdNetworkItems: [{ SKAdNetworkIdentifier: 'cstr6suwn9.skadnetwork' }],
    },

    // The iOS counterpart to `android.googleServicesFile`, and the reason Google
    // sign-in works on iOS at all. The google-signin plugin's iOS half reads
    // REVERSED_CLIENT_ID out of this plist and appends it as a CFBundleURLScheme
    // — that scheme is where Google's OAuth callback lands. With this key unset
    // the plugin's iOS mod silently no-ops: the button renders and every tap
    // fails, because the native module also reads its CLIENT_ID from here.
    //
    // Spread for the same `exactOptionalPropertyTypes` reason as Android above.
    // The file is a credential: never commit it.
    ...(hasIosGoogleServices ? { googleServicesFile: googleServicesInfoPlistPath as string } : {}),
  },

  plugins: [
    // Must be FIRST: Expo composes withXcodeProject mods in reverse-registration
    // order (last-registered runs first), so registering earliest = running last —
    // which is what we need in order to see expo-dev-launcher's build phase and
    // stamp `alwaysOutOfDate = 1;` on it.
    './plugins/withSilencedBuildPhases',
    'expo-router',
    [
      // Splash mirrors the design tokens (src/theme/palette.ts, Aura Design v3
      // "Ember & Bone"): bone in light, the warm dark base in dark. Configured
      // here so prebuild regenerates the native splash from the brand, never
      // from template defaults.
      'expo-splash-screen',
      {
        // The image is NOT decoration here — it is required. This plugin
        // version writes `windowSplashScreenAnimatedIcon → @drawable/
        // splashscreen_logo` into styles.xml unconditionally, but only
        // GENERATES that drawable when an image is configured. Colour-only
        // therefore fails Android resource linking on any clean build, which
        // is exactly how it failed the first time this was built from scratch.
        //
        // The mark is the Orb, rendered from the light-theme orb tokens
        // (bone → emberSoft → ember, lit upper-left) so the splash and the
        // app's central motif cannot drift apart.
        image: './assets/brand/splash-icon.png',
        // Larger mark (was 180) so the orb reads on the splash rather than
        // floating small; the art feathers to transparent at its edges so it
        // blends into the background with no square around it.
        imageWidth: 220,
        backgroundColor: '#FDEBC9',
        dark: {
          image: './assets/brand/splash-icon-dark.png',
          backgroundColor: '#171410',
        },
      },
    ],
    // Required for RevenueCat, Skia and MMKV native modules (05 §1).
    'expo-dev-client',
    // Push arrives from the backend only — the app never local-schedules
    // content (11 §1), so no permission strings beyond the OS default are added.
    //
    // `icon` + `color` control the Android status-bar notification: Android
    // renders only the icon's ALPHA as a silhouette and tints it with `color`,
    // so a full-colour app icon would show as a white square. The monochrome
    // brand mark is already a transparent silhouette, so it doubles as the
    // notification icon; the ember tint matches the app's voice accent. (The
    // channel — importance/sound — is created at runtime, see useNotifications.)
    [
      'expo-notifications',
      {
        icon: './assets/brand/monochrome-icon.png',
        color: '#E2682F',
      },
    ],
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
    // Sign-in is the first screen now (03 §2.1), and Google is offered on BOTH
    // platforms — Android via google-services.json, iOS via GoogleService-Info.plist.
    //
    // Registered with NO OPTIONS on purpose. Passing an options object (e.g.
    // `iosUrlScheme`) switches the plugin to its "without Firebase" mode, which
    // sets the iOS URL scheme and DROPS all three Android Gradle mods — that
    // would silently break the working Android build. No-options mode runs the
    // Firebase path for both platforms, reading the reversed client id out of
    // whichever config file each platform has. The WEB client id the JS side
    // sends is a separate value in EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (src/lib/env.ts).
    //
    // Added ONLY when at least one platform's config file exists. The plugin
    // pulls in the `com.google.gms.google-services` Gradle plugin, which fails
    // the Android build outright if google-services.json is absent — so
    // including it unconditionally would mean no Google project, no build at
    // all. With neither file the gate hides the button (features/auth/google).
    ...(includeFirebase
      ? [
          '@react-native-google-signin/google-signin' as any,
          '@react-native-firebase/app' as any,
          '@react-native-firebase/analytics' as any,
        ]
      : []),
    // Must accompany the plugin above on iOS: without it `pod install`
    // fails on AppCheckCore's non-modular dependencies and there is no
    // iOS build at all. See plugins/withGoogleSignInPods.js.
    './plugins/withGoogleSignInPods' as any,
    [
      // React Native Firebase requires STATIC frameworks on iOS. Same
      // static-linkage class of issue already handled for AppCheckCore in
      // plugins/withGoogleSignInPods.js — verify a clean `pod install`.
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
          // Build React Native from source instead of using the prebuilt
          // ReactNativeDependencies/React-Core-prebuilt XCFrameworks.
          //
          // The prebuilt core ships without RN's debug-only symbols, but the
          // third-party pods that are still compiled FROM SOURCE (RNScreens,
          // RNGestureHandler, RNReanimated, RNGoogleSignin) reference them from
          // their ShadowNode/Props vtables. The result is a Debug link that dies
          // with ~180 undefined symbols — `facebook::react::Sealable::Sealable()`,
          // `ShadowNode::getDebugName/getDebugValue/getDebugChildren() const`,
          // `BaseViewProps::getDebugProps() const` — plus RCTPackagerConnection
          // and RCTReconnectingWebSocket from expo-dev-launcher.
          //
          // The `ld: warning` about SwiftUICore printed just above that list is
          // NOT the cause: it is a benign implicit-autolink warning coming from
          // ExpoModulesCore's swiftinterface, and it is still emitted on a green
          // build. Chasing it instead of the undefined symbols leads nowhere.
          buildReactNativeFromSource: true,
        },
      },
    ] as any,
    // The App Tracking Transparency prompt (spec §7); the usage string is in
    // ios.infoPlist above.
    'expo-tracking-transparency',
  ],

  experiments: {
    typedRoutes: true,
  },

  updates: {
    url: 'https://u.expo.dev/d9ec1b00-6bd1-4535-8a38-0a7bad13752e',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },

  extra: {
    buildEnv,
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? 'd9ec1b00-6bd1-4535-8a38-0a7bad13752e',
    },
    // Expose whether Google Sign-In is configured with client files for the targeted build
    hasGoogleSignInConfig: includeFirebase,
  },
};

export default config;
