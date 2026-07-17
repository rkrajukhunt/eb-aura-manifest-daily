-- Baseline migration (Phase 0).
--
-- Intentionally creates no application tables. Those arrive with the phase that
-- owns them (01 §5, IMPLEMENTATION-PLAN): profiles/onboarding_answers in Phase 2,
-- people in Phase 3, memory_items/exact_phrases/never_include in Phase 4, and so on.
--
-- This file exists to (a) pin a migration timeline from day one and (b) install the
-- extensions and conventions every later migration assumes.
--
-- Convention for all later migrations (01 §5): schema and its RLS policies land in
-- the SAME migration. A table without RLS must never reach main — RLS is the
-- security boundary for the whole thin-backend architecture (00 §D1, §D10).

-- gen_random_uuid() for primary keys. Bundled with Postgres 13+, declared for clarity.
create extension if not exists "pgcrypto" with schema "extensions";

-- Scheduled jobs (04 §5: pre-generation, milestone letters, memory expiry sweeps).
-- Activated in Phase 5; declared here so environments are identical from the start.
create extension if not exists "pg_cron" with schema "extensions";

-- Shared trigger: keeps `updated_at` honest without every table restating it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger helper: sets updated_at to now() on UPDATE. Attach with: '
  'create trigger set_updated_at before update on <table> '
  'for each row execute function public.set_updated_at();';
