import type { GenerationFailureReason, JobArtifact, Json } from '@aura/shared';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';

import { AnalyticsService } from '../analytics/analytics.service';
import { MemoryContextService } from '../memory/memory-context.service';
import { LLM_PROVIDER, type LlmProvider } from '../providers/llm/llm-provider.interface';
import { TTS_PROVIDER, type TtsProvider } from '../providers/tts/tts-provider.interface';
import { CrisisDetectionService } from '../safety/crisis-detection.service';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import {
  ARTIFACT_MODEL_TIER,
  type GeneratedArtifact,
  type MemoryContext,
  type ModelTier,
} from './types';
import { ARTIFACT_SPEC } from './artifact-spec';
import { JobsService, QaFailedError, type JobRow } from './jobs/jobs.service';
import { PromptService, type RefineInput } from './prompt/prompt.service';
import { QaService } from './qa/qa.service';
import { StorageService } from './storage.service';

/**
 * The generation orchestrator (08 §4) — the pipeline every artifact runs through:
 *
 *   CrisisCheck → MemoryContext → Prompt → LLM → QA → TTS → Storage → moments row
 *
 * It registers itself as the JobsService runner, which owns the retry lanes; the
 * orchestrator's job is to compose the steps and translate their failures into
 * the two error kinds the state machine understands (QaFailedError vs. any other).
 */
@Injectable()
export class GenerationService implements OnModuleInit {
  constructor(
    private readonly jobs: JobsService,
    private readonly memory: MemoryContextService,
    private readonly prompts: PromptService,
    private readonly qa: QaService,
    private readonly crisis: CrisisDetectionService,
    private readonly storage: StorageService,
    private readonly analytics: AnalyticsService,
    private readonly config: ConfigService<Env, true>,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Inject(TTS_PROVIDER) private readonly tts: TtsProvider,
    @Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient,
  ) {}

  onModuleInit(): void {
    this.jobs.registerRunner((job) => this.runPipeline(job));
  }

  /**
   * Runs one job end-to-end. Throws `QaFailedError` (→ corrective retry) or any
   * other error (→ provider backoff retry); the JobsService state machine catches
   * both. Returns the created moment id.
   */
  private async runPipeline(job: JobRow): Promise<{ momentId: string | null }> {
    const started = Date.now();
    if (job.artifact === 'letter')
      this.analytics.capture(job.user_id, 'letter_generation_started', {});

    try {
      const context = await this.memory.assemble(job.user_id, job.artifact);

      // The letter's crisis edge (Phase 5 edge cases): never block the wow. If the
      // struggle is crisis-flagged, generate the letter WITHOUT the struggle theme
      // and flag it supportive — the manifest/refine paths 422 instead (14 §5),
      // but the letter is the one thing she is promised no matter what.
      let supportive = false;
      if (job.artifact === 'letter' && context.struggle) {
        const { isCrisis } = await this.crisis.screen(context.struggle);
        if (isCrisis) {
          supportive = true;
          context.struggle = null;
        }
      }

      // Refine and Manifest carry input from the request through the job row
      // (04 §4), so a crash re-queue regenerates the SAME thing rather than a
      // generic moment she never asked for.
      const input = parseJobInput(job.input);
      const artifact = await this.generateWithQa(
        job.user_id,
        job.artifact,
        context,
        input.refine,
        input.desire,
      );

      const momentId = await this.persist(job, context, artifact, supportive, input);

      // Refining teaches the memory what she prefers (product 09 §9.1) — the
      // point of the feature is not this one rewrite, it is that the next moment
      // already sounds more like her.
      if (job.artifact === 'refine' && input.refine) {
        await this.recordRefinePreference(job.user_id, input.refine.direction);
      }

      if (job.artifact === 'letter') {
        this.analytics.capture(job.user_id, 'letter_generation_succeeded', {
          latency_s: Math.round((Date.now() - started) / 1000),
        });
      }
      return { momentId };
    } catch (error) {
      const reason = this.classify(error);
      if (job.artifact === 'letter') {
        this.analytics.capture(job.user_id, 'letter_generation_failed', { reason });
      }
      this.analytics.capture(job.user_id, 'generation_failed', {
        surface: job.artifact,
        reason,
      });
      throw error;
    }
  }

