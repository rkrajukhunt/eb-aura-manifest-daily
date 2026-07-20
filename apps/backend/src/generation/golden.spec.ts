import type { JobArtifact } from '@aura/shared';
import { findBannedLanguage } from '@aura/shared';

import { MockLlmProvider } from '../providers/llm/mock-llm.provider';
import { buildContext } from './__fixtures__/memory-context.fixture';
import { PERSONAS, type Persona } from './__fixtures__/personas';
import { ARTIFACT_SPEC, countWords } from './artifact-spec';
import { PromptService } from './prompt/prompt.service';
import { QaService } from './qa/qa.service';
import type { GeneratedArtifact, MemoryContext } from './types';

/**
 * Generation-quality golden tests (15 §5).
 *
 * 20 synthetic personas run the real path — prompt builder → MockLlm → defensive
 * parse → QA gate — and are asserted on PROPERTIES, never exact text: her words
 * present, no banned language, no excluded term, name-first, date-close, length.
 * Exact-text assertions would break on every prompt tweak and tell us nothing
 * about quality; properties are the actual contract.
 *
 * This is the suite that catches a prompt and the gate drifting out of agreement
 * — an artifact the model was instructed to produce but the gate would reject
 * fails here, not in production on a retry loop.
 */
describe('golden personas', () => {
  const prompts = new PromptService();
  const qa = new QaService();
  const llm = new MockLlmProvider();

  /** The pipeline's defensive parse (08 §3), mirrored for the harness. */
  const parse = (raw: string): GeneratedArtifact => {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('mock returned unparseable output');
    const obj = JSON.parse(match[0]) as { title?: unknown; body?: unknown };
    if (typeof obj.body !== 'string') throw new Error('mock returned no body');
    return { title: typeof obj.title === 'string' ? obj.title : '', body: obj.body };
  };

  const generate = async (artifact: JobArtifact, context: MemoryContext) => {
    const built = prompts.build(artifact, context);
    const response = await llm.generate({
      system: built.system,
      prompt: built.prompt,
      maxTokens: built.maxTokens,
      timeoutMs: 30_000,
      json: true,
    });
    const parsed = parse(response.text);
    return { parsed, result: qa.check(artifact, parsed, context), built };
  };

  it('covers twenty personas across all three archetypes (product 02)', () => {
    expect(PERSONAS).toHaveLength(20);
    expect(new Set(PERSONAS.map((p) => p.archetype))).toEqual(
      new Set(['quiet_dreamer', 'self_improver', 'believer']),
    );
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(20);
  });

  describe.each<JobArtifact>(['letter', 'daily', 'affirmation_daily'])('%s', (artifact) => {
    const spec = ARTIFACT_SPEC[artifact];

    describe.each(PERSONAS)('$id', ({ context }: Persona) => {
      it('passes the QA gate', async () => {
        const { result } = await generate(artifact, context);

        expect(result.flaggedRules).toEqual([]);
        expect(result.passed).toBe(true);
      });

      it('quotes her own words at or above the floor', async () => {
        const { result } = await generate(artifact, context);

        expect(result.tokensFound.length).toBeGreaterThanOrEqual(spec.minVerbatimTokens);
      });

      it('uses no banned or guilt language', async () => {
        const { parsed } = await generate(artifact, context);

        expect(findBannedLanguage(`${parsed.title}\n${parsed.body}`)).toEqual([]);
      });

      it('mentions nothing she excluded', async () => {
        const { parsed } = await generate(artifact, context);
        const combined = `${parsed.title}\n${parsed.body}`.toLowerCase();

        for (const term of context.neverInclude) {
          expect(combined).not.toContain(term.toLowerCase());
        }
      });

      it('stays inside the length bounds', async () => {
        const { parsed } = await generate(artifact, context);
        const words = countWords(parsed.body);

        expect(words).toBeGreaterThanOrEqual(spec.minWords);
        expect(words).toBeLessThanOrEqual(spec.maxWords);
      });

      it('keeps her sensitive struggle out of the title', async () => {
        const { parsed } = await generate(artifact, context);
        const title = parsed.title.toLowerCase();

        const distinctive = (context.struggle ?? '')
          .toLowerCase()
          .split(/[^a-z0-9]+/i)
          .filter((w) => w.length > 3);

        for (const word of distinctive) {
          expect(title).not.toContain(word);
        }
      });
    });
  });

  describe('letter-specific structure', () => {
    it.each(PERSONAS)('$id opens with her name', async ({ context }: Persona) => {
      const { parsed } = await generate('letter', context);
      const firstSentence = parsed.body.split(/[.!?]/)[0] ?? '';

      expect(firstSentence.toLowerCase()).toContain((context.name ?? '').toLowerCase());
    });

    it.each(PERSONAS)('$id closes on a weekday and a month', async ({ context }: Persona) => {
      const { parsed } = await generate('letter', context);
      const sentences = parsed.body
        .split(/[.!?]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const closing = sentences.slice(-3).join(' ').toLowerCase();

      expect(closing).toMatch(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/);
      expect(closing).toMatch(
        /january|february|march|april|may|june|july|august|september|october|november|december/,
      );
    });
  });

  describe('the affirmation anchor (PROMPT_VERSION 2026-07-20.1)', () => {
    it('does not accept a preset value chip as her words', async () => {
      // Values come from a fixed onboarding list (S06), so they are the same for
      // every user. The prompt must not offer one as a sufficient anchor, or the
      // gate rejects an affirmation the model was told to write.
      const context = buildContext({ values: ['honesty', 'craft'] });
      const { built } = await generate('affirmation_daily', context);

      expect(built.prompt).toContain('QA gate will not count it');
    });

    it.each(PERSONAS)('$id anchors on something the gate counts', async ({ context }: Persona) => {
      const { result } = await generate('affirmation_daily', context);

      expect(result.tokensFound.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('sparse profiles reject rather than leak', () => {
    it('fails a letter for a user who never gave a name', async () => {
      const { result } = await generate('letter', buildContext({ name: null }));

      expect(result.flaggedRules).toContain('name_first');
    });

    it('fails a letter when there are too few of her words to quote', async () => {
      const { result } = await generate(
        'letter',
        buildContext({ dreamCity: null, people: [], exactPhrases: [] }),
      );

      expect(result.flaggedRules).toContain('verbatim_tokens');
    });

    it('still emits no banned language for a nearly-empty profile', async () => {
      const context = buildContext({
        selfDescription: null,
        dreamCity: null,
        dreamHome: null,
        values: [],
        people: [],
        memoryItems: [],
        exactPhrases: [],
        struggle: null,
        recentTitles: [],
      });
      const { parsed } = await generate('daily', context);

      expect(findBannedLanguage(`${parsed.title}\n${parsed.body}`)).toEqual([]);
    });
  });
});
