import { apiErrorSchema, healthResponseSchema, type ApiErrorKey } from '@aura/shared';
import type { z } from 'zod';

import { env } from './env';
import { supabase } from './supabase';

/**
 * Backend client (01 §2). Every request/response shape comes from `@aura/shared`
 * — this file never declares one locally (01 §4).
 *
 * Phase 2 adds the 401-refresh-retry; Phase 5 adds the generation endpoints and
 * job polling. Errors surface as `ApiRequestError` carrying a stable `key` that
 * mobile maps to in-voice copy — the raw message is never shown to a user (07 §5).
 */
export class ApiRequestError extends Error {
  constructor(
    readonly key: ApiErrorKey,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface RequestOptions<TSchema extends z.ZodTypeAny> {
  path: string;
  schema: TSchema;
  method?: 'GET' | 'POST';
  body?: unknown;
  /** POSTs are idempotency-key aware (07 §1) — network retries must not double-charge. */
  idempotencyKey?: string;
  /** Health is the one unauthenticated route (04 §7). */
  authenticated?: boolean;
}

export async function request<TSchema extends z.ZodTypeAny>(
  options: RequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const res = await send(options);

  // A JWT can expire mid-session (03 §2 edge cases). Supabase usually refreshes
  // ahead of time, but on a clock skew or a long background it won't — so refresh
  // once and retry rather than bouncing her to an error for a solvable problem.
  if (res.status === 401 && options.authenticated !== false) {
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      throw new ApiRequestError('unauthorized', 401, 'Session refresh failed');
    }

    // Exactly one retry: a second 401 after a fresh token is a real rejection,
    // and looping would hammer the backend.
    return parse(await send(options), options.schema);
  }

  return parse(res, options.schema);
}

async function send<TSchema extends z.ZodTypeAny>({
  path,
  method = 'GET',
  body,
  idempotencyKey,
  authenticated = true,
}: RequestOptions<TSchema>): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (authenticated) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new ApiRequestError('unauthorized', 401, 'No Supabase session');
    headers.Authorization = `Bearer ${token}`;
  }

  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  return fetch(new URL(path, env.EXPO_PUBLIC_API_URL), {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function parse<TSchema extends z.ZodTypeAny>(
  res: Response,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    throw parsed.success
      ? new ApiRequestError(parsed.data.error.key, res.status, parsed.data.error.message)
      : new ApiRequestError('internal', res.status, `Unparseable error body (${res.status})`);
  }

  return schema.parse(json);
}

export const api = {
  health: () => request({ path: '/v1/health', schema: healthResponseSchema, authenticated: false }),
};