  /**
   * LLM call → defensive JSON parse → QA gate. Throws QaFailedError on a gate
   * failure; the state machine turns that into one corrective regeneration whose
   * retry re-enters here with no change (the corrective note lives in the prompt
   * for a future refinement — at V1 the retry is a fresh sample, which is enough).
   */
  private async generateWithQa(
    userId: string,
    artifact: JobArtifact,
    context: MemoryContext,
    refineInput?: RefineInput,
    desire?: string,
  ): Promise<GeneratedArtifact> {
    // A Manifest desire is HER request in her own words, so it joins the context
    // as an exact phrase rather than as an instruction — the prompt already
    // tells the model to reuse those literally (08 §3).
    const withDesire = desire
      ? { ...context, exactPhrases: [desire, ...context.exactPhrases] }
      : context;
    const built = this.prompts.build(artifact, withDesire, refineInput);

    const response = await this.llm.generate({
      system: built.system,
      prompt: built.prompt,
      maxTokens: built.maxTokens,
      timeoutMs: artifact === 'letter' ? 30_000 : 15_000,
      model: this.modelFor(ARTIFACT_MODEL_TIER[artifact]),
      json: true,
    });

    const parsed = this.parseArtifact(response.text);

    const result = this.qa.check(artifact, parsed, withDesire);
    for (const rule of result.flaggedRules) {
      this.analytics.capture(userId, 'generation_qa_flagged', { rule });
    }
    if (!result.passed) throw new QaFailedError(result.flaggedRules);

    return parsed;
  }

  /**
   * Defensive parse (08 §3): the model is asked for strict JSON, but a stray code
   * fence or leading prose must not crash the job. Extract the first JSON object;
   * a genuinely unparseable body is a malformed-output error (provider retry).
   */
  private parseArtifact(raw: string): GeneratedArtifact {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new MalformedOutputError();

    try {
      const obj = JSON.parse(match[0]) as { title?: unknown; body?: unknown };
      if (typeof obj.body !== 'string' || obj.body.trim() === '') throw new MalformedOutputError();
      return { title: typeof obj.title === 'string' ? obj.title : '', body: obj.body };
    } catch {
      throw new MalformedOutputError();
    }
  }

  /** Persists the moment row, then synthesizes + uploads audio for spoken artifacts. */
  private async persist(
    job: JobRow,
    context: MemoryContext,
    artifact: GeneratedArtifact,
    supportive: boolean,
    input: ParsedJobInput = { refine: undefined, desire: undefined },
  ): Promise<string> {
    const spec = ARTIFACT_SPEC[job.artifact];

    const { data: moment, error } = await this.supabase
      .from('moments')
      .insert({
        user_id: job.user_id,
        type: momentType(job.artifact),
        status: 'generating',
        title: artifact.title,
        body: artifact.body,
        // Lineage is what caps refine at one per moment (product 09 §9.1) and
        // what lets Home show a refined moment in place of its original.
        ...(input.refine?.momentId ? { refine_of: input.refine.momentId } : {}),
        ...(input.desire ? { desire_text: input.desire } : {}),
        qa_report: {
          prompt_version: this.prompts.build(job.artifact, context).promptVersion,
          supportive,
        },
      })
      .select('id')
      .single();

    if (error || !moment) throw new Error(`Persist failed: ${error?.message}`);

    if (spec.hasAudio) {
      // TTS runs after a successful LLM+QA pass; a TTS failure retries TTS only
      // in spirit (here the whole job retries, but the LLM output is deterministic
      // enough that a re-run is cheap and correct at V1). 10 §2.
      const voiceId = this.config.get('ELEVENLABS_VOICE_ID', { infer: true }) ?? 'default';
      const synth = await this.tts.synthesize({ text: artifact.body, voiceId });
      const audioPath = await this.storage.uploadMomentAudio(job.user_id, moment.id, synth.audio);

      await this.supabase
        .from('moments')
        .update({
          status: 'ready',
          audio_path: audioPath,
          // Plain {word,startMs,endMs} objects — jsonb-serializable, but the
          // generated Json type wants an index signature these interfaces lack.
          word_timings: synth.wordTimings as unknown as Json,
          duration_ms: synth.durationMs,
        })
        .eq('id', moment.id);
    } else {
      await this.supabase.from('moments').update({ status: 'ready' }).eq('id', moment.id);
    }

    return moment.id;
  }

