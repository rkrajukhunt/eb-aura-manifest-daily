import type { Session } from '@supabase/supabase-js';

import { AnonymousSignInError, ensureSession } from './auth';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInAnonymously: jest.fn(),
    },
  },
}));

const mockAuth = supabase.auth as jest.Mocked<typeof supabase.auth>;
const session = { user: { id: 'user-1' } } as Session;

/** Skips the real backoff so the retry logic is tested without the wall-clock cost. */
const noSleep = async () => undefined;

describe('ensureSession', () => {
  beforeEach(() => jest.resetAllMocks());

  it('reuses a stored session without signing in again', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session }, error: null } as never);

    await expect(ensureSession(noSleep)).resolves.toBe(session);
    expect(mockAuth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('signs in anonymously on first launch', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
    mockAuth.signInAnonymously.mockResolvedValue({
      data: { session, user: session.user },
      error: null,
    } as never);

    await expect(ensureSession(noSleep)).resolves.toBe(session);
    expect(mockAuth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('retries with backoff when the first launch is offline', async () => {
    // A first launch on a bad connection is common; giving up immediately would
    // mean she cannot use the app at all (05 §3).
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
    mockAuth.signInAnonymously
      .mockResolvedValueOnce({ data: { session: null }, error: { message: 'offline' } } as never)
      .mockResolvedValueOnce({ data: { session: null }, error: { message: 'offline' } } as never)
      .mockResolvedValueOnce({ data: { session, user: session.user }, error: null } as never);

    await expect(ensureSession(noSleep)).resolves.toBe(session);
    expect(mockAuth.signInAnonymously).toHaveBeenCalledTimes(3);
  });

  it('gives up after exhausting retries, with a typed error', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
    mockAuth.signInAnonymously.mockResolvedValue({
      data: { session: null },
      error: { message: 'still offline' },
    } as never);

    await expect(ensureSession(noSleep)).rejects.toBeInstanceOf(AnonymousSignInError);
    // 1 initial attempt + 3 backoff steps.
    expect(mockAuth.signInAnonymously).toHaveBeenCalledTimes(4);
  });

  it('waits between attempts rather than hammering', async () => {
    const sleep = jest.fn(async () => undefined);
    mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
    mockAuth.signInAnonymously
      .mockResolvedValueOnce({ data: { session: null }, error: { message: 'offline' } } as never)
      .mockResolvedValueOnce({ data: { session, user: session.user }, error: null } as never);

    await ensureSession(sleep);

    expect(sleep).toHaveBeenCalledWith(500);
  });
});
