import { Logger } from '@nestjs/common';

import type {
  LlmGenerateRequest,
  LlmGenerateResponse,
  LlmProvider,
} from './llm-provider.interface';

interface OpenAiConfig {
  apiKey: string;
  baseUrl: string;
  /** Cheapest tier — used by `ping` and as the fallback when a call omits a model. */
  defaultModel: string;
}

/**
 * OpenAI adapter (08 §2, launch vendor). Deliberately fetch-based — no SDK — so
 * the backend carries one fewer dependency and one fewer supply-chain surface;
 * the Chat Completions contract is small and stable.
 *
 * All prompt logic lives OUTSIDE this file (08 §1): the adapter only turns a
 * neutral request into an HTTP call and back. Switching vendors touches only
 * the adapter registered in ProvidersModule.
 *
 * No-retention posture (08 §2, 14 §8): zero-data-retention must be enabled on
 * the OpenAI org before production keys issue — that is an account setting, not
 * something this code can assert, so it lives on the release checklist.
 */
export class OpenAiLlmProvider implements LlmProvider {
  private readonly logger = new Logger(OpenAiLlmProvider.name);

  constructor(private readonly config: OpenAiConfig) {}

  async generate(req: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs);

    try {
      const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: req.model ?? this.config.defaultModel,
          max_tokens: req.maxTokens,
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.prompt },
          ],
          ...(req.json ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Body may carry a vendor error message — safe to log (it's about OUR
        // request, never the user's content, which is in the prompt we sent).
        const detail = await res.text().catch(() => '');
        throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 200)}`);
      }

      const json = (await res.json()) as OpenAiChatResponse;
      const text = json.choices?.[0]?.message?.content ?? '';

      return {
        text,
        usage: {
          inputTokens: json.usage?.prompt_tokens ?? 0,
          outputTokens: json.usage?.completion_tokens ?? 0,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Reachability probe for /v1/health (04 §7). Never throws (07 §4). */
  async ping(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(`${this.config.baseUrl}/models/${this.config.defaultModel}`, {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
          signal: controller.signal,
        });
        return res.ok;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      this.logger.warn(`OpenAI ping failed: ${error instanceof Error ? error.message : 'unknown'}`);
      return false;
    }
  }
}

interface OpenAiChatResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}
