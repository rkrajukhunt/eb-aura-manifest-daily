import * as Sentry from '@sentry/react-native';

/**
 * Sentry init, imported first from the root layout (05 §8: Sentry captures the
 * technical detail; the user only ever sees in-voice copy).
 *
 * Privacy posture mirrors the backend (00 §D10, 14): the user's words live in
 * Postgres and Storage — never in a crash report. Phase 2 adds `setUser({ id })`
 * with the Supabase uuid and nothing else.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN_MOBILE,
  environment: process.env.APP_ENV ?? 'development',

  // A crash report must never carry her name, city, struggle or letter text.
  sendDefaultPii: false,

  // Breadcrumbs auto-capture text input values; that is exactly the content we exclude.
  enableCaptureFailedRequests: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,

  beforeBreadcrumb(breadcrumb) {
    // Drop UI breadcrumbs that can carry typed content.
    if (breadcrumb.category === 'touch' || breadcrumb.category === 'ui.input') {
      return null;
    }
    return breadcrumb;
  },
});
