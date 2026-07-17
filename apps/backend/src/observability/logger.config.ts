import { createHash } from 'node:crypto';

import type { Params } from 'nestjs-pino';

/**
 * Structured logging (04 §7). Two rules this config exists to enforce:
 *   1. `user_id` is hashed — logs identify a user across lines without storing the uuid.
 *   2. No user content, ever. Logs are not a place where a struggle can leak (04 §8).
 */

/**
 * Stable short hash of a Supabase uuid, for correlating log lines.
 * Not a security boundary — a uuid isn't secret — just a way to avoid printing
 * raw ids in a system where the id joins to someone's whole emotional history.
 */
export function hashUserId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').slice(0, 12);
}

/** Header/body keys that must never be logged. */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.apikey',
  'req.headers.cookie',
  'req.headers["x-revenuecat-auth"]',
  'req.body',
  'res.headers["set-cookie"]',
];

export function buildLoggerConfig(env: {
  NODE_ENV: string;
  isProduction: boolean;
}): NonNullable<Params['pinoHttp']> {
  return {
    level: env.NODE_ENV === 'test' ? 'silent' : env.isProduction ? 'info' : 'debug',

    // Human-readable locally; raw JSON in production for the log pipeline. The key
    // is omitted rather than set to undefined so pino doesn't load a transport at all.
    ...(env.isProduction
      ? {}
      : { transport: { target: 'pino-pretty', options: { singleLine: true } } }),

    redact: { paths: REDACT_PATHS, remove: true },

    // Health checks would otherwise be most of the log volume.
    autoLogging: {
      ignore: (req) => (req as { url?: string }).url?.startsWith('/v1/health') ?? false,
    },

    customProps: (req) => {
      const userId = (req as { userId?: string }).userId;
      // Populated once SupabaseAuthGuard sets req.userId (Phase 2).
      return userId ? { user: hashUserId(userId) } : {};
    },

    serializers: {
      // Default serializers include the full body; keep this to routing facts only.
      req: (req: { id: unknown; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
    },
  };
}
