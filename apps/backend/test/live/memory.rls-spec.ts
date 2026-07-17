import {
  anonClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from './helpers';

/**
 * RLS for the memory tables (15 §2.4 — required suite).
 *
 * Higher stakes than `profiles`: these rows hold her struggle, her daughter's
 * name, the phrases she'd never say out loud. Mobile queries them directly for
 * "What Aura Knows" (09 §6), so these policies are the whole boundary.
 *
 * Requires `pnpm db:start`.
 */
describe('RLS: memory_items', () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    alice = await createTestUser();
    bob = await createTestUser();

    await serviceClient().from('memory_items').insert({
      user_id: bob.id,
      category: 'struggle',
      tier: 'sensitive',
      content: "You told me you're struggling with: Bob's darkest secret",
      verbatim: "Bob's darkest secret",
      source: 'onboarding',
      emotional_weight: 5,
    });
  });

  afterAll(async () => {
    await deleteTestUser(alice.id);
    await deleteTestUser(bob.id);
  });

  it('lets a user read her own memory', async () => {
    await alice.client.from('memory_items').insert({
      user_id: alice.id,
      category: 'dream',
      tier: 'permanent',
      content: 'Your dream city is Lisbon',
      source: 'onboarding',
    });

    const { data, error } = await alice.client.from('memory_items').select('*');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("never leaks another user's sensitive struggle through an unfiltered select", async () => {
    // The nightmare query. If this ever returns Bob's row, the product is over.
    const { data } = await alice.client.from('memory_items').select('*');

    expect(JSON.stringify(data)).not.toContain('darkest secret');
    expect(data?.every((row) => row.user_id === alice.id)).toBe(true);
  });

  it("rejects an insert claiming another user's id", async () => {
    const { error } = await alice.client.from('memory_items').insert({
      user_id: bob.id,
      category: 'dream',
      tier: 'permanent',
      content: 'forged',
      source: 'onboarding',
    });

    expect(error).not.toBeNull();
  });

  it("cannot update another user's memory", async () => {
    await alice.client.from('memory_items').update({ content: 'hacked' }).eq('user_id', bob.id);

    const { data } = await serviceClient()
      .from('memory_items')
      .select('content')
      .eq('user_id', bob.id)
      .single();

    expect(data?.content).toContain('darkest secret');
  });

  it("cannot delete another user's memory", async () => {
    await alice.client.from('memory_items').delete().eq('user_id', bob.id);

    const { count } = await serviceClient()
      .from('memory_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', bob.id);

    expect(count).toBe(1);
  });

  it('deletes her own item as a HARD delete — delete means delete (09 §6)', async () => {
    const { data: inserted } = await alice.client
      .from('memory_items')
      .insert({
        user_id: alice.id,
        category: 'identity',
        tier: 'permanent',
        content: 'temporary fact',
        source: 'onboarding',
      })
      .select()
      .single();

    await alice.client.from('memory_items').delete().eq('id', inserted!.id);

    // Checked with the service role, which bypasses RLS: a soft delete would
    // still be visible here. The row must be genuinely gone.
    const { data } = await serviceClient().from('memory_items').select('*').eq('id', inserted!.id);

    expect(data).toEqual([]);
  });

  it('does not let an unauthenticated client read any memory', async () => {
    const { data } = await anonClient().from('memory_items').select('*');

    expect(data ?? []).toEqual([]);
  });

  describe('tier/expiry invariant (09 §2)', () => {
    it('rejects a temporary item with no expiry', async () => {
      const { error } = await alice.client.from('memory_items').insert({
        user_id: alice.id,
        category: 'temp_context',
        tier: 'temporary',
        content: 'would live forever',
        source: 'onboarding',
      });

      expect(error).not.toBeNull();
    });

    it('rejects a non-temporary item that carries an expiry', async () => {
      const { error } = await alice.client.from('memory_items').insert({
        user_id: alice.id,
        category: 'identity',
        tier: 'permanent',
        content: 'would expire unexpectedly',
        source: 'onboarding',
        expires_at: new Date().toISOString(),
      });

      expect(error).not.toBeNull();
    });

    it('rejects an emotional weight outside 1–5', async () => {
      const { error } = await alice.client.from('memory_items').insert({
        user_id: alice.id,
        category: 'identity',
        tier: 'permanent',
        content: 'over-weighted',
        source: 'onboarding',
        emotional_weight: 9,
      });

      expect(error).not.toBeNull();
    });
  });
});

