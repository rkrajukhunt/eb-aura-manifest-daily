import type { JobArtifact } from '@aura/shared';
import { BANNED_PHRASES } from '@aura/shared';

import { buildContext, directive } from '../__fixtures__/memory-context.fixture';
import { ARTIFACT_SPEC } from '../artifact-spec';
import { PromptService } from './prompt.service';
import { PROMPT_VERSION, VOICE_CONSTITUTION } from './voice';

const ALL_ARTIFACTS: JobArtifact[] = [
  'letter',
  'daily',
  'ondemand',
  'refine',
  'milestone',
  'winback',
  'affirmation_daily',
  'affirmation_guided',
];

/**
 * Prompt builder suite (15 §2.2).
 *
 * Asserts the properties that make a generation feel written for her — her exact
 * words reach the model, her exclusions are restated, the cadence directives the
 * sampler cleared are honoured — plus the cache-shape invariant (08 §7) that the
 * voice constitution is a byte-identical stable prefix across artifacts.
 */
describe('PromptService', () => {
  const prompts = new PromptService();

  describe('every artifact builds', () => {
    it.each(ALL_ARTIFACTS)('builds a %s prompt', (artifact) => {
      const built = prompts.build(artifact, buildContext());

      expect(built.system).toBe(VOICE_CONSTITUTION);
      expect(built.prompt).not.toBe('');
      expect(built.promptVersion).toBe(PROMPT_VERSION);
    });

    it.each(ALL_ARTIFACTS)('budgets maxTokens from the %s word ceiling', (artifact) => {
      const { maxWords } = ARTIFACT_SPEC[artifact];
      const built = prompts.build(artifact, buildContext());

      // Room for the words plus JSON scaffolding, and never unbounded. The flat
      // JSON overhead dominates for the 20-word affirmations, so the upper bound
      // is deliberately loose — it guards against runaway, not against the exact
      // constants (which the monotonicity check below pins instead).
      expect(built.maxTokens).toBeGreaterThan(maxWords);
      expect(built.maxTokens).toBeLessThan(maxWords * 3 + 100);
    });

    it('budgets more for a letter than for an affirmation', () => {
      const letter = prompts.build('letter', buildContext()).maxTokens;
      const affirmation = prompts.build('affirmation_daily', buildContext()).maxTokens;

      expect(letter).toBeGreaterThan(affirmation);
    });
  });

  describe('the stable prefix (08 §7 prompt cache)', () => {
    it('is byte-identical across artifacts — the cacheable prefix must not vary', () => {
      const systems = ALL_ARTIFACTS.map((a) => prompts.build(a, buildContext()).system);

      expect(new Set(systems).size).toBe(1);
    });

    it('is byte-identical across users — nothing user-specific may leak into it', () => {
      const maya = prompts.build('letter', buildContext({ name: 'Maya' })).system;
      const jo = prompts.build('letter', buildContext({ name: 'Jo', dreamCity: 'Oslo' })).system;

      expect(maya).toBe(jo);
      expect(maya).not.toContain('Maya');
      expect(jo).not.toContain('Oslo');
    });

    it('states the banned list to the model, so the QA gate rarely has to fire', () => {
      for (const phrase of BANNED_PHRASES) {
        expect(VOICE_CONSTITUTION).toContain(phrase);
      }
    });

    it('puts the context block before the artifact instructions', () => {
      const { prompt } = prompts.build('letter', buildContext());

      expect(prompt.indexOf('Her name: Maya')).toBeLessThan(prompt.indexOf('Write her a letter'));
    });
  });

  describe('her words reach the model', () => {
    it('carries her name, city, home, values and people into the context block', () => {
      const { prompt } = prompts.build('letter', buildContext());

      expect(prompt).toContain('Her name: Maya');
      expect(prompt).toContain('Her dream city: Lisbon');
      expect(prompt).toContain('Her dream home: a small flat with a balcony');
      expect(prompt).toContain('honesty, craft');
      expect(prompt).toContain('Nadia (my sister)');
    });

    it('lists her exact phrases with an instruction to reuse them literally', () => {
      const { prompt } = prompts.build('letter', buildContext());

      expect(prompt).toContain('LITERALLY');
      expect(prompt).toContain('"the quiet kind of brave"');
      expect(prompt).toContain('"a kitchen with morning light"');
    });

    it('omits lines she has not given rather than emitting empty labels', () => {
      const { prompt } = prompts.build(
        'letter',
        buildContext({ dreamCity: null, dreamHome: null, people: [], values: [] }),
      );

      expect(prompt).not.toContain('Her dream city:');
      expect(prompt).not.toContain('Her dream home:');
      expect(prompt).not.toContain('Her people, by name:');
      expect(prompt).not.toContain('What she values:');
    });

    it('passes recent titles so it does not repeat itself', () => {
      const { prompt } = prompts.build('daily', buildContext({ recentTitles: ['The Balcony'] }));

      expect(prompt).toContain('do NOT repeat');
      expect(prompt).toContain('The Balcony');
    });
  });

  describe('her exclusions (09 §6)', () => {
    it('restates every never-include term as a hard prohibition', () => {
      const { prompt } = prompts.build(
        'letter',
        buildContext({ neverInclude: ['Daniel', 'Ohio'] }),
      );

      expect(prompt).toContain('NEVER mention any of these');
      expect(prompt).toContain('"Daniel"');
      expect(prompt).toContain('"Ohio"');
    });

    it('never presents an excluded term as material to use', () => {
      const { prompt } = prompts.build('letter', buildContext({ neverInclude: ['Daniel'] }));
      const lines = prompt.split('\n').filter((line) => line.includes('Daniel'));

      // Exactly one mention, and it is the prohibition line.
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('NEVER mention');
    });

    it('emits no prohibition line when she has excluded nothing', () => {
      const { prompt } = prompts.build('letter', buildContext({ neverInclude: [] }));

      expect(prompt).not.toContain('NEVER mention');
    });
  });

  describe('sensitive memory (09 §2)', () => {
    it('frames her struggle for gentle, once-only reference when it is present', () => {
      const { prompt } = prompts.build('letter', buildContext());

      expect(prompt).toContain('What feels heaviest to her');
      expect(prompt).toContain('I feel invisible at work');
      expect(prompt).toContain('softening');
    });

    it('says nothing about a struggle the sampler withheld', () => {
      const { prompt } = prompts.build('winback', buildContext({ struggle: null }));

      expect(prompt).not.toContain('What feels heaviest');
      expect(prompt).not.toContain('invisible at work');
    });
  });

  describe('cadence directives (09 §5)', () => {
    it('weaves in a remembered detail the sampler cleared', () => {
      const { prompt } = prompts.build(
        'daily',
        buildContext({ directives: [directive('remembered_detail', 'the river on Sundays')] }),
      );

      expect(prompt).toContain('Weave in this remembered detail');
      expect(prompt).toContain('the river on Sundays');
    });

    it('opens with an explicit callback when one is cleared', () => {
      const { prompt } = prompts.build(
        'daily',
        buildContext({ directives: [directive('explicit_callback', 'I feel invisible at work')] }),
      );

      expect(prompt).toContain('Open by recalling this');
    });

    it('adds no directive language when the sampler cleared none', () => {
      const { prompt } = prompts.build('daily', buildContext({ directives: [] }));

      expect(prompt).not.toContain('Weave in this remembered detail');
      expect(prompt).not.toContain('Open by recalling this');
    });
  });

  describe('the letter (the wow)', () => {
    it('instructs the exact structure the QA gate will grade', () => {
      const { prompt } = prompts.build('letter', buildContext());

      expect(prompt).toContain('Open with her name in the very first sentence');
      expect(prompt).toContain('Set it in her dream city');
      expect(prompt).toContain('Name at least one of her people');
      expect(prompt).toContain(`${ARTIFACT_SPEC.letter.minWords}–${ARTIFACT_SPEC.letter.maxWords}`);
    });

    it('builds the date-close line from the day she actually started', () => {
      const { prompt } = prompts.build(
        'letter',
        buildContext({ startedWeekday: 'Tuesday', startedMonth: 'March' }),
      );

      expect(prompt).toContain('You started this on a Tuesday in March.');
    });

    it('falls back to a dateless close when the start date is unknown', () => {
      const { prompt } = prompts.build(
        'letter',
        buildContext({ startedWeekday: null, startedMonth: null }),
      );

      expect(prompt).toContain('I remember when you started.');
      expect(prompt).not.toContain('You started this on a null');
    });
  });

  describe('refine', () => {
    it('embeds the previous body and the requested direction', () => {
      const { prompt } = prompts.build('refine', buildContext(), {
        previousBody: 'The old moment.',
        direction: 'softer',
      });

      expect(prompt).toContain('The old moment.');
      expect(prompt).toContain('gentler and more tender');
    });

    it('carries her free-text note when she wrote one', () => {
      const { prompt } = prompts.build('refine', buildContext(), {
        previousBody: 'The old moment.',
        direction: 'note',
        note: 'less about the city',
      });

      expect(prompt).toContain('Her note: "less about the city"');
    });

    it('omits the note line when she wrote none', () => {
      const { prompt } = prompts.build('refine', buildContext(), {
        previousBody: 'The old moment.',
        direction: 'more_ambitious',
      });

      expect(prompt).not.toContain('Her note:');
      expect(prompt).toContain('reach further');
    });
  });

  describe('winback (11 §3 — a door left open)', () => {
    it('forbids any mention of her absence', () => {
      const { prompt } = prompts.build('winback', buildContext({ struggle: null }));

      expect(prompt).toContain('no mention of her absence');
      expect(prompt).toContain('no guilt');
    });
  });

  describe('affirmations', () => {
    it('asks for a positive present-tense frame the QA gate will check', () => {
      const { prompt } = prompts.build('affirmation_daily', buildContext());

      expect(prompt).toContain('positive frame');
      expect(prompt).toContain(`${ARTIFACT_SPEC.affirmation_daily.maxWords} words or fewer`);
    });

    it('asks the guided builder for three candidates with techniques', () => {
      const { prompt } = prompts.build('affirmation_guided', buildContext());

      expect(prompt).toContain('three affirmation candidates');
      expect(prompt).toContain('technique');
    });
  });

  describe('versioning (08 §9)', () => {
    it('stamps one version across every artifact, so a regression is attributable', () => {
      const versions = ALL_ARTIFACTS.map((a) => prompts.build(a, buildContext()).promptVersion);

      expect(new Set(versions)).toEqual(new Set([PROMPT_VERSION]));
      expect(PROMPT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    });
  });
});
