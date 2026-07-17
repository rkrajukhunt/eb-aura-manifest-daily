-- Phase 3 — people (02 §1, product 07 S9).
--
-- The strongest specificity token the product has: the Letter mentions her
-- people BY NAME. Removed people stay for history but exit generation context
-- via `active` — silence over a wrong guess (product 10): a moment that names
-- someone she removed is the uncanny failure, so the flag defaults matter.

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Verbatim, exactly as she typed it (product 01: her words are sacred).
  name text not null,
  -- One word ("safe", "fun") — S9's shape.
  descriptor text,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

-- GRANTs + RLS together, always (02 §5 — policies alone deny everything).

grant select, insert, update, delete on public.people to authenticated;
grant all on public.people to service_role;

alter table public.people enable row level security;

create policy "own rows select" on public.people
  for select using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.people
  for insert with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.people
  for update using ((select auth.uid()) = user_id);
create policy "own rows delete" on public.people
  for delete using ((select auth.uid()) = user_id);

-- Context assembly reads active people per user (09 §4).
create index people_user_active_idx on public.people (user_id, active);
