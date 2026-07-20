import {
  anonClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from './helpers';

/**
 * RLS for the Phase 5 generation tables (15 §2.4 — required suite).
 *
 * These four tables carry the generated content itself, so two boundaries are
 * asserted, not one:
 *
 *  1. Cross-user isolation — Alice can never see or touch Bob's rows.
 *  2. The COLUMN boundary (02 §5) — a user may mark her own moment played or
 *     favorited, but must not be able to rewrite `body`. Content exists only
 *     through the pipeline; a user-writable body would let the client forge what
 *     Aura "said", which is the whole trust proposition.
 *
 * Column-level grants are invisible to policy-only tests, so the overwrite cases
 * below are the only thing standing between that rule and a silent regression.
 *
 * Requires `pnpm db:start`.
 */
describe('RLS: generation tables', () => {
  let alice: TestUser;
  let bob: TestUser;
  let aliceMomentId: string;
  let bobMomentId: string;

  beforeAll(async () => {
    alice = await createTestUser();
    bob = await createTestUser();

    const admin = serviceClient();

    const { data: aliceMoment } = await admin
      .from('moments')
      .insert({
        user_id: alice.id,
        type: 'letter',
        status: 'ready',
        title: "Alice's letter",
        body: 'The body only the pipeline may write.',
      })
      .select('id')
      .single();
    aliceMomentId = aliceMoment!.id;

    const { data: bobMoment } = await admin
      .from('moments')
      .insert({
        user_id: bob.id,
        type: 'letter',
        status: 'ready',
        title: "Bob's letter",
        body: "Bob's private letter about his divorce.",
      })
      .select('id')
      .single();
    bobMomentId = bobMoment!.id;

    await admin.from('affirmations').insert({
      user_id: bob.id,
      kind: 'daily',
      text: "Bob's private affirmation",
      status: 'candidate',
    });

    await admin.from('generation_jobs').insert({
      user_id: bob.id,
      artifact: 'letter',
      status: 'succeeded',
    });

    await admin.from('usage_credits').insert({
      user_id: bob.id,
      week_start: '2026-07-13',
      manifest_used: 3,
    });
  });

  afterAll(async () => {
    await deleteTestUser(alice.id);
    await deleteTestUser(bob.id);
  });

  describe('moments', () => {
    it('lets her read her own moment', async () => {
      const { data, error } = await alice.client.from('moments').select('*');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0]?.id).toBe(aliceMomentId);
    });

    it("never leaks another user's letter through an unfiltered select", async () => {
      const { data } = await alice.client.from('moments').select('*');

      expect(JSON.stringify(data)).not.toContain('divorce');
      expect(data?.every((row) => row.user_id === alice.id)).toBe(true);
    });

    it("returns nothing when she targets another user's moment by id", async () => {
      const { data } = await alice.client.from('moments').select('*').eq('id', bobMomentId);

      expect(data).toEqual([]);
    });

    it('lets her mark her own moment played, completed and favorited', async () => {
      const now = new Date().toISOString();
      const { error } = await alice.client
        .from('moments')
        .update({ played_at: now, completed_at: now, favorited_at: now })
        .eq('id', aliceMomentId);

      expect(error).toBeNull();

      const { data } = await serviceClient()
        .from('moments')
        .select('played_at, favorited_at')
        .eq('id', aliceMomentId)
        .single();
      expect(data?.played_at).not.toBeNull();
      expect(data?.favorited_at).not.toBeNull();
    });

    it('REFUSES to let her rewrite the body of her own moment (02 §5)', async () => {
      const { error } = await alice.client
        .from('moments')
        .update({ body: 'forged content' })
        .eq('id', aliceMomentId);

      expect(error).not.toBeNull();

      const { data } = await serviceClient()
        .from('moments')
        .select('body')
        .eq('id', aliceMomentId)
        .single();
      expect(data?.body).toBe('The body only the pipeline may write.');
    });

    it('REFUSES to let her rewrite the title — notifications read it', async () => {
      const { error } = await alice.client
        .from('moments')
        .update({ title: 'forged title' })
        .eq('id', aliceMomentId);

      expect(error).not.toBeNull();
    });

    it('refuses to let her insert a moment — content comes only from the pipeline', async () => {
      const { error } = await alice.client
        .from('moments')
        .insert({ user_id: alice.id, type: 'letter', status: 'ready', body: 'self-authored' });

      expect(error).not.toBeNull();
    });

    it('refuses to let her delete a moment — deletion is account-level (03 §5)', async () => {
      const { error } = await alice.client.from('moments').delete().eq('id', aliceMomentId);

      expect(error).not.toBeNull();
    });

    it("cannot favorite another user's moment", async () => {
      await alice.client
        .from('moments')
        .update({ favorited_at: new Date().toISOString() })
        .eq('id', bobMomentId);

      const { data } = await serviceClient()
        .from('moments')
        .select('favorited_at')
        .eq('id', bobMomentId)
        .single();
      expect(data?.favorited_at).toBeNull();
    });

    it('is invisible to an unauthenticated client', async () => {
      const { data } = await anonClient().from('moments').select('*');

      expect(data ?? []).toEqual([]);
    });
  });

  describe('affirmations', () => {
    it("never leaks another user's affirmation", async () => {
      const { data } = await alice.client.from('affirmations').select('*');

      expect(JSON.stringify(data)).not.toContain("Bob's private affirmation");
      expect(data?.every((row) => row.user_id === alice.id)).toBe(true);
    });

    it('REFUSES to let her rewrite the affirmation text', async () => {
      const admin = serviceClient();
      const { data: mine } = await admin
        .from('affirmations')
        .insert({ user_id: alice.id, kind: 'daily', text: 'Generated text', status: 'candidate' })
        .select('id')
        .single();

      const { error } = await alice.client
        .from('affirmations')
        .update({ text: 'forged' })
        .eq('id', mine!.id);

      expect(error).not.toBeNull();
    });

    it('lets her reveal and save her own affirmation', async () => {
      const admin = serviceClient();
      const { data: mine } = await admin
        .from('affirmations')
        .insert({ user_id: alice.id, kind: 'daily', text: 'Another one', status: 'candidate' })
        .select('id')
        .single();

      const { error } = await alice.client
        .from('affirmations')
        .update({
          revealed_at: new Date().toISOString(),
          saved_at: new Date().toISOString(),
          status: 'kept',
        })
        .eq('id', mine!.id);

      expect(error).toBeNull();
    });

    it('is invisible to an unauthenticated client', async () => {
      const { data } = await anonClient().from('affirmations').select('*');

      expect(data ?? []).toEqual([]);
    });
  });

  describe('generation_jobs', () => {
    it("never leaks another user's jobs", async () => {
      const { data } = await alice.client.from('generation_jobs').select('*');

      expect(data?.every((row) => row.user_id === alice.id)).toBe(true);
    });

    it('refuses to let her create a job directly — the endpoint owns that', async () => {
      const { error } = await alice.client
        .from('generation_jobs')
        .insert({ user_id: alice.id, artifact: 'letter', status: 'queued' });

      expect(error).not.toBeNull();
    });

    it('refuses to let her move a job to succeeded', async () => {
      const admin = serviceClient();
      const { data: job } = await admin
        .from('generation_jobs')
        .insert({ user_id: alice.id, artifact: 'letter', status: 'queued' })
        .select('id')
        .single();

      const { error } = await alice.client
        .from('generation_jobs')
        .update({ status: 'succeeded' })
        .eq('id', job!.id);

      expect(error).not.toBeNull();
    });

    it('is invisible to an unauthenticated client', async () => {
      const { data } = await anonClient().from('generation_jobs').select('*');

      expect(data ?? []).toEqual([]);
    });
  });

  describe('usage_credits — the paywall boundary', () => {
    it("never leaks another user's credit row", async () => {
      const { data } = await alice.client.from('usage_credits').select('*');

      expect(data?.every((row) => row.user_id === alice.id)).toBe(true);
    });

    it('refuses to let her grant herself credits', async () => {
      const { error } = await alice.client
        .from('usage_credits')
        .insert({ user_id: alice.id, week_start: '2026-07-13', manifest_used: 0 });

      expect(error).not.toBeNull();
    });

    it('refuses to let her reset her own usage counter', async () => {
      await serviceClient()
        .from('usage_credits')
        .insert({ user_id: alice.id, week_start: '2026-07-20', manifest_used: 5 });

      const { error } = await alice.client
        .from('usage_credits')
        .update({ manifest_used: 0 })
        .eq('user_id', alice.id)
        .eq('week_start', '2026-07-20');

      expect(error).not.toBeNull();

      const { data } = await serviceClient()
        .from('usage_credits')
        .select('manifest_used')
        .eq('user_id', alice.id)
        .eq('week_start', '2026-07-20')
        .single();
      expect(data?.manifest_used).toBe(5);
    });

    it('is invisible to an unauthenticated client', async () => {
      const { data } = await anonClient().from('usage_credits').select('*');

      expect(data ?? []).toEqual([]);
    });
  });

  describe('the private audio bucket (10 §3)', () => {
    it('is not public', async () => {
      const { data } = await serviceClient().storage.getBucket('audio');

      expect(data?.public).toBe(false);
    });

    it("refuses to list another user's audio folder", async () => {
      const { data } = await alice.client.storage.from('audio').list(bob.id);

      expect(data ?? []).toEqual([]);
    });

    it("refuses to download another user's audio", async () => {
      const admin = serviceClient();
      await admin.storage
        .from('audio')
        .upload(`${bob.id}/${bobMomentId}.mp3`, Buffer.from('bob-audio'), {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      const { data, error } = await alice.client.storage
        .from('audio')
        .download(`${bob.id}/${bobMomentId}.mp3`);

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });

    it('lets her download her own audio', async () => {
      const admin = serviceClient();
      await admin.storage
        .from('audio')
        .upload(`${alice.id}/${aliceMomentId}.mp3`, Buffer.from('alice-audio'), {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      const { data, error } = await alice.client.storage
        .from('audio')
        .download(`${alice.id}/${aliceMomentId}.mp3`);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });
  });
});
