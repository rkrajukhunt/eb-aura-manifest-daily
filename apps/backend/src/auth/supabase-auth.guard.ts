import {
  Inject,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { jwtVerify, type JWTPayload } from 'jose';
import type { Request } from 'express';

import { ApiException } from '../common/api.exception';
import type { Env } from '../config/env.schema';
import { JWKS_RESOLVER, type JwksResolver } from './jwks.provider';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  isAnonymousUser?: boolean;
}

/**
 * Verifies the Supabase access token and puts `sub` on the request (03 §3).
 *
 * Verification is asymmetric (ES256) against the project's JWKS — no shared
 * secret ever reaches this service, which is the posture 03 §3 prefers. `jose`
 * caches the key set and refetches only on an unknown `kid`, so this costs no
 * network round-trip per request and stays correct across key rotation.
 *
 * An anonymous user is a real, fully authenticated user (03 §2: "an account
 * exists from second one"). This guard does NOT reject them — gating on
 * entitlement or claim status is a separate concern, handled where it belongs.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly issuer: string;

  constructor(
    private readonly reflector: Reflector,
    config: ConfigService<Env, true>,
    @Inject(JWKS_RESOLVER) private readonly jwks: JwksResolver,
  ) {
    this.issuer = new URL('/auth/v1', config.get('SUPABASE_URL', { infer: true })).toString();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) throw ApiException.unauthorized('Missing bearer token');

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
        // Tolerate a little client clock skew rather than 401ing a real user whose
        // device is a few seconds off (03 §2 edge cases).
        clockTolerance: '10s',
      }));
    } catch (error) {
      // Expired/garbage tokens are routine — mobile refreshes and retries once
      // (03 §2). Log at debug so this never becomes noise, and never log the token.
      this.logger.debug(`JWT rejected: ${error instanceof Error ? error.message : 'unknown'}`);
      throw ApiException.unauthorized('Invalid or expired token');
    }

    if (typeof payload.sub !== 'string' || payload.sub === '') {
      throw ApiException.unauthorized('Token has no subject');
    }

    request.userId = payload.sub;
    request.isAnonymousUser = payload.is_anonymous === true;

    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;

  const [scheme, value] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;

  return value;
}