describe('RLS: exact_phrases', () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    alice = await createTestUser();
    bob = await createTestUser();

    await serviceClient()
      .from('exact_phrases')
      .insert({ user_id: bob.id, phrase: "Bob's private phrase", source: 'onboarding' });
  });

  afterAll(async () => {
    await deleteTestUser(alice.id);
    await deleteTestUser(bob.id);
  });

  it("does not leak another user's phrases", async () => {
    const { data } = await alice.client.from('exact_phrases').select('*');

    expect(JSON.stringify(data)).not.toContain('private phrase');
  });

  it('dedupes a repeated phrase case-insensitively', async () => {
    // Re-harvesting the same text must not stack duplicates, which would skew
    // sampling toward whatever she happened to repeat (09 §6).
    await alice.client
      .from('exact_phrases')
      .insert({ user_id: alice.id, phrase: 'Lisbon', source: 'onboarding' });

    const { error } = await alice.client
      .from('exact_phrases')
      .insert({ user_id: alice.id, phrase: 'lisbon', source: 'gratitude' });

    expect(error).not.toBeNull();
  });

  it('lets two different users hold the same phrase', async () => {
    // The unique index is per-user; Lisbon is not reserved by whoever said it first.
    const { error } = await bob.client
      .from('exact_phrases')
      .insert({ user_id: bob.id, phrase: 'Lisbon', source: 'onboarding' });

    expect(error).toBeNull();
  });
});

describe('RLS: never_include', () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    alice = await createTestUser();
    bob = await createTestUser();
  });

  afterAll(async () => {
    await deleteTestUser(alice.id);
    await deleteTestUser(bob.id);
  });

  it('lets a user add and read her own excluded term', async () => {
    await alice.client.from('never_include').insert({ user_id: alice.id, term: 'my ex' });

    const { data } = await alice.client.from('never_include').select('term');

    expect(data?.map((r) => r.term)).toEqual(['my ex']);
  });

  it("cannot read another user's exclusion list", async () => {
    // This list is the set of things that would hurt to hear — arguably the most
    // private rows in the schema.
    await serviceClient().from('never_include').insert({ user_id: bob.id, term: 'bob-secret' });

    const { data } = await alice.client.from('never_include').select('*');

    expect(JSON.stringify(data)).not.toContain('bob-secret');
  });

  it('lets a user remove a term she added', async () => {
    await alice.client.from('never_include').insert({ user_id: alice.id, term: 'removable' });
    await alice.client.from('never_include').delete().eq('term', 'removable');

    const { data } = await alice.client
      .from('never_include')
      .select('term')
      .eq('term', 'removable');

    expect(data).toEqual([]);
  });

  it('rejects a duplicate term for the same user', async () => {
    await alice.client.from('never_include').insert({ user_id: alice.id, term: 'dupe' });
    const { error } = await alice.client.from('never_include').insert({
      user_id: alice.id,
      term: 'DUPE',
    });

    expect(error).not.toBeNull();
  });

  it('does not let an unauthenticated client read the exclusion list', async () => {
    const { data } = await anonClient().from('never_include').select('*');

    expect(data ?? []).toEqual([]);
  });
});

describe('memory deletion cascade (02 §8)', () => {
  it('removes memory, phrases and exclusions when the auth user is deleted', async () => {
    const user = await createTestUser();
    const admin = serviceClient();

    const { data: item } = await admin
      .from('memory_items')
      .insert({
        user_id: user.id,
        category: 'struggle',
        tier: 'sensitive',
        content: 'to be erased',
        source: 'onboarding',
      })
      .select()
      .single();

    await admin
      .from('exact_phrases')
      .insert({
        user_id: user.id,
        phrase: 'erase me',
        source: 'onboarding',
        memory_item_id: item!.id,
      });
    await admin.from('never_include').insert({ user_id: user.id, term: 'erase' });

    await deleteTestUser(user.id);

    for (const table of ['memory_items', 'exact_phrases', 'never_include'] as const) {
      const { count } = await admin
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      expect(count).toBe(0);
    }
  });
});
