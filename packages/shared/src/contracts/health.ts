import { z } from 'zod';

/**
 * `GET /v1/health` (07 §4). Dependency probes are pinged with a cached 60s result
 * so health checks can't turn into a vendor-spend amplifier.
 */
export const healthResponseSchema = z
  .object({
    status: z.literal('ok'),
    db: z.boolean(),
    storage: z.boolean(),
    llm: z.boolean(),
    tts: z.boolean(),
  })
  // 07 §6: responses stay forward-compatible — the server may add fields.
  .passthrough();

export type HealthResponse = z.infer<typeof healthResponseSchema>;
