-- Phase 5 — generation content & operations (02 §3–4, §6).
--
-- Schema + GRANTs + RLS together, as always (02 §5). The new wrinkle here is
-- the ENGAGEMENT-COLUMN rule (02 §5 exceptions): users may update only their
-- engagement marks on content rows; the content itself is written exclusively
-- by the generation pipeline through the service role. Column-level GRANTs are
-- the enforcement mechanism — RLS decides rows, GRANT decides columns.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

create type public.moment_type as enum ('letter', 'daily', 'ondemand', 'milestone', 'winback');
create type public.moment_status as enum ('forming', 'generating', 'ready', 'failed', 'replaced');

create type public.affirmation_kind as enum ('daily', 'guided');
create type public.affirmation_status as enum ('candidate', 'kept');

create type public.job_artifact as enum (
  'letter', 'daily', 'ondemand', 'refine',
  'affirmation_daily', 'affirmation_guided', 'milestone', 'winback'
);
create type public.job_status as enum (
  'queued', 'running', 'qa_failed', 'retrying', 'succeeded', 'failed'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- moments — letters, daily, on-demand, milestones: one table, one player (02 §3)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  type public.moment_type not null,
  milestone_day int,
  status public.moment_status not null default 'forming',

  -- QA guarantees the title is sensitive-free (08 §5) — notifications and share
  -- surfaces read ONLY this column, never body (09 §5 anti-uncanny).
  title text,
  body text,
  word_timings jsonb,
  audio_path text,
  duration_ms int,

  scheduled_for date,
  desire_text text,
  refine_of uuid references public.moments (id),

  -- Prompt version + which checks passed — the generation-quality dashboard
  -- attributes regressions to prompt changes through this (08 §9).
  qa_report jsonb,

  played_at timestamptz,
  completed_at timestamptz,
  favorited_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.moments
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- affirmations (02 §3) — text-only cards at V1 (10 §7: no TTS, cost lever)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.affirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  kind public.affirmation_kind not null,
  text text not null,
  goal_area text,
  feeling text,
  tone text,
  why_line text,
  technique text,
  status public.affirmation_status not null default 'candidate',

  revealed_at timestamptz,
  saved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.affirmations
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- generation_jobs — backend-owned state machine (02 §4, 04 §4)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  artifact public.job_artifact not null,
  status public.job_status not null default 'queued',
  moment_id uuid references public.moments (id),
  attempt int not null default 0,
  -- Provider/QA codes ONLY — never user content (04 §4).
  error text,
  latency_ms int,
  -- Network-retry safety (04 §3): a replayed Idempotency-Key returns this job.
  idempotency_key text,

  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create unique index generation_jobs_idempotency_key
  on public.generation_jobs (user_id, idempotency_key)
  where idempotency_key is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- usage_credits — weekly Manifest cap, server-enforced (02 §4, 08 §7)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.usage_credits (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  manifest_used int not null default 0,
  primary key (user_id, week_start)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTs — the engagement-column rule lives here (02 §5 exceptions)
-- ─────────────────────────────────────────────────────────────────────────────

-- moments: select-own; update ONLY the engagement marks. No INSERT/DELETE —
-- content exists solely through the pipeline. Deleting content is account-level
-- (03 §5), not row-level, at V1.
grant select on public.moments to authenticated;
grant update (played_at, completed_at, favorited_at) on public.moments to authenticated;

-- affirmations: select-own; engagement marks + candidate→kept.
grant select on public.affirmations to authenticated;
grant update (revealed_at, saved_at, status) on public.affirmations to authenticated;

-- generation_jobs: select-own for status polling only (02 §5).
grant select on public.generation_jobs to authenticated;

-- usage_credits: select-own so the UI can show credits remaining; spend happens
-- inside generation endpoints (02 §5).
grant select on public.usage_credits to authenticated;

grant all on public.moments to service_role;
grant all on public.affirmations to service_role;
grant all on public.generation_jobs to service_role;
grant all on public.usage_credits to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.moments enable row level security;
create policy "own rows select" on public.moments
  for select using ((select auth.uid()) = user_id);
create policy "own rows update" on public.moments
  for update using ((select auth.uid()) = user_id);

alter table public.affirmations enable row level security;
create policy "own rows select" on public.affirmations
  for select using ((select auth.uid()) = user_id);
create policy "own rows update" on public.affirmations
  for update using ((select auth.uid()) = user_id);

alter table public.generation_jobs enable row level security;
create policy "own rows select" on public.generation_jobs
  for select using ((select auth.uid()) = user_id);

alter table public.usage_credits enable row level security;
create policy "own rows select" on public.usage_credits
  for select using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes (02 §7)
-- ─────────────────────────────────────────────────────────────────────────────

create index moments_user_type_scheduled_idx on public.moments (user_id, type, scheduled_for);
create index moments_user_status_idx on public.moments (user_id, status);
create index generation_jobs_status_created_idx on public.generation_jobs (status, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: the private audio bucket (02 §6, 10 §3)
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

-- Mobile reads its own folder via signed URLs (created from the user's session,
-- which requires SELECT on the object). Writes are pipeline-only.
create policy "own audio select" on storage.objects
  for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- Activate the memory expiry sweep (Phase 4 prepared it; 04 §5 schedules it)
-- ─────────────────────────────────────────────────────────────────────────────

select cron.schedule(
  'expire-temporary-memory',
  '0 * * * *',
  $$select public.expire_temporary_memory()$$
);
