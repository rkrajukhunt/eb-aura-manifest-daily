import type { JobArtifact } from '@aura/shared';

import { daysAgo, fakeSupabase, type TableFixtures } from './__fixtures__/fake-supabase';
import { MemoryContextService } from './memory-context.service';

/**
 * Memory sampler suite (15 §2.3, 09 §4–5).
 *
 * The sampler is the moat's brain, and its two protective rules are the reason
 * this suite is release-blocking: sensitive memory reaches only BODY artifacts,
 * and anything about an inactive person is dropped. Scoring is asserted through
 * ordering (which item wins) rather than exact float values, so the formula can
 * be tuned without rewriting the suite.
 */
describe('MemoryContextService', () => {
  const NOW = new Date('2026-07-20T12:00:00.000Z');

  /** A profile created long enough ago to clear the D21 callback gate. */
  const profile = (overrides: Record<string, unknown> = {}) => ({
    user_id: 'user-1',
    name: 'Maya',
    self_description: 'someone who is quietly rebuilding',
    work_feeling: 'unseen',
    values: ['honesty', 'craft'],
    dream_home: 'a small flat with a balcony',
    dream_city: 'Lisbon',
    struggle: 'I feel invisible at work',
    created_at: daysAgo(60, NOW),
    ...overrides,
  });

  const item = (overrides: Record<string, unknown> = {}) => ({
    content: 'She walks by the river on Sundays',
    verbatim: null,
    category: 'ritual',
    tier: 'evolving',
    emotional_weight: 5,
    use_count: 0,
    last_used_at: null,
    created_at: daysAgo(1, NOW),
    ...overrides,
  });

  const build = (fixtures: TableFixtures) => {
    const fake = fakeSupabase({ profiles: profile(), ...fixtures });
    return { service: new MemoryContextService(fake.client), fake };
  };

  const assemble = (fixtures: TableFixtures, artifact: JobArtifact = 'letter') => {
    const { service, fake } = build(fixtures);
    return service.assemble('user-1', artifact, NOW).then((context) => ({ context, fake }));
  };

  describe('profile mapping', () => {
    it('carries her stated identity into the context', async () => {
      const { context } = await assemble({});

      expect(context).toMatchObject({
        name: 'Maya',
        selfDescription: 'someone who is quietly rebuilding',
        workFeeling: 'unseen',
        values: ['honesty', 'craft'],
        dreamHome: 'a small flat with a balcony',
        dreamCity: 'Lisbon',
      });
    });

    it('falls back to nulls and empty lists for a bare profile', async () => {
      const fake = fakeSupabase({ profiles: null });
      const context = await new MemoryContextService(fake.client).assemble('user-1', 'letter', NOW);

      expect(context.name).toBeNull();
      expect(context.dreamCity).toBeNull();
      expect(context.values).toEqual([]);
      expect(context.startedWeekday).toBeNull();
      expect(context.startedMonth).toBeNull();
    });

    it('derives the date-close fields from the day she started', async () => {
      const fake = fakeSupabase({
        // 2026-07-17 was a Friday.
        profiles: profile({ created_at: '2026-07-17T09:00:00.000Z' }),
      });
      const context = await new MemoryContextService(fake.client).assemble('user-1', 'letter', NOW);

      expect(context.startedWeekday).toBe('Friday');
      expect(context.startedMonth).toBe('July');
    });
  });

  describe('the sensitive tier (09 §2) — the rule that protects her', () => {
    const sensitiveFixtures: TableFixtures = {
      memory_items: [
        item({ tier: 'sensitive', content: 'She feels invisible at work', category: 'struggle' }),
        item({ tier: 'permanent', content: 'She wants to live in Lisbon', category: 'dream' }),
      ],
    };

    it.each<JobArtifact>(['letter', 'daily', 'ondemand', 'refine', 'milestone'])(
      'includes sensitive memory for the body artifact %s',
      async (artifact) => {
        const { context } = await assemble(sensitiveFixtures, artifact);

        expect(context.struggle).toBe('I feel invisible at work');
        expect(context.memoryItems.map((i) => i.tier)).toContain('sensitive');
      },
    );

    it.each<JobArtifact>(['winback', 'affirmation_daily', 'affirmation_guided'])(
      'withholds sensitive memory from the non-body artifact %s',
      async (artifact) => {
        const { context } = await assemble(sensitiveFixtures, artifact);

        expect(context.struggle).toBeNull();
        expect(context.memoryItems.map((i) => i.tier)).not.toContain('sensitive');
      },
    );

    it('never lets her struggle reach a non-body artifact by any route, including a directive', async () => {
      // The whole point of the tier: for a non-body artifact there must be no
      // path — field, memory item, or cadence directive — that carries it.
      const { context } = await assemble({ ...sensitiveFixtures, moments: [] }, 'winback');

      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain('invisible at work');
    });
  });

  describe('inactive people (09 §4 anti-uncanny)', () => {
    it('asks the database for active people only', async () => {
      const { fake } = await assemble({ people: [{ name: 'Nadia', descriptor: 'my sister' }] });

      expect(fake.appliedEq('people', 'active', true)).toBe(true);
    });

    it('maps the people it is given, with their descriptors', async () => {
      const { context } = await assemble({
        people: [
          { name: 'Nadia', descriptor: 'my sister' },
          { name: 'Sam', descriptor: null },
        ],
      });

      expect(context.people).toEqual([
        { name: 'Nadia', descriptor: 'my sister' },
        { name: 'Sam', descriptor: null },
      ]);
    });
  });

  describe('excluded items', () => {
    it('asks the database to leave out anything she marked private', async () => {
      const { fake } = await assemble({ memory_items: [item()] });

      expect(fake.appliedEq('memory_items', 'excluded', false)).toBe(true);
    });
  });

  describe('sampling and scoring (09 §4)', () => {
    it('always includes permanent items, however old', async () => {
      const { context } = await assemble({
        memory_items: [
          item({ tier: 'permanent', content: 'ancient truth', created_at: daysAgo(900, NOW) }),
        ],
      });

      expect(context.memoryItems.map((i) => i.content)).toContain('ancient truth');
    });

    it('caps evolving items at the top eight', async () => {
      const memory_items = Array.from({ length: 20 }, (_, n) =>
        item({ content: `evolving ${n}`, emotional_weight: n + 1 }),
      );

      const { context } = await assemble({ memory_items });

      expect(context.memoryItems).toHaveLength(8);
    });

    it('prefers the more recent of two otherwise-equal memories', async () => {
      const { context } = await assemble({
        memory_items: [
          item({ content: 'older', created_at: daysAgo(120, NOW) }),
          item({ content: 'newer', created_at: daysAgo(1, NOW) }),
        ],
      });

      expect(context.memoryItems.map((i) => i.content)).toEqual(['newer', 'older']);
    });

    it('prefers the more emotionally weighted of two otherwise-equal memories', async () => {
      const { context } = await assemble({
        memory_items: [
          item({ content: 'light', emotional_weight: 1 }),
          item({ content: 'heavy', emotional_weight: 9 }),
        ],
      });

      expect(context.memoryItems.map((i) => i.content)).toEqual(['heavy', 'light']);
    });

    it('prefers the less-spent memory — novelty is the anti-repetition term', async () => {
      const { context } = await assemble({
        memory_items: [
          item({ content: 'overused', use_count: 20 }),
          item({ content: 'fresh', use_count: 0 }),
        ],
      });

      expect(context.memoryItems.map((i) => i.content)).toEqual(['fresh', 'overused']);
    });

    it('orders permanent items ahead of sampled evolving ones', async () => {
      const { context } = await assemble({
        memory_items: [
          item({ tier: 'evolving', content: 'evolving one' }),
          item({ tier: 'permanent', content: 'permanent one' }),
        ],
      });

      expect(context.memoryItems.map((i) => i.content)).toEqual(['permanent one', 'evolving one']);
    });
  });

  describe('exact phrases', () => {
    it('caps at six, preferring fresh and unspent phrases', async () => {
      const exact_phrases = [
        ...Array.from({ length: 8 }, (_, n) => ({
          phrase: `stale ${n}`,
          use_count: 10,
          created_at: daysAgo(200, NOW),
        })),
        { phrase: 'the quiet kind of brave', use_count: 0, created_at: daysAgo(1, NOW) },
      ];

      const { context } = await assemble({ exact_phrases });

      expect(context.exactPhrases).toHaveLength(6);
      expect(context.exactPhrases[0]).toBe('the quiet kind of brave');
    });
  });

  describe('never-include and recent titles', () => {
    it('carries her hard exclusions through for the prompt and the QA gate', async () => {
      const { context } = await assemble({ never_include: [{ term: 'Daniel' }, { term: 'Ohio' }] });

      expect(context.neverInclude).toEqual(['Daniel', 'Ohio']);
    });

    it('collects recent titles for anti-repetition, dropping null titles', async () => {
      const { context } = await assemble({
        moments: [{ title: 'The Balcony' }, { title: null }, { title: 'The River' }],
      });

      expect(context.recentTitles).toEqual(['The Balcony', 'The River']);
    });

    it('feeds her recent gratitude back into generation (09 §4)', async () => {
      // The cheapest memory the product has: a line she wrote yesterday
      // reappearing in tomorrow's moment IS the "it remembers me" engine
      // (product 09 §9.4).
      const { context } = await assemble({
        gratitude_entries: [{ entry: 'the coffee on the balcony' }, { entry: 'Nadia called' }],
      });

      expect(context.recentGratitude).toEqual(['the coffee on the balcony', 'Nadia called']);
    });

    it('is empty for a user who has written none', async () => {
      const { context } = await assemble({});

      expect(context.recentGratitude).toEqual([]);
    });
  });

  describe('cadence directives (09 §5)', () => {
    it('gives the letter none — it is already the peak', async () => {
      const { context } = await assemble({ memory_items: [item()], moments: [] }, 'letter');

      expect(context.directives).toEqual([]);
    });

    it.each<JobArtifact>(['affirmation_daily', 'affirmation_guided'])(
      'gives %s none — too short to carry one',
      async (artifact) => {
        const { context } = await assemble({ memory_items: [item()], moments: [] }, artifact);

        expect(context.directives).toEqual([]);
      },
    );

    it('clears a remembered detail from an unused evolving item', async () => {
      const { context } = await assemble(
        { memory_items: [item({ content: 'the river on Sundays', last_used_at: null })] },
        'daily',
      );

      expect(context.directives).toContainEqual({
        kind: 'remembered_detail',
        item: 'the river on Sundays',
      });
    });

    it('withholds a remembered detail spent inside the 7-day cooldown', async () => {
      const { context } = await assemble(
        { memory_items: [item({ last_used_at: daysAgo(2, NOW) })] },
        'daily',
      );

      expect(context.directives.map((d) => d.kind)).not.toContain('remembered_detail');
    });

    it('clears a remembered detail once the cooldown has elapsed', async () => {
      const { context } = await assemble(
        { memory_items: [item({ last_used_at: daysAgo(9, NOW) })] },
        'daily',
      );

      expect(context.directives.map((d) => d.kind)).toContain('remembered_detail');
    });

    it('never spends a phrase as a remembered detail', async () => {
      const { context } = await assemble(
        { memory_items: [item({ category: 'phrase', content: 'the quiet kind of brave' })] },
        'daily',
      );

      expect(context.directives.map((d) => d.kind)).not.toContain('remembered_detail');
    });

    it('clears an explicit callback for a body artifact once she is past D21', async () => {
      // The positive case that keeps the sensitive-tier gate from being a blanket
      // "never" — a body artifact for a settled account still gets the callback.
      const { context } = await assemble({ memory_items: [item()], moments: [] }, 'daily');

      expect(context.directives).toContainEqual({
        kind: 'explicit_callback',
        item: 'I feel invisible at work',
      });
    });

    it('withholds an explicit callback while a recent moment exists', async () => {
      // KNOWN LIMITATION (raised to the founder, not fixed here): the "no callback
      // in the last 30 days" guard queries for ANY recent moment, not for a recent
      // *callback*. So a user who receives moments regularly never becomes eligible.
      // Fixing it properly needs a way to record that a callback was spent, which
      // is a schema decision — this test pins today's behaviour so the change is
      // visible when it lands.
      const { context } = await assemble(
        { memory_items: [item()], moments: [{ title: 'The Balcony' }] },
        'daily',
      );

      expect(context.directives.map((d) => d.kind)).not.toContain('explicit_callback');
    });

    it('withholds an explicit callback from an account younger than D21', async () => {
      const fake = fakeSupabase({
        profiles: profile({ created_at: daysAgo(10, NOW) }),
        memory_items: [item()],
        moments: [],
      });
      const context = await new MemoryContextService(fake.client).assemble('user-1', 'daily', NOW);

      expect(context.directives.map((d) => d.kind)).not.toContain('explicit_callback');
    });

    it('withholds an explicit callback when she has no struggle to call back to', async () => {
      const fake = fakeSupabase({
        profiles: profile({ struggle: null }),
        memory_items: [item()],
        moments: [],
      });
      const context = await new MemoryContextService(fake.client).assemble('user-1', 'daily', NOW);

      expect(context.directives.map((d) => d.kind)).not.toContain('explicit_callback');
    });
  });
});
