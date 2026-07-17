import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

/**
 * Helpers for the RLS suite (15 §2.4, required CI suite).
 *
 * These run against a LIVE local Supabase (`pnpm db:start`). Nothing is mocked —
 * a mocked RLS test would prove nothing, since RLS is enforced by Postgres.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

/** Bypasses RLS. Used only to arrange fixtures and assert ground truth. */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Unauthenticated client — carries the anon key but no user. */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

/**
 * Creates a confirmed user and returns a client authenticated AS THAT USER —
 * i.e. anon key + their JWT, exactly what the mobile app holds. This is the
 * client whose access must be constrained by RLS.
 */
export async function createTestUser(): Promise<TestUser> {
  const admin = serviceClient();
  const email = `rls-${randomUUID()}@example.test`;
  const password = randomUUID();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn failed: ${signInError.message}`);

  return { id: data.user.id, email, client };
}

export async function deleteTestUser(userId: string): Promise<void> {
  await serviceClient().auth.admin.deleteUser(userId);
}
