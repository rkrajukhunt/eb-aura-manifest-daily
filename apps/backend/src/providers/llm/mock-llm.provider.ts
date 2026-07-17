import { Injectable } from '@nestjs/common';

import type {
  LlmGenerateRequest,
  LlmGenerateResponse,
  LlmProvider,
} from './llm-provider.interface';

/**
 * Dev/CI adapter (08 §1). No network, no spend — every test and local run uses
 * this. Real prompt/QA logic is Phase 5; this only has to satisfy the interface
 * and stay deterministic so tests don't flake.
 */
@Injectable()
export class MockLlmProvider implements LlmProvider {
  async generate(req: LlmGenerateRequest): Promise<LlmGenerateResponse> {
    const text = `[mock-llm] ${req.prompt.slice(0, 80)}`;
    return {
      text,
      usage: {
        // Rough word-count stand-in; real usage comes from the vendor response.
        inputTokens: countWords(req.system) + countWords(req.prompt),
        outputTokens: countWords(text),
      },
    };
  }

  async ping(): Promise<boolean> {
    return true;
  }
}

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}
