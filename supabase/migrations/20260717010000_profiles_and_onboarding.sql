-- Phase 2 — identity & profile (02 §1, §5, §7, §9).
--
-- Schema and RLS land together (01 §5). RLS is the security boundary for the whole
-- thin-backend design (00 §D1/§D10): mobile talks to Postgres directly, so a table
-- without policies is an open table.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

-- S5. An enum rather than free text: this is a fixed choice set, and the
-- generation pipeline branches on it.
create type public.work_feeling as enum (
  'love_it',
  'fine_for_now',
  'ready_for_new',
  'building_side'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles — one row per auth user, anonymous or claimed (03 §2.1)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- S3. The key personalization token — her name in the Letter's first line (product 08).
  name text,
  -- S4, verbatim. Her words are sacred (product 01) — stored exactly as typed.
  self_description text,
  work_feeling public.work_feeling,
  -- S6, ≤2 enforced by check: the constraint is the product rule.
  values text[] check (values is null or array_length(values, 1) <= 2),
  -- S7 card id.
  dream_home text,
  -- S8, verbatim ("not sure" stored as a feeling-word).
  dream_city text,
  -- S10, verbatim. SENSITIVE (02 §1, product 10): never selected into
  -- notification or share paths. There is no badge on this column — the rule is
  -- enforced by the queries that read it, not by anything visible to her.
  struggle text,

  -- S11, in her local time. Drives the pre-generation cron window (04 §5).
  arrival_time time,
  -- IANA name, captured at onboarding. Needed because arrival_time is local.
  timezone text,

  onboarding_completed_at timestamptz,

  -- Mirrors auth state so queries don't have to join auth.users (02 §1).
  is_anonymous boolean not null default true,
  -- Drives the >7-day inactive skip that guards generation cost (00 §D3).
  last_active_at timestamptz not null default now(),

  -- One voice at V1; column exists so a second voice needs no migration (10 §2).
  voice_id text,
  free_text_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.struggle is
  'S10, verbatim. SENSITIVE tier (product 10 §tiers): never include in notifications, '
  'share cards, or any surface leaving the app. Filtered at query time, not by a flag.';

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- onboarding_answers — raw answer log (02 §1)
-- ─────────────────────────────────────────────────────────────────────────────
-- profiles holds the working copy; this is the audit trail and the regeneration
-- source. Kept separate so a profile edit never destroys what she originally said.

create table public.onboarding_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  screen_id text not null,
  answer jsonb,
  skipped boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Profile creation trigger (02 §1, 03 §2.1)
-- ─────────────────────────────────────────────────────────────────────────────
-- Every auth user gets a profile the instant they exist, including the anonymous
-- sign-in on first launch. Doing this in the DB rather than the client means a
-- user can never exist without a profile, whatever the client does or crashes on.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- Explicit search_path: security definer runs as the owner, so a mutable
-- search_path would be a privilege-escalation vector.
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (user_id, is_anonymous)
  values (
    new.id,
    -- Supabase marks anonymous sign-ins with is_anonymous on the auth row.
    coalesce((new.is_anonymous)::boolean, false)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants — required alongside RLS, and easy to forget
-- ─────────────────────────────────────────────────────────────────────────────
-- RLS decides WHICH ROWS a role may touch; GRANT decides whether it may touch the
-- table at all. Both are needed: policies without grants deny everything, grants
-- without policies expose everything.
--
-- `anon` is deliberately granted NOTHING. Note that anonymous *sign-in* users
-- (00 §D2) carry role `authenticated`, not `anon` — `anon` means no JWT at all,
-- and no such caller has any business reading a profile. Defense in depth: even
-- if a policy were dropped by mistake, unauthenticated access still fails.

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.onboarding_answers to authenticated;

grant all on public.profiles to service_role;
grant all on public.onboarding_answers to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS baseline (02 §5) — the pattern every later user table copies
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

create policy "own rows select" on public.profiles
  for select using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.profiles
  for insert with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.profiles
  for update using ((select auth.uid()) = user_id);
create policy "own rows delete" on public.profiles
  for delete using ((select auth.uid()) = user_id);

alter table public.onboarding_answers enable row level security;

create policy "own rows select" on public.onboarding_answers
  for select using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.onboarding_answers
  for insert with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.onboarding_answers
  for update using ((select auth.uid()) = user_id);
create policy "own rows delete" on public.onboarding_answers
  for delete using ((select auth.uid()) = user_id);

-- Note on `(select auth.uid())`: wrapping the call lets Postgres evaluate it once
-- per query instead of once per row. Same semantics, materially faster on scans.

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes (02 §7)
-- ─────────────────────────────────────────────────────────────────────────────

-- The pre-generation cron scans by arrival window and skips inactive users (04 §5).
create index profiles_arrival_time_idx on public.profiles (arrival_time);
create index profiles_last_active_at_idx on public.profiles (last_active_at);

-- Answer log is always read per user.
create index onboarding_answers_user_id_idx on public.onboarding_answers (user_id, created_at);
