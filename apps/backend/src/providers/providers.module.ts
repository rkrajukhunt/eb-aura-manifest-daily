import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.schema';
import { LLM_PROVIDER, type LlmProvider } from './llm/llm-provider.interface';
import { MockLlmProvider } from './llm/mock-llm.provider';
import { TTS_PROVIDER, type TtsProvider } from './tts/tts-provider.interface';
import { MockTtsProvider } from './tts/mock-tts.provider';

/**
 * Vendor adapters, chosen at boot by env (04 §6, 00 §D4/§D5).
 *
 * Only the `mock` adapters exist at Phase 0. `OpenAiLlmProvider` and
 * `ElevenLabsTtsProvider` arrive in Phase 5 and register here — nothing outside
 * this module learns which vendor is live.
 */
@Global()
@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): LlmProvider => {
        const provider = config.get('LLM_PROVIDER', { infer: true });

        if (provider === 'mock') return new MockLlmProvider();

        // Phase 5 registers the real adapters. Until then, refuse loudly rather
        // than silently serving mock content to a real user.
        throw new Error(
          `LLM_PROVIDER="${provider}" is not implemented until Phase 5 (08 §2). Use LLM_PROVIDER=mock.`,
        );
      },
    },
    {
      provide: TTS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): TtsProvider => {
        const provider = config.get('TTS_PROVIDER', { infer: true });

        if (provider === 'mock') return new MockTtsProvider();

        throw new Error(
          `TTS_PROVIDER="${provider}" is not implemented until Phase 5 (10 §2). Use TTS_PROVIDER=mock.`,
        );
      },
    },
  ],
  exports: [LLM_PROVIDER, TTS_PROVIDER],
})
export class ProvidersModule {
  private readonly logger = new Logger(ProvidersModule.name);

  constructor(private readonly config: ConfigService<Env, true>) {
    this.logger.log(
      `Providers: llm=${this.config.get('LLM_PROVIDER', { infer: true })} ` +
        `tts=${this.config.get('TTS_PROVIDER', { infer: true })}`,
    );
  }
}
