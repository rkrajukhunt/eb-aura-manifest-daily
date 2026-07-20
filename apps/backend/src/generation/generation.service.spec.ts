import type { JobArtifact } from '@aura/shared';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { AnalyticsService } from '../analytics/analytics.service';
import { MemoryContextService } from '../memory/memory-context.service';
import { MockLlmProvider } from '../providers/llm/mock-llm.provider';
import { LLM_PROVIDER, type LlmProvider } from '../providers/llm/llm-provider.interface';
import { MockTtsProvider } from '../providers/tts/mock-tts.provider';
import { TTS_PROVIDER, type TtsProvider } from '../providers/tts/tts-provider.interface';
import { CrisisDetectionService } from '../safety/crisis-detection.service';
import { SUPABASE_CLIENT } from '../supabase/supabase.module';
import { buildContext } from './__fixtures__/memory-context.fixture';
import { GenerationService } from './generation.service';
import { JobsService, QaFailedError, type JobRow, type JobRunner } from './jobs/jobs.service';
import { PromptService } from './prompt/prompt.service';
import { QaService } from './qa/qa.service';
import { StorageService } from './storage.service';

/**
 * Pipeline integration with mock providers (15 §1 integration row, 15 §2).
 *
 * Everything real except the two vendors and the database: the actual prompt
 * builders, the actual QA gate, the actual crisis service, the actual mock
 * adapters. This is the suite that proves the STEPS COMPOSE — the unit suites
 * each prove a step in isolation, and a pipeline can be wrong while every step
 * is right.
 *
 * Deliberately not e2e: no HTTP, no running Nest app, no Docker.
 */
