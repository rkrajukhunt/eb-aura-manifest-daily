import { type HealthResponse } from '@aura/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { LLM_PROVIDER, type LlmProvider } from '../providers/llm/llm-provider.interface';
import { TTS_PROVIDER, type TtsProvider } from '../providers/tts/tts-provider.interface';
import { SUPABASE_CLIENT, type ServiceRoleClient } from '../supabase/supabase.module';

/** 07 §4: provider pings are cached for 60s so health checks can't amplify vendor spend. */
const CACHE_TTL_MS = 60_000;

/** A probe that hangs is a failed probe — the host's health check won't wait either. */
const PROBE_TIMEOUT_MS = 3_000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private cache: { at: number; value: HealthResponse } | null = null;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: ServiceRoleClient,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Inject(TTS_PROVIDER) private readonly tts: TtsProvider,
  ) {}

  async check(now: number = Date.now()): Promise<HealthResponse> {
    if (this.cache && now - this.cache.at < CACHE_TTL_MS) {
      return this.cache.value;
    }

    const [db, storage, llm, tts] = await Promise.all([
      this.probe('db', () => this.probeDb()),
      this.probe('storage', () => this.probeStorage()),
      this.probe('llm', () => this.llm.ping()),
      this.probe('tts', () => this.tts.ping()),
    ]);

    // `status` is liveness: the process answered. Dependency truth is in the flags,
    // so the host keeps a struggling instance in rotation rather than crash-looping it.
    const value: HealthResponse = { status: 'ok', db, storage, llm, tts };

    this.cache = { at: now, value };
    return value;
  }

  /** Never throws — a probe failure is a `false`, not a 500 (04 §7). */
  private async probe(name: string, fn: () => Promise<boolean>): Promise<boolean> {
    try {
      return await withTimeout(fn(), PROBE_TIMEOUT_MS);
    } catch (error) {
      this.logger.warn(`Health probe "${name}" failed: ${errorMessage(error)}`);
      return false;
    }
  }

  /**
   * A real query through the service-role client — a stronger signal than a 200
   * from the gateway, and the same path the generation pipeline will write on.
   */
  private async probeDb(): Promise<boolean> {
    const { error } = await this.supabase
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .limit(1);

    return error === null;
  }

  private async probeStorage(): Promise<boolean> {
    const { error } = await this.supabase.storage.listBuckets();
    return error === null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms).unref(),
    ),
  ]);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
