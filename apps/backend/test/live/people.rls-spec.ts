import {
  anonClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from './helpers';

/**
 * RLS for `people` (15 §2.4). Her circle by name — the Letter's strongest
 * specificity token, and exactly the kind of row that must never cross users.
 *
 * Requires `pnpm db:start`.
 */
describe('RLS: people', () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    alice = await createTestUser();
    bob = await createTestUser();

    await serviceClient()
      .from('people')
      .insert({ user_id: bob.id, name: "Bob's daughter Nell", descriptor: 'safe' });
  });

  afterAll(async () => {
    await deleteTestUser(alice.id);
    await deleteTestUser(bob.id);
  });

  it('lets a user add and read her own people', async () => {
    const { error } = await alice.client
      .from('people')
      .insert({ user_id: alice.id, name: 'Ivy', descriptor: 'safe' });

    expect(error).toBeNull();

    const { data } = await alice.client.from('people').select('name');
    expect(data?.map((r) => r.name)).toEqual(['Ivy']);
  });

  it("never surfaces another user's people through an unfiltered select", async () => {
    const { data } = await alice.client.from('people').select('*');

    expect(JSON.stringify(data)).not.toContain('Nell');
  });

  it("rejects an insert claiming another user's id", async () => {
    const { error } = await alice.client.from('people').insert({ user_id: bob.id, name: 'forged' });

    expect(error).not.toBeNull();
  });

  it('supports deactivation — removed people exit generation, not history', async () => {
    const { data: inserted } = await alice.client
      .from('people')
      .insert({ user_id: alice.id, name: 'Old Friend', descriptor: 'fun' })
      .select()
      .single();

    await alice.client.from('people').update({ active: false }).eq('id', inserted!.id);

    const { data } = await alice.client
      .from('people')
      .select('active')
      .eq('id', inserted!.id)
      .single();

    expect(data?.active).toBe(false);
  });

  it('does not let an unauthenticated client read anyone', async () => {
    const { data } = await anonClient().from('people').select('*');

    expect(data ?? []).toEqual([]);
  });

  it('cascades on account deletion (02 §8)', async () => {
    const user = await createTestUser();
    await serviceClient().from('people').insert({ user_id: user.id, name: 'temp' });

    await deleteTestUser(user.id);

    const { count } = await serviceClient()
      .from('people')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    expect(count).toBe(0);
  });
});
