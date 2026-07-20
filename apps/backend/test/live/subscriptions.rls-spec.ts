import {
  anonClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from './helpers';

/**
 * RLS for `subscription_state` (15 §2.4 — required suite).
 *
 * This table has an asymmetry no other user table has: she may READ her
 * entitlement and may never WRITE it. Every other table lets her edit her own
 * rows; here, a user who could write her own row could grant herself premium.
 * The write-refusal tests below are the entire point of the file — a policy
 * change that quietly added `for update` would be invisible without them.
 *
 * Requires `pnpm db:start`.
 */
describe('RLS: subscription_state', () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    alice = await createTestUser();
    bob = await createTestUser();

    const admin = serviceClient();
    await admin.from('subscription_state').insert({
      user_id: alice.id,
      entitlement: 'free',
      rc_app_user_id: alice.id,
    });
    await admin.from('subscription_state').insert({
      user_id: bob.id,
      entitlement: 'premium',
      product_id: 'aura_premium_annual',
      rc_app_user_id: bob.id,
    });
  });

  afterAll(async () => {
    await deleteTestUser(alice.id);
    await deleteTestUser(bob.id);
  });

  describe('reading', () => {
    it('lets her read her own entitlement', async () => {
      const { data, error } = await alice.client.from('subscription_state').select('*');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0]?.user_id).toBe(alice.id);
    });

    it("never exposes another user's subscription", async () => {
      const { data } = await alice.client.from('subscription_state').select('*');

      expect(data?.every((row) => row.user_id === alice.id)).toBe(true);
    });

    it("returns nothing when she targets another user's row by id", async () => {
      const { data } = await alice.client
        .from('subscription_state')
        .select('*')
        .eq('user_id', bob.id);

      expect(data).toEqual([]);
    });

    it('is invisible to an unauthenticated client', async () => {
      const { data } = await anonClient().from('subscription_state').select('*');

      expect(data ?? []).toEqual([]);
    });
  });

  describe('writing — the whole point of this table', () => {
    it('REFUSES to let her grant herself premium', async () => {
      const { error } = await alice.client
        .from('subscription_state')
        .update({ entitlement: 'premium' })
        .eq('user_id', alice.id);

      expect(error).not.toBeNull();

      const { data } = await serviceClient()
        .from('subscription_state')
        .select('entitlement')
        .eq('user_id', alice.id)
        .single();
      expect(data?.entitlement).toBe('free');
    });

    it('REFUSES to let her insert a subscription row', async () => {
      const { error } = await anonAliceInsert();

      expect(error).not.toBeNull();
    });

    it('REFUSES to let her extend her own expiry', async () => {
      const { error } = await alice.client
        .from('subscription_state')
        .update({ expires_at: new Date(Date.now() + 10 * 365 * 86_400_000).toISOString() })
        .eq('user_id', alice.id);

      expect(error).not.toBeNull();
    });

    it('REFUSES to let her delete her row to escape a lapse', async () => {
      const { error } = await alice.client
        .from('subscription_state')
        .delete()
        .eq('user_id', alice.id);

      expect(error).not.toBeNull();
    });

    it("cannot downgrade another user's subscription", async () => {
      await alice.client
        .from('subscription_state')
        .update({ entitlement: 'free' })
        .eq('user_id', bob.id);

      const { data } = await serviceClient()
        .from('subscription_state')
        .select('entitlement')
        .eq('user_id', bob.id)
        .single();
      expect(data?.entitlement).toBe('premium');
    });
  });

  describe('account deletion', () => {
    it('takes the subscription row with the user (03 §5)', async () => {
      const doomed = await createTestUser();
      await serviceClient()
        .from('subscription_state')
        .insert({ user_id: doomed.id, entitlement: 'premium' });

      await deleteTestUser(doomed.id);

      const { data } = await serviceClient()
        .from('subscription_state')
        .select('user_id')
        .eq('user_id', doomed.id);
      expect(data).toEqual([]);
    });
  });

  /** Extracted so the insert's shape stays readable inside the assertion. */
  async function anonAliceInsert() {
    return alice.client
      .from('subscription_state')
      .insert({ user_id: alice.id, entitlement: 'premium' });
  }
});
