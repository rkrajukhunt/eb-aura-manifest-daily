import {
  anonClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from './helpers';

/**
 * RLS for `gratitude_entries` and `favorites` (15 §2.4 — required suite).
 *
 * Gratitude is the one table users write directly and freely — it is her own
 * sentence, saved locally and synced silently — so unlike the generated content
 * tables it grants full insert/update/delete. That makes the cross-user tests
 * below the entire boundary: a policy slip here exposes a personal journal.
 *
 * Requires `pnpm db:start`.
 */
describe('RLS: gratitude_entries & favorites', () => {
  let alice: TestUser;
  let bob: TestUser;
  let bobMomentId: string;

  beforeAll(async () => {
    alice = await createTestUser();
    bob = await createTestUser();

    const admin = serviceClient();

    await admin.from('gratitude_entries').insert({
      user_id: bob.id,
      entry: 'Bob is grateful for his therapist',
      entry_date: '2026-07-19',
    });

    const { data: moment } = await admin
      .from('moments')
      .insert({ user_id: bob.id, type: 'daily', status: 'ready', body: 'Bob’s moment.' })
      .select('id')
      .single();
    bobMomentId = moment!.id;
  });

  afterAll(async () => {
    await deleteTestUser(alice.id);
    await deleteTestUser(bob.id);
  });

  describe('gratitude_entries', () => {
    it('lets her write her own line', async () => {
      const { error } = await alice.client.from('gratitude_entries').insert({
        user_id: alice.id,
        entry: 'the coffee on the balcony',
        entry_date: '2026-07-20',
      });

      expect(error).toBeNull();
    });

    it('lets her edit it — a same-day write is an edit, not a duplicate', async () => {
      const { error } = await alice.client
        .from('gratitude_entries')
        .upsert(
          { user_id: alice.id, entry: 'actually, Nadia called', entry_date: '2026-07-20' },
          { onConflict: 'user_id,entry_date' },
        );

      expect(error).toBeNull();

      const { data } = await serviceClient()
        .from('gratitude_entries')
        .select('entry')
        .eq('user_id', alice.id)
        .eq('entry_date', '2026-07-20');
      expect(data).toHaveLength(1);
      expect(data?.[0]?.entry).toBe('actually, Nadia called');
    });

    it('lets her delete a line (product 09 §9.4 promises per-entry delete)', async () => {
      await alice.client
        .from('gratitude_entries')
        .insert({ user_id: alice.id, entry: 'to be removed', entry_date: '2026-07-18' });

      const { error } = await alice.client
        .from('gratitude_entries')
        .delete()
        .eq('user_id', alice.id)
        .eq('entry_date', '2026-07-18');

      expect(error).toBeNull();
    });

    it("NEVER exposes another user's journal", async () => {
      const { data } = await alice.client.from('gratitude_entries').select('*');

      expect(JSON.stringify(data)).not.toContain('therapist');
      expect(data?.every((row) => row.user_id === alice.id)).toBe(true);
    });

    it("refuses to write a line into another user's journal", async () => {
      const { error } = await alice.client.from('gratitude_entries').insert({
        user_id: bob.id,
        entry: 'forged',
        entry_date: '2026-07-17',
      });

      expect(error).not.toBeNull();
    });

    it("cannot edit another user's line", async () => {
      await alice.client
        .from('gratitude_entries')
        .update({ entry: 'overwritten' })
        .eq('user_id', bob.id);

      const { data } = await serviceClient()
        .from('gratitude_entries')
        .select('entry')
        .eq('user_id', bob.id)
        .single();
      expect(data?.entry).toContain('therapist');
    });

    it('is invisible to an unauthenticated client', async () => {
      const { data } = await anonClient().from('gratitude_entries').select('*');

      expect(data ?? []).toEqual([]);
    });

    it('enforces one entry per day at the database', async () => {
      // The constraint the offline queue relies on to upsert blindly.
      await alice.client
        .from('gratitude_entries')
        .insert({ user_id: alice.id, entry: 'first', entry_date: '2026-07-15' });

      const { error } = await alice.client
        .from('gratitude_entries')
        .insert({ user_id: alice.id, entry: 'second', entry_date: '2026-07-15' });

      expect(error).not.toBeNull();
    });
  });

  describe('favorites', () => {
    it("never exposes another user's favourites", async () => {
      const { data } = await alice.client.from('favorites').select('*');

      expect(data?.every((row) => row.user_id === alice.id)).toBe(true);
    });

    it("refuses to favourite on another user's behalf", async () => {
      const { error } = await alice.client
        .from('favorites')
        .insert({ user_id: bob.id, moment_id: bobMomentId });

      expect(error).not.toBeNull();
    });

    it('refuses a row with no target', async () => {
      const { error } = await alice.client.from('favorites').insert({ user_id: alice.id });

      expect(error).not.toBeNull();
    });

    it('is invisible to an unauthenticated client', async () => {
      const { data } = await anonClient().from('favorites').select('*');

      expect(data ?? []).toEqual([]);
    });
  });

  describe('account deletion', () => {
    it('takes her journal with her (03 §5)', async () => {
      const doomed = await createTestUser();
      await serviceClient()
        .from('gratitude_entries')
        .insert({ user_id: doomed.id, entry: 'private', entry_date: '2026-07-20' });

      await deleteTestUser(doomed.id);

      const { data } = await serviceClient()
        .from('gratitude_entries')
        .select('id')
        .eq('user_id', doomed.id);
      expect(data).toEqual([]);
    });
  });
});
