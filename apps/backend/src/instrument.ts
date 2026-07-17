import * as Sentry from '@sentry/nestjs';

/**
 * Sentry must initialise before any other import is evaluated, so this file is
 * imported first in main.ts and does its work as a side effect (04 §7).
 *
 * Env is read raw here — the zod-validated ConfigService doesn't exist this early.
 * A missing DSN disables Sentry rather than failing boot, which is what we want
 * locally and in tests.
 */
const dsn = process.env.SENTRY_DSN_BACKEND;

Sentry.init({
  // Omit the key entirely when unset — Sentry treats an absent dsn as "disabled",
  // which is what we want locally and in CI.
  ...(dsn ? { dsn } : {}),
  environment: process.env.NODE_ENV ?? 'development',

  // Slow-transaction traces on the generation pipeline are the point (04 §7).
  // Full sampling below production would drown out the signal we actually watch.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // 00 §D10 / 04 §8: user text exists only in Postgres and Storage. Sentry must
  // never become a second, unaudited copy of it.
  sendDefaultPii: false,

  beforeSend(event) {
    // Request bodies can carry desire_text / refine notes. Drop them entirely.
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});
