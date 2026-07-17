import { type ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWK } from 'jose';

import { ApiException } from '../common/api.exception';
import type { JwksResolver } from './jwks.provider';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SupabaseAuthGuard } from './supabase-auth.guard';

/** Derived from jose itself — the key type's name has changed across majors. */
type PrivateKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

const SUPABASE_URL = 'http://supabase.local';
const ISSUER = 'http://supabase.local/auth/v1';

/**
 * Guard unit tests (Phase 2).
 *
 * A real ES256 keypair signs the tokens and a local JWKS resolves them, so these
 * exercise genuine signature verification — no network, and no mocked `jwtVerify`
 * that would assert nothing. Same code path as production; only the key source differs.
 */
describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let reflector: Reflector;
  let privateKey: PrivateKey;
  let publicJwk: JWK;
  let jwks: JwksResolver;

  const buildContext = (headers: Record<string, string> = {}) => {
    const request: Record<string, unknown> = { headers };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
      __request: request,
    } as unknown as ExecutionContext & { __request: Record<string, unknown> };
  };

  const sign = async (payload: Record<string, unknown>, exp = '1h') =>
    new SignJWT(payload)
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime(exp)
      .sign(privateKey);

  beforeAll(async () => {
    const keyPair = await generateKeyPair('ES256');
    privateKey = keyPair.privateKey;
    publicJwk = { ...(await exportJWK(keyPair.publicKey)), kid: 'test-key', alg: 'ES256' };
  });

  beforeEach(() => {
    jwks = createLocalJWKSet({ keys: [publicJwk] }) as JwksResolver;
    reflector = new Reflector();
    guard = new SupabaseAuthGuard(
      reflector,
      { get: () => SUPABASE_URL } as unknown as ConfigService<never, true>,
      jwks,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('accepts a valid token and exposes the verified sub', async () => {
    const context = buildContext({ authorization: `Bearer ${await sign({ sub: 'user-1' })}` });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.__request.userId).toBe('user-1');
  });

  it('treats an anonymous user as authenticated (03 §2: an account exists from second one)', async () => {
    const token = await sign({ sub: 'anon-1', is_anonymous: true });
    const context = buildContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.__request.userId).toBe('anon-1');
    expect(context.__request.isAnonymousUser).toBe(true);
  });

  it('rejects an expired token', async () => {
    const token = await sign({ sub: 'user-1' }, '-1h');
    const context = buildContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ApiException);
  });

  it('rejects a garbage token', async () => {
    const context = buildContext({ authorization: 'Bearer not-a-jwt' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ApiException);
  });

  it('rejects a token signed by the wrong key', async () => {
    // The forgery case: well-formed, right claims, wrong signer.
    const attacker = await generateKeyPair('ES256');
    const token = await new SignJWT({ sub: 'victim' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(attacker.privateKey);

    await expect(
      guard.canActivate(buildContext({ authorization: `Bearer ${token}` })),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('rejects a token from another issuer', async () => {
    const token = await new SignJWT({ sub: 'user-1' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuer('https://evil.example/auth/v1')
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(privateKey);

    await expect(
      guard.canActivate(buildContext({ authorization: `Bearer ${token}` })),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('rejects a token with no subject', async () => {
    const context = buildContext({ authorization: `Bearer ${await sign({})}` });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ApiException);
  });

  it('rejects a missing Authorization header', async () => {
    await expect(guard.canActivate(buildContext())).rejects.toBeInstanceOf(ApiException);
  });

  it('rejects a non-bearer scheme', async () => {
    const context = buildContext({ authorization: 'Basic dXNlcjpwYXNz' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ApiException);
  });

  it('lets a @Public() route through without a token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
  });

  it('reads the public flag from the IS_PUBLIC_KEY metadata', async () => {
    const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    await guard.canActivate(buildContext());

    expect(spy).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
  });
});
