import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';

import type { ApiException } from '../common/api.exception';
import { EntitlementGuard, REQUIRES_PREMIUM_KEY } from './entitlement.guard';
import type { SubscriptionsService } from './subscriptions.service';

/**
 * Server-side gating (12 §4: "client gating is UX, server gating is truth").
 *
 * The client hides premium features, but a modified client or a replayed request
 * is trivial — so these assert that a free user is refused at the server with
 * the contract's 402, which mobile turns into the locked-feature sheet rather
 * than into an error.
 */
describe('EntitlementGuard', () => {
  let reflector: Reflector;
  let isPremium: jest.Mock;
  let guard: EntitlementGuard;

  const context = (userId?: string): ExecutionContext =>
    ({
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({ userId }) }),
    }) as unknown as ExecutionContext;

  const markRoute = (requiresPremium: boolean) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiresPremium);

  beforeEach(() => {
    reflector = new Reflector();
    isPremium = jest.fn().mockResolvedValue(false);
    guard = new EntitlementGuard(reflector, {
      isPremium,
    } as unknown as SubscriptionsService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('lets any request through a route that is not premium-gated', async () => {
    markRoute(false);

    await expect(guard.canActivate(context('user-1'))).resolves.toBe(true);
    // And does not spend a database read deciding that.
    expect(isPremium).not.toHaveBeenCalled();
  });

  it('reads the flag from the REQUIRES_PREMIUM_KEY metadata', async () => {
    const spy = markRoute(false);

    await guard.canActivate(context('user-1'));

    expect(spy).toHaveBeenCalledWith(REQUIRES_PREMIUM_KEY, expect.any(Array));
  });

  it('admits a premium user to a gated route', async () => {
    markRoute(true);
    isPremium.mockResolvedValue(true);

    await expect(guard.canActivate(context('user-1'))).resolves.toBe(true);
  });

  it('refuses a free user with entitlement_required', async () => {
    markRoute(true);
    isPremium.mockResolvedValue(false);

    await expect(guard.canActivate(context('user-1'))).rejects.toMatchObject({
      key: 'entitlement_required',
    });
  });

  it('answers 402, which mobile maps to the locked sheet (07 §5)', async () => {
    markRoute(true);

    const error = await guard.canActivate(context('user-1')).catch((e: ApiException) => e);

    expect((error as ApiException).getStatus()).toBe(402);
  });

  it('leaks no vendor or account detail in the refusal', async () => {
    markRoute(true);

    const error = await guard.canActivate(context('user-1')).catch((e: ApiException) => e);

    expect(JSON.stringify((error as ApiException).getResponse())).not.toContain('user-1');
  });

  it('treats a missing user as a misconfigured route, not as a free user', async () => {
    markRoute(true);

    await expect(guard.canActivate(context(undefined))).rejects.toMatchObject({
      key: 'unauthorized',
    });
    expect(isPremium).not.toHaveBeenCalled();
  });
});
