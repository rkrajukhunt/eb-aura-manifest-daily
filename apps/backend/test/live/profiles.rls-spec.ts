import {
  anonClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from './helpers';

/**
 * RLS suite for `profiles` and `onboarding_answers` (15 §2.4 — required CI suite).
 *
 * This is the pattern every later table copies, so it is deliberately exhaustive.
 * The stakes: mobile talks to Postgres directly (00 §D1), so these policies are
 * the ONLY thing standing between one user's struggle text and another user.
 *
 * Requires a live local stack: `pnpm db:start`.
 */
describe('RLS: profiles', () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    alice = await createTestUser();
    bob = await createTestUser();

    // The trigger should already have made both profiles (02 §1).
    await serviceClient()
      .from('profiles')
      .update({ name: 'Bob', struggle: "Bob's private struggle" })
      .eq('user_id', bob.id);
  });

  afterAll(async () => {
    await deleteTestUser(alice.id);
    await deleteTestUser(bob.id);
  });

  it('creates a profile row automatically for every new auth user', async () => {
    const { data } = await serviceClient()
      .from('profiles')
      .select('user_id')
      .eq('user_id', alice.id)
      .single();

    expect(data?.user_id).toBe(alice.id);
  });

  it('lets a user read her own profile', async () => {
    const { data, error } = await alice.client
      .from('profiles')
      .select('user_id')
      .eq('user_id', alice.id)
      .single();

    expect(error).toBeNull();
    expect(data?.user_id).toBe(alice.id);
  });

  it("does not let a user read another user's profile", async () => {
    const { data } = await alice.client.from('profiles').select('*').eq('user_id', bob.id);

    // RLS filters rather than errors: the row is simply not visible.
    expect(data).toEqual([]);
  });

  it("never leaks another user's struggle text through an unfiltered select", async () => {
    // The nightmare query: no .eq() at all. Must return only Alice's own row.
    const { data } = await alice.client.from('profiles').select('user_id, struggle');

    expect(data).toHaveLength(1);
    expect(data?.[0]?.user_id).toBe(alice.id);
    expect(JSON.stringify(data)).not.toContain('private struggle');
  });

  it("does not let a user update another user's profile", async () => {
    await alice.client.from('profiles').update({ name: 'hacked' }).eq('user_id', bob.id);

    const { data } = await serviceClient()
      .from('profiles')
      .select('name')
      .eq('user_id', bob.id)
      .single();

    expect(data?.name).toBe('Bob');
  });

  it("does not let a user delete another user's profile", async () => {
    await alice.client.from('profiles').delete().eq('user_id', bob.id);

    const { count } = await serviceClient()
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', bob.id);

    expect(count).toBe(1);
  });

  it('lets a user update her own profile', async () => {
    const { error } = await alice.client
      .from('profiles')
      .update({ name: 'Alice' })
      .eq('user_id', alice.id);

    expect(error).toBeNull();

    const { data } = await alice.client
      .from('profiles')
      .select('name')
      .eq('user_id', alice.id)
      .single();
    expect(data?.name).toBe('Alice');
  });

  it('does not let an unauthenticated client read any profile', async () => {
    const { data } = await anonClient().from('profiles').select('*');

    // Either outcome is a pass: `anon` holds no grant (permission denied → null)
    // and no policy would match it anyway (→ []). What matters is that no row escapes.
    expect(data ?? []).toEqual([]);
  });

  it('enforces the ≤2 values rule at the database, not just in the UI', async () => {
    // Product 07 S6 caps values at 2. A client bug must not be able to exceed it.
    const { error } = await alice.client
      .from('profiles')
      .update({ values: ['freedom', 'family', 'security'] })
      .eq('user_id', alice.id);

    expect(error).not.toBeNull();
  });
});

describe('RLS: onboarding_answers', () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    alice = await createTestUser();
    bob = await createTestUser();

    await serviceClient()
      .from('onboarding_answers')
      .insert({
        user_id: bob.id,
        screen_id: 's10-struggle',
        answer: { text: "Bob's verbatim answer" },
      });
  });

  afterAll(async () => {
    await deleteTestUser(alice.id);
    await deleteTestUser(bob.id);
  });

  it('lets a user insert her own answer', async () => {
    const { error } = await alice.client
      .from('onboarding_answers')
      .insert({ user_id: alice.id, screen_id: 's03-name', answer: { text: 'Alice' } });

    expect(error).toBeNull();
  });

  it("rejects an insert claiming another user's id", async () => {
    // The forged-write case: a tampered client sending someone else's user_id.
    const { error } = await alice.client
      .from('onboarding_answers')
      .insert({ user_id: bob.id, screen_id: 's03-name', answer: { text: 'forged' } });

    expect(error).not.toBeNull();
  });

  it("does not let a user read another user's answers", async () => {
    const { data } = await alice.client.from('onboarding_answers').select('*');

    expect(data?.every((row) => row.user_id === alice.id)).toBe(true);
    expect(JSON.stringify(data)).not.toContain('verbatim answer');
  });

  it('does not let an unauthenticated client read any answers', async () => {
    const { data } = await anonClient().from('onboarding_answers').select('*');

    expect(data ?? []).toEqual([]);
  });
});

describe('RLS: deletion cascade (02 §8 — delete means delete)', () => {
  it('removes the profile and answers when the auth user is deleted', async () => {
    const user = await createTestUser();
    await serviceClient()
      .from('onboarding_answers')
      .insert({ user_id: user.id, screen_id: 's03-name', answer: { text: 'temp' } });

    await deleteTestUser(user.id);

    const admin = serviceClient();
    const { count: profileCount } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    const { count: answerCount } = await admin
      .from('onboarding_answers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    expect(profileCount).toBe(0);
    expect(answerCount).toBe(0);
  });
});
