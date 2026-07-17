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

      const artifact = await this.generateWithQa(job.user_id, job.artifact, context);

      const momentId = await this.persist(job, context, artifact, supportive);

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
  ): Promise<GeneratedArtifact> {
    const built = this.prompts.build(artifact, context, refineInput);

    const response = await this.llm.generate({
      system: built.system,
      prompt: built.prompt,
      maxTokens: built.maxTokens,
      timeoutMs: artifact === 'letter' ? 30_000 : 15_000,
      model: this.modelFor(ARTIFACT_MODEL_TIER[artifact]),
      json: true,
    });

    const parsed = this.parseArtifact(response.text);

    const result = this.qa.check(artifact, parsed, context);
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

class MalformedOutputError extends Error {
  constructor() {
    super('LLM returned unparseable output');
    this.name = 'MalformedOutputError';
  }
}

function momentType(
  artifact: JobArtifact,
): 'letter' | 'daily' | 'ondemand' | 'milestone' | 'winback' {
  if (artifact === 'letter') return 'letter';
  if (artifact === 'milestone') return 'milestone';
  if (artifact === 'winback') return 'winback';
  if (artifact === 'ondemand' || artifact === 'refine') return 'ondemand';
  return 'daily';
}
