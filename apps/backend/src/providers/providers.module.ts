import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.schema';
import { LLM_PROVIDER, type LlmProvider } from './llm/llm-provider.interface';
import { MockLlmProvider } from './llm/mock-llm.provider';
import { OpenAiLlmProvider } from './llm/openai-llm.provider';
import { TTS_PROVIDER, type TtsProvider } from './tts/tts-provider.interface';
import { MockTtsProvider } from './tts/mock-tts.provider';
import { ElevenLabsTtsProvider } from './tts/elevenlabs-tts.provider';

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

        if (provider === 'openai') {
          const apiKey = config.get('LLM_API_KEY', { infer: true });
          // Env validation already requires the key for a non-mock provider, but
          // narrow it here so the adapter's config is non-optional.
          if (!apiKey) throw new Error('LLM_API_KEY is required for LLM_PROVIDER=openai');
          return new OpenAiLlmProvider({
            apiKey,
            baseUrl: config.get('LLM_BASE_URL', { infer: true }),
            defaultModel: config.get('LLM_MODEL_MINI', { infer: true }),
          });
        }

        // Anthropic is a future adapter (08 §2 D4: vendor-open); not built at V1.
        throw new Error(`LLM_PROVIDER="${provider}" has no adapter yet. Use openai or mock.`);
      },
    },
    {
      provide: TTS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): TtsProvider => {
        const provider = config.get('TTS_PROVIDER', { infer: true });

        if (provider === 'mock') return new MockTtsProvider();

        if (provider === 'elevenlabs') {
          const apiKey = config.get('ELEVENLABS_API_KEY', { infer: true });
          if (!apiKey)
            throw new Error('ELEVENLABS_API_KEY is required for TTS_PROVIDER=elevenlabs');
          return new ElevenLabsTtsProvider({
            apiKey,
            model: config.get('ELEVENLABS_MODEL', { infer: true }),
          });
        }

        throw new Error(`TTS_PROVIDER="${provider}" has no adapter yet. Use elevenlabs or mock.`);
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
