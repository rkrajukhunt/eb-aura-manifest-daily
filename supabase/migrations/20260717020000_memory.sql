-- Phase 4 — Living Memory (02 §2, 09). The moat.
--
-- Deliberately structured rows + a phrase list. No embeddings, no RAG at V1
-- (00 §D9, product 10): the behaviours are the product, not the retrieval tech.
--
-- Schema + GRANTs + RLS land together (01 §5, 02 §5). GRANTs are not optional —
-- policies alone deny everything, including a user's own rows (Phase 2 finding).

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums (02 §2)
-- ─────────────────────────────────────────────────────────────────────────────

create type public.memory_category as enum (
  'identity',
  'dream',
  'person',
  'place_lifestyle',
  'struggle',
  'phrase',
  'milestone',
  'preference',
  'gratitude_ref',
  'temp_context'
);

-- Tier drives the injection rule (09 §2). `sensitive` is the one that matters
-- most: it must never reach a title, notification, share card, or analytics event.
create type public.memory_tier as enum ('permanent', 'evolving', 'temporary', 'sensitive');

create type public.memory_source as enum (
  'onboarding',
  'gratitude',
  'refine',
  'manifest',
  'profile_edit',
  'system'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- memory_items (02 §2)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  category public.memory_category not null,
  tier public.memory_tier not null,

  -- Plain language, as shown verbatim on "What Aura Knows" ("Your dream city is
  -- London"). This column IS the transparency screen — if it reads like a
  -- database row, the screen reads like surveillance (09 §6, product 10).
  content text not null,
  -- Her exact wording, where there is one. Her words are sacred (product 01).
  verbatim text,

  source public.memory_source not null,
  -- Polymorphic on purpose: points at a gratitude entry, a person, a moment…
  -- No FK — the targets live in different tables and arrive in different phases.
  source_id uuid,

  -- 1–5, set at write (09 §3). Sampling priority only — never surfaced to her.
  emotional_weight smallint not null default 2 check (emotional_weight between 1 and 5),

  -- Temporary tier only; the expiry sweep reads this (09 §2). The check keeps the
  -- two in step: a temporary item without an expiry would live forever.
  expires_at timestamptz,
  constraint temporary_items_expire check (
    (tier = 'temporary' and expires_at is not null)
    or (tier <> 'temporary' and expires_at is null)
  ),

  -- Cadence guards + anti-repetition (09 §4/§5). Bumped on injection.
  last_used_at timestamptz,
  use_count int not null default 0,

  -- She marked a sensitive item "done/private" → excluded from context entirely
  -- (09 §2). Distinct from deletion: the row stays, it just stops being used.
  excluded boolean not null default false,

  -- System expiry audit only. A USER delete is a hard DELETE (09 §6) — this
  -- column must never be repurposed into a soft-delete for her actions.
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.memory_items.deleted_at is
  'System expiry audit ONLY. User deletion is a hard DELETE (09 §6, product 18: '
  '"delete means delete"). Never use this to soft-delete something a user removed.';

comment on column public.memory_items.excluded is
  'She marked a sensitive item done/private (09 §2) — excluded from all context. '
  'The row survives; it simply stops being spent.';

create trigger set_updated_at
  before update on public.memory_items
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- exact_phrases (02 §2) — the personalization fuel
-- ─────────────────────────────────────────────────────────────────────────────
-- Harvested from every free-text surface and replayed verbatim. This is what
-- makes a moment feel written for her rather than about her (product 03).

create table public.exact_phrases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  phrase text not null,
  source public.memory_source not null,
  memory_item_id uuid references public.memory_items (id) on delete cascade,

  last_used_at timestamptz,
  use_count int not null default 0,

  created_at timestamptz not null default now()
);

-- Re-harvesting the same text must not stack duplicates, which would skew
-- sampling toward whatever she happened to repeat (09 §6 edge case).
create unique index exact_phrases_user_phrase_key
  on public.exact_phrases (user_id, lower(phrase));

-- ─────────────────────────────────────────────────────────────────────────────
-- never_include (02 §2) — the hard exclusion list
-- ─────────────────────────────────────────────────────────────────────────────
-- Enforced at prompt build AND as a post-generation QA check (08 §5, 09 §6).
-- Belt and braces on purpose: this is the list of things that would hurt to hear.

create table public.never_include (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  term text not null,
  created_at timestamptz not null default now()
);

create unique index never_include_user_term_key
  on public.never_include (user_id, lower(term));

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants (see 02 §5 — required alongside RLS)
-- ─────────────────────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.memory_items to authenticated;
grant select, insert, update, delete on public.exact_phrases to authenticated;
grant select, insert, update, delete on public.never_include to authenticated;

grant all on public.memory_items to service_role;
grant all on public.exact_phrases to service_role;
grant all on public.never_include to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS baseline (02 §5)
-- ─────────────────────────────────────────────────────────────────────────────
-- Mobile reads these directly for "What Aura Knows" (09 §6), so these policies
-- are the only thing between one woman's struggle and another's screen.

alter table public.memory_items enable row level security;

create policy "own rows select" on public.memory_items
  for select using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.memory_items
  for insert with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.memory_items
  for update using ((select auth.uid()) = user_id);
create policy "own rows delete" on public.memory_items
  for delete using ((select auth.uid()) = user_id);

alter table public.exact_phrases enable row level security;

create policy "own rows select" on public.exact_phrases
  for select using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.exact_phrases
  for insert with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.exact_phrases
  for update using ((select auth.uid()) = user_id);
create policy "own rows delete" on public.exact_phrases
  for delete using ((select auth.uid()) = user_id);

alter table public.never_include enable row level security;

create policy "own rows select" on public.never_include
  for select using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.never_include
  for insert with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.never_include
  for update using ((select auth.uid()) = user_id);
create policy "own rows delete" on public.never_include
  for delete using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes (02 §7)
-- ─────────────────────────────────────────────────────────────────────────────

-- Context assembly reads by tier + category (09 §4).
create index memory_items_user_tier_category_idx
  on public.memory_items (user_id, tier, category);

-- The expiry sweep (09 §2) scans only temporary rows — a partial index keeps it
-- cheap as the table grows.
create index memory_items_temporary_expiry_idx
  on public.memory_items (expires_at)
  where tier = 'temporary' and expires_at is not null;

create index exact_phrases_user_id_idx on public.exact_phrases (user_id);
create index never_include_user_id_idx on public.never_include (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Expiry sweep (09 §2) — prepared here, scheduled in Phase 5
-- ─────────────────────────────────────────────────────────────────────────────
-- V1 expires silently. The "How did Thursday go?" follow-up that would convert a
-- temporary item into a milestone is a V1.1 flag, explicitly out of scope.
--
-- Defined now so the sweep ships with the schema it depends on; Phase 5 attaches
-- the pg_cron schedule (04 §5, hourly).

create or replace function public.expire_temporary_memory()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  delete from public.memory_items
  where tier = 'temporary'
    and expires_at is not null
    and expires_at < now();

  get diagnostics removed = row_count;
  return removed;
end;
$$;

comment on function public.expire_temporary_memory() is
  'Deletes expired temporary memory (09 §2). Phase 5 schedules this hourly via '
  'pg_cron (04 §5). Returns the row count for the cron run log.';

-- Only the backend's service role may sweep; this is not a user-callable action.
revoke all on function public.expire_temporary_memory() from public, anon, authenticated;
grant execute on function public.expire_temporary_memory() to service_role;