  /**
   * Writes what she asked for as an evolving preference (09 §1, product 09 §9.1).
   *
   * Deliberately records the DIRECTION, never the note's free text: "she prefers
   * gentler" is a durable fact about her voice; the sentence she typed at 7am is
   * a moment, and the memory tier for that is not permanent.
   */
  private async recordRefinePreference(userId: string, direction: string): Promise<void> {
    const content = REFINE_PREFERENCE_MEMORY[direction];
    if (!content) return;

    await this.supabase.from('memory_items').insert({
      user_id: userId,
      category: 'preference',
      tier: 'evolving',
      content,
      source: 'refine',
      emotional_weight: 2,
    });
  }

  private modelFor(tier: ModelTier): string {
    if (tier === 'flagship') return this.config.get('LLM_MODEL_FLAGSHIP', { infer: true });
    if (tier === 'mid') return this.config.get('LLM_MODEL_MID', { infer: true });
    return this.config.get('LLM_MODEL_MINI', { infer: true });
  }

  private classify(error: unknown): GenerationFailureReason {
    if (error instanceof QaFailedError) return 'qa_failed';
    if (error instanceof MalformedOutputError) return 'malformed_output';
    if (error instanceof Error && /tim* out|abort/i.test(error.message)) return 'provider_timeout';
    return 'provider_error';
  }
}

/**
 * Job input, parsed defensively.
 *
 * The row is jsonb written by this service's own controller, but it also
 * survives a restart and a re-queue — so it is validated rather than trusted.
 * Anything unrecognisable degrades to "no input", which produces a plain moment
 * instead of throwing on a row that cannot be fixed by retrying.
 */
export interface ParsedJobInput {
  refine: (RefineInput & { momentId: string }) | undefined;
  desire: string | undefined;
}

const REFINE_DIRECTIONS = new Set(['more_realistic', 'softer', 'more_ambitious', 'note']);

function parseJobInput(raw: unknown): ParsedJobInput {
  if (!raw || typeof raw !== 'object') return { refine: undefined, desire: undefined };

  const value = raw as Record<string, unknown>;
  const desire =
    typeof value.desire === 'string' && value.desire.trim() !== '' ? value.desire : undefined;

  const refineRaw = value.refine as Record<string, unknown> | undefined;
  const refine =
    refineRaw &&
    typeof refineRaw.momentId === 'string' &&
    typeof refineRaw.previousBody === 'string' &&
    typeof refineRaw.direction === 'string' &&
    REFINE_DIRECTIONS.has(refineRaw.direction)
      ? {
          momentId: refineRaw.momentId,
          previousBody: refineRaw.previousBody,
          direction: refineRaw.direction as RefineInput['direction'],
          ...(typeof refineRaw.note === 'string' ? { note: refineRaw.note } : {}),
        }
      : undefined;

  return { refine, desire };
}

class MalformedOutputError extends Error {
  constructor() {
    super('LLM returned unparseable output');
    this.name = 'MalformedOutputError';
  }
}

/** Direction → the durable fact it implies about her voice. */
const REFINE_PREFERENCE_MEMORY: Record<string, string> = {
  more_realistic: 'She prefers moments that stay close to her real reach',
  softer: 'She prefers a gentler, more tender tone',
  more_ambitious: 'She prefers moments that reach further than she would ask for',
  note: 'She has asked for a moment to be rewritten in her own direction',
};

function momentType(
  artifact: JobArtifact,
): 'letter' | 'daily' | 'ondemand' | 'milestone' | 'winback' {
  if (artifact === 'letter') return 'letter';
  if (artifact === 'milestone') return 'milestone';
  if (artifact === 'winback') return 'winback';
  if (artifact === 'ondemand' || artifact === 'refine') return 'ondemand';
  return 'daily';
}