describe('GenerationService (pipeline)', () => {
  let service: GenerationService;
  let runner: JobRunner;
  let capture: jest.Mock;
  let momentRows: Record<string, unknown>[];
  let upload: jest.Mock;
  let assemble: jest.Mock;
  let llm: LlmProvider;
  let tts: TtsProvider;
  let insertError: { message: string } | null;

  const job = (overrides: Partial<JobRow> = {}): JobRow => ({
    id: 'job-1',
    user_id: 'user-1',
    artifact: 'letter',
    status: 'running',
    moment_id: null,
    attempt: 1,
    input: null,
    ...overrides,
  });

  /** A fake `moments` table that records inserts and applies updates. */
  const fakeSupabase = () => ({
    from: () => {
      let pending: Record<string, unknown> | null = null;
      const builder: Record<string, unknown> = {
        insert: (row: Record<string, unknown>) => {
          pending = row;
          return builder;
        },
        update: (patch: Record<string, unknown>) => {
          const target = momentRows[momentRows.length - 1];
          if (target) Object.assign(target, patch);
          return builder;
        },
        select: () => builder,
        eq: () => builder,
        single: () => {
          if (insertError) return Promise.resolve({ data: null, error: insertError });
          const row = { id: `moment-${momentRows.length + 1}`, ...pending };
          momentRows.push(row);
          return Promise.resolve({ data: { id: row.id }, error: null });
        },
        then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
      };
      return builder;
    },
    storage: { from: () => ({ upload }) },
  });

  const build = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GenerationService,
        PromptService,
        QaService,
        StorageService,
        CrisisDetectionService,
        { provide: MemoryContextService, useValue: { assemble } },
        { provide: JobsService, useValue: { registerRunner: (r: JobRunner) => (runner = r) } },
        { provide: AnalyticsService, useValue: { capture } },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              ({
                LLM_MODEL_FLAGSHIP: 'model-flagship',
                LLM_MODEL_MID: 'model-mid',
                LLM_MODEL_MINI: 'model-mini',
                ELEVENLABS_VOICE_ID: 'voice-1',
              })[key],
          },
        },
        { provide: LLM_PROVIDER, useValue: llm },
        { provide: TTS_PROVIDER, useValue: tts },
        { provide: SUPABASE_CLIENT, useValue: fakeSupabase() },
      ],
    }).compile();

    service = moduleRef.get(GenerationService);
    service.onModuleInit();
    return service;
  };

  /** The moment row the pipeline wrote. */
  const written = () => (momentRows[momentRows.length - 1] ?? {}) as Record<string, unknown>;

  beforeEach(async () => {
    capture = jest.fn();
    momentRows = [];
    insertError = null;
    upload = jest.fn().mockResolvedValue({ error: null });
    assemble = jest.fn().mockResolvedValue(buildContext());
    llm = new MockLlmProvider();
    tts = new MockTtsProvider();
    await build();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('the happy path — a letter end to end', () => {
    it('writes a ready moment with audio, timings and duration', async () => {
      const { momentId } = await runner(job());

      expect(momentId).toBe('moment-1');
      expect(written()).toMatchObject({
        user_id: 'user-1',
        type: 'letter',
        status: 'ready',
        audio_path: 'user-1/moment-1.mp3',
      });
      expect(written().duration_ms).toBeGreaterThan(0);
      expect((written().word_timings as unknown[]).length).toBeGreaterThan(0);
    });

    it('stamps the prompt version onto the qa_report (08 §9)', async () => {
      await runner(job());

      expect(written().qa_report).toMatchObject({
        prompt_version: expect.stringMatching(/^\d{4}-\d{2}-\d{2}\.\d+$/),
        supportive: false,
      });
    });

    it('uploads the audio to her own folder, overwriting on a retry', async () => {
      await runner(job());

      expect(upload).toHaveBeenCalledWith(
        'user-1/moment-1.mp3',
        expect.any(Buffer),
        expect.objectContaining({ contentType: 'audio/mpeg', upsert: true }),
      );
    });

    it('emits the started and succeeded analytics with a latency', async () => {
      await runner(job());

      expect(capture).toHaveBeenCalledWith('user-1', 'letter_generation_started', {});
      expect(capture).toHaveBeenCalledWith('user-1', 'letter_generation_succeeded', {
        latency_s: expect.any(Number),
      });
    });

    it('word timings cover the body it actually wrote', async () => {
      await runner(job());

      const timings = written().word_timings as { word: string }[];
      const bodyWords = String(written().body).trim().split(/\s+/);
      expect(timings).toHaveLength(bodyWords.length);
    });
  });

  describe('model tiering (08 §2)', () => {
    it('sends a letter to the flagship model on a 30s budget', async () => {
      const generate = jest.spyOn(llm, 'generate');

      await runner(job());

      expect(generate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'model-flagship', timeoutMs: 30_000, json: true }),
      );
    });

    it('sends a daily moment to the mid model on a 15s budget', async () => {
      const generate = jest.spyOn(llm, 'generate');

      await runner(job({ artifact: 'daily' }));

      expect(generate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'model-mid', timeoutMs: 15_000 }),
      );
    });

    it('sends an affirmation to the mini model', async () => {
      const generate = jest.spyOn(llm, 'generate');

      await runner(job({ artifact: 'affirmation_daily' }));

      expect(generate).toHaveBeenCalledWith(expect.objectContaining({ model: 'model-mini' }));
    });
  });

  describe('the crisis edge on the letter path (14 §5)', () => {
    const crisisContext = () =>
      buildContext({ struggle: 'some days I want to die and nobody would notice' });

    it('still delivers the letter — the one thing she is promised', async () => {
      assemble.mockResolvedValue(crisisContext());

      const { momentId } = await runner(job());

      expect(momentId).not.toBeNull();
      expect(written().status).toBe('ready');
    });

    it('flags it supportive in the qa_report', async () => {
      assemble.mockResolvedValue(crisisContext());

      await runner(job());

      expect(written().qa_report).toMatchObject({ supportive: true });
    });

    it('never leaks the crisis phrasing into the letter body', async () => {
      assemble.mockResolvedValue(crisisContext());

      await runner(job());

      expect(String(written().body)).not.toContain('want to die');
      expect(String(written().body)).not.toContain('nobody would notice');
    });

    it('leaves an ordinary struggle alone — not every hard thing is a crisis', async () => {
      assemble.mockResolvedValue(buildContext({ struggle: 'I feel invisible at work' }));

      await runner(job());

      expect(written().qa_report).toMatchObject({ supportive: false });
    });

    it('does not screen when she named no struggle', async () => {
      assemble.mockResolvedValue(buildContext({ struggle: null }));
      const generate = jest.spyOn(llm, 'generate');

      await runner(job());

      // Only the artifact call — no classifier hop.
      expect(generate).toHaveBeenCalledTimes(1);
    });

    it('does not run the letter crisis path for other artifacts', async () => {
      assemble.mockResolvedValue(crisisContext());
      const generate = jest.spyOn(llm, 'generate');

      await runner(job({ artifact: 'daily' }));

      expect(generate).toHaveBeenCalledTimes(1);
    });
  });

  describe('QA failures', () => {
    it('throws QaFailedError so the state machine takes the corrective lane', async () => {
      // A context with nothing of hers to quote cannot clear the verbatim floor.
      assemble.mockResolvedValue(
        buildContext({ name: null, dreamCity: null, people: [], exactPhrases: [] }),
      );

      await expect(runner(job())).rejects.toThrow(QaFailedError);
    });

    it('emits one qa_flagged event per broken rule', async () => {
      assemble.mockResolvedValue(
        buildContext({ name: null, dreamCity: null, people: [], exactPhrases: [] }),
      );

      await runner(job()).catch(() => undefined);

      const rules = capture.mock.calls
        .filter(([, event]) => event === 'generation_qa_flagged')
        .map(([, , props]) => (props as { rule: string }).rule);
      expect(rules).toContain('verbatim_tokens');
      expect(rules).toContain('name_first');
    });

    it('writes no moment row when the gate rejects', async () => {
      assemble.mockResolvedValue(
        buildContext({ name: null, dreamCity: null, people: [], exactPhrases: [] }),
      );

      await runner(job()).catch(() => undefined);

      expect(momentRows).toHaveLength(0);
    });

    it('reports qa_failed as the failure reason', async () => {
      assemble.mockResolvedValue(
        buildContext({ name: null, dreamCity: null, people: [], exactPhrases: [] }),
      );

      await runner(job()).catch(() => undefined);

      expect(capture).toHaveBeenCalledWith('user-1', 'generation_failed', {
        surface: 'letter',
        reason: 'qa_failed',
      });
    });
  });

  describe('defensive parsing (08 §3)', () => {
    /**
     * A letter body the QA gate accepts, so these tests fail on the PARSE rather
     * than on content: name first, three of her words, inside 140–220, date-close.
     */
    const passingLetterBody = () =>
      `Maya, this is Lisbon and Nadia is here. ${'A quiet morning again. '.repeat(45)}You started this on a Friday in July. I remember.`;

    const respondWith = (text: string) => {
      jest.spyOn(llm, 'generate').mockResolvedValue({
        text,
        usage: { inputTokens: 0, outputTokens: 0 },
      });
    };

    it('tolerates a code fence around the JSON', async () => {
      const body = passingLetterBody();
      respondWith(`\`\`\`json\n${JSON.stringify({ title: 'T', body })}\n\`\`\``);

      await expect(runner(job())).resolves.toMatchObject({ momentId: 'moment-1' });
    });

    it('tolerates leading prose before the JSON', async () => {
      const body = passingLetterBody();
      respondWith(`Here you go!\n${JSON.stringify({ title: 'T', body })}`);

      await expect(runner(job())).resolves.toMatchObject({ momentId: 'moment-1' });
    });

    it('rejects output with no JSON object at all', async () => {
      respondWith('I am afraid I cannot do that.');

      await expect(runner(job())).rejects.toThrow(/unparseable/i);
    });

    it('rejects JSON with no body', async () => {
      respondWith(JSON.stringify({ title: 'T' }));

      await expect(runner(job())).rejects.toThrow(/unparseable/i);
    });

    it('rejects JSON whose body is blank', async () => {
      respondWith(JSON.stringify({ title: 'T', body: '   ' }));

      await expect(runner(job())).rejects.toThrow(/unparseable/i);
    });

    it('tolerates a missing title rather than failing the job', async () => {
      const body = passingLetterBody();
      respondWith(JSON.stringify({ body }));

      await expect(runner(job())).resolves.toMatchObject({ momentId: 'moment-1' });
      expect(written().title).toBe('');
    });

    it('reports malformed_output as the failure reason', async () => {
      respondWith('nope');

      await runner(job()).catch(() => undefined);

      expect(capture).toHaveBeenCalledWith('user-1', 'generation_failed', {
        surface: 'letter',
        reason: 'malformed_output',
      });
    });
  });

  describe('artifacts without audio', () => {
    it('marks an affirmation ready without touching TTS or Storage', async () => {
      const synthesize = jest.spyOn(tts, 'synthesize');

      await runner(job({ artifact: 'affirmation_daily' }));

      expect(synthesize).not.toHaveBeenCalled();
      expect(upload).not.toHaveBeenCalled();
      expect(written()).toMatchObject({ status: 'ready' });
      expect(written().audio_path).toBeUndefined();
    });
  });

  describe('failure propagation into the provider retry lane', () => {
    it('propagates a TTS failure', async () => {
      jest.spyOn(tts, 'synthesize').mockRejectedValue(new Error('elevenlabs 503'));

      await expect(runner(job())).rejects.toThrow('elevenlabs 503');
    });

    it('propagates a Storage failure', async () => {
      upload.mockResolvedValue({ error: { message: 'bucket unavailable' } });

      await expect(runner(job())).rejects.toThrow(/Audio upload failed/);
    });

    it('propagates a persist failure', async () => {
      insertError = { message: 'deadlock detected' };

      await expect(runner(job())).rejects.toThrow(/Persist failed/);
    });

    it('classifies a provider timeout distinctly from a generic error', async () => {
      jest.spyOn(llm, 'generate').mockRejectedValue(new Error('The operation was aborted'));

      await runner(job()).catch(() => undefined);

      expect(capture).toHaveBeenCalledWith('user-1', 'generation_failed', {
        surface: 'letter',
        reason: 'provider_timeout',
      });
    });

    it('classifies an unknown vendor error as provider_error', async () => {
      jest.spyOn(llm, 'generate').mockRejectedValue(new Error('502 bad gateway'));

      await runner(job()).catch(() => undefined);

      expect(capture).toHaveBeenCalledWith('user-1', 'generation_failed', {
        surface: 'letter',
        reason: 'provider_error',
      });
    });

    it('emits letter_generation_failed only for the letter', async () => {
      jest.spyOn(llm, 'generate').mockRejectedValue(new Error('502'));

      await runner(job({ artifact: 'daily' })).catch(() => undefined);

      const events = capture.mock.calls.map(([, event]) => event);
      expect(events).not.toContain('letter_generation_failed');
      expect(events).toContain('generation_failed');
    });
  });

  describe('moment typing', () => {
    it.each<[JobArtifact, string]>([
      ['letter', 'letter'],
      ['daily', 'daily'],
      ['ondemand', 'ondemand'],
      ['refine', 'ondemand'],
      ['milestone', 'milestone'],
      ['winback', 'winback'],
    ])('stores a %s job as moment type %s', async (artifact, type) => {
      assemble.mockResolvedValue(buildContext({ struggle: null }));

      await runner(job({ artifact })).catch(() => undefined);

      expect(written()?.type).toBe(type);
    });
  });

  describe('memory context', () => {
    it('assembles context for the specific artifact being generated', async () => {
      await runner(job({ artifact: 'daily' }));

      expect(assemble).toHaveBeenCalledWith('user-1', 'daily');
    });
  });
});
