/**
 * DB row types (01 §4, §5).
 *
 * `./database.types.ts` is GENERATED — never hand-edit it. Regenerate after every
 * migration with `pnpm db:types`; the output is committed so CI can typecheck
 * without booting Docker.
 *
 * This module re-exports it under friendlier names so app code imports rows from
 * `@aura/shared` rather than reaching across the repo.
 */
export type { Database, Json } from './database.types';

import type { Database } from './database.types';

/** `Row<'profiles'>` → the profiles row type. Tables arrive from Phase 2 onward. */
export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Insert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Update<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
