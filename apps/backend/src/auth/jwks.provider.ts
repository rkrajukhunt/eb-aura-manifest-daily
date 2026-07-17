import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet } from 'jose';

import type { Env } from '../config/env.schema';

/** DI token for the key resolver `jwtVerify` calls. */
export const JWKS_RESOLVER = Symbol('JwksResolver');

/**
 * The resolver's shape — whatever `createRemoteJWKSet` / `createLocalJWKSet` return.
 * Derived from jose so a version bump that renames its key types doesn't break us.
 */
export type JwksResolver = ReturnType<typeof createRemoteJWKSet>;

/**
 * Fetching the key set is a dependency, so it's injected rather than constructed
 * inside the guard. Production resolves against the project's JWKS over HTTP;
 * tests supply a local key set. Neither needs the other to exist.
 *
 * `jose` caches the fetched keys and refetches only on an unseen `kid`, so this
 * costs no per-request round-trip and still survives key rotation (03 §3).
 */
export const jwksProvider = {
  provide: JWKS_RESOLVER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): JwksResolver =>
    createRemoteJWKSet(
      new URL('/auth/v1/.well-known/jwks.json', config.get('SUPABASE_URL', { infer: true })),
    ),
};
