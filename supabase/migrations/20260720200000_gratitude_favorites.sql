-- Phase 8 — gratitude & favourites (02 §3).
--
-- `gratitude_entries` is the one table users write DIRECTLY and freely: the
-- entry is her own sentence, saved locally first and synced silently (product
-- 09 §9.4), so it needs full insert/update/delete for `authenticated` rather
-- than the service-role-only pattern the generated content tables use.
--
-- The UNIQUE(user_id, entry_date) is load-bearing product behaviour, not just
-- hygiene: a second entry on the same day is an EDIT, never a duplicate
-- (product 09 §9.4 edge cases). The constraint is what lets the offline queue
-- upsert blindly on reconnect without inventing a second row for one day.

create table public.gratitude_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Verbatim, and the point of the feature: this text becomes memory and
  -- returns in her moments (09 §1, product 09 §9.4's stated contract).
  entry text not null,

  -- What we asked her, and whether it was personalized — the analytics question
  -- is "does a personalized prompt produce more entries", answerable without
  -- ever reading the entry itself (13 §2).
  prompt_shown text,
  prompt_was_personalized boolean not null default false,

  -- HER local date, decided on device. A server date would give users west of
  -- the server two entries some days and none on others.
  entry_date date not null,

  -- True when the row arrived from the offline queue rather than a live write.
  synced_from_local boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, entry_date)
);

create trigger set_updated_at
  before update on public.gratitude_entries
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- favorites — server truth for what she kept (02 §3)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  moment_id uuid references public.moments (id) on delete cascade,
  affirmation_id uuid references public.affirmations (id) on delete cascade,

  created_at timestamptz not null default now(),

  -- Exactly one target. A row favouriting both, or neither, is meaningless and
  -- would quietly break the library's counts.
  constraint favorites_one_target check (
    (moment_id is not null and affirmation_id is null)
    or (moment_id is null and affirmation_id is not null)
  )
);

-- Favouriting the same thing twice is a no-op, not a second row.
create unique index favorites_unique_moment on public.favorites (user_id, moment_id)
  where moment_id is not null;
create unique index favorites_unique_affirmation on public.favorites (user_id, affirmation_id)
  where affirmation_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTs (02 §5)
-- ─────────────────────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.gratitude_entries to authenticated;
grant all on public.gratitude_entries to service_role;

grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.gratitude_entries enable row level security;
create policy "own rows select" on public.gratitude_entries
  for select using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.gratitude_entries
  for insert with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.gratitude_entries
  for update using ((select auth.uid()) = user_id);
-- Per-entry delete is promised in product 09 §9.4 ("Deletable per-entry").
create policy "own rows delete" on public.gratitude_entries
  for delete using ((select auth.uid()) = user_id);

alter table public.favorites enable row level security;
create policy "own rows select" on public.favorites
  for select using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.favorites
  for insert with check ((select auth.uid()) = user_id);
create policy "own rows delete" on public.favorites
  for delete using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes (02 §7)
-- ─────────────────────────────────────────────────────────────────────────────

-- Dots and history both read by user + date.
create index gratitude_entries_user_date_idx on public.gratitude_entries (user_id, entry_date desc);
create index favorites_user_idx on public.favorites (user_id, created_at desc);
