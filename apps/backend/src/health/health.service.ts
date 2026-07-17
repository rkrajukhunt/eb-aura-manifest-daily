import { type HealthResponse } from '@aura/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.schema';
import { LLM_PROVIDER, type LlmProvider } from '../providers/llm/llm-provider.interface';
import { TTS_PROVIDER, type TtsProvider } from '../providers/tts/tts-provider.interface';

/** 07 §4: provider pings are cached for 60s so health checks can't amplify vendor spend. */
const CACHE_TTL_MS = 60_000;

/** A probe that hangs is a failed probe — the host's health check won't wait either. */
const PROBE_TIMEOUT_MS = 3_000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private cache: { at: number; value: HealthResponse } | null = null;

  constructor(
    private readonly config: ConfigService<Env, true>,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Inject(TTS_PROVIDER) private readonly tts: TtsProvider,
  ) {}

  async check(now: number = Date.now()): Promise<HealthResponse> {
    if (this.cache && now - this.cache.at < CACHE_TTL_MS) {
      return this.cache.value;
    }

    const [db, storage, llm, tts] = await Promise.all([
      this.probe('db', () => this.pingSupabase('/rest/v1/')),
      this.probe('storage', () => this.pingSupabase('/storage/v1/bucket')),
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
   * Phase 0 has no SupabaseModule yet (that lands in Phase 2), so reachability is
   * checked over plain HTTP. Phase 2 should swap this for the injected
   * service-role client — a real query is a stronger signal than a 200 from the gateway.
   */
  private async pingSupabase(path: string): Promise<boolean> {
    const url = new URL(path, this.config.get('SUPABASE_URL', { infer: true }));
    const key = this.config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });

    const res = await fetch(url, {
      method: 'GET',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });

    return res.ok;
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
