/**
 * LLM abstraction (08 §1, 00 §D4).
 *
 * All prompt logic lives OUTSIDE adapters — switching vendors touches one file.
 * Launch vendor is OpenAI (08 §2, locked 2026-07-17); adapters are selected by
 * the `LLM_PROVIDER` env at boot (04 §6).
 */
export interface LlmGenerateRequest {
  system: string;
  prompt: string;
  maxTokens: number;
  timeoutMs: number;
  /**
   * Exact model id for this call (08 §2 tiering). The generation layer resolves
   * artifact → tier → env id and passes it; the adapter stays dumb about tiers.
   * Omitted for `ping`, where the adapter uses its cheapest default.
   */
  model?: string;
  /**
   * Ask the provider to return strict JSON (08 §3). Adapters that support a
   * response-format flag use it; the pipeline parses defensively regardless.
   */
  json?: boolean;
}

export interface LlmGenerateResponse {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface LlmProvider {
  generate(req: LlmGenerateRequest): Promise<LlmGenerateResponse>;
  /** Reachability probe for /v1/health (04 §7). Must never throw. */
  ping(): Promise<boolean>;
}

/** Nest DI token — `LlmProvider` is an interface and vanishes at runtime. */
export const LLM_PROVIDER = Symbol('LlmProvider');
