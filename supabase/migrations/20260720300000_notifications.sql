-- Phase 9 — notifications (02 §3, doc 11).

create type public.affirmation_nudge as enum ('quiet', 'once_daily', 'custom_hours');

-- ─────────────────────────────────────────────────────────────────────────────
-- notification_tokens — one row per device (11 §1)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.notification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  expo_push_token text not null unique,
  device_id text,

  -- Set false when Expo reports DeviceNotRegistered (11 §1). Rows are kept
  -- rather than deleted so a reinstall on the same device can be recognised
  -- instead of quietly accumulating duplicates.
  active boolean not null default true,

  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- notification_prefs — respected at SEND time, not schedule time (11 §4)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,

  arrival_enabled boolean not null default true,
  affirmation_nudge public.affirmation_nudge not null default 'quiet',
  custom_start time,
  custom_end time,

  -- Auto-soften (11 §5, product 16: respect > re-engagement). Sends without an
  -- open increment this; any open resets it. At 3 the arrival note drops to a
  -- 3/week pattern — SILENTLY. Absence is never named in copy, so this counter
  -- is the only place it is represented at all.
  ignored_arrival_count int not null default 0,
  softened boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.notification_prefs
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- notification_sends — the double-delivery guard (11 §6)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- "One arrival notification per `moments.scheduled_for` date". Travel across
-- timezones can put a user in two scan windows on the same local day, and a
-- retried cron run can repeat one — either would deliver the same morning
-- twice. The unique index below makes a double send impossible rather than
-- unlikely.

create table public.notification_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  kind text not null,
  -- What this send is "about": a local date for arrivals, a moment id for
  -- milestones. Together with `kind` it is the idempotency key.
  dedupe_key text not null,

  moment_id uuid references public.moments (id) on delete set null,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,

  unique (user_id, kind, dedupe_key)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTs (02 §5)
-- ─────────────────────────────────────────────────────────────────────────────

-- She registers her own device and edits her own preferences.
grant select, insert, update, delete on public.notification_tokens to authenticated;
grant select, insert, update on public.notification_prefs to authenticated;
-- The send log is operational: she may read it (an open is attributed from the
-- client) but never author one.
grant select, update (opened_at) on public.notification_sends to authenticated;

grant all on public.notification_tokens to service_role;
grant all on public.notification_prefs to service_role;
grant all on public.notification_sends to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.notification_tokens enable row level security;
create policy "own rows select" on public.notification_tokens
  for select using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.notification_tokens
  for insert with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.notification_tokens
  for update using ((select auth.uid()) = user_id);
create policy "own rows delete" on public.notification_tokens
  for delete using ((select auth.uid()) = user_id);

alter table public.notification_prefs enable row level security;
create policy "own rows select" on public.notification_prefs
  for select using ((select auth.uid()) = user_id);
create policy "own rows insert" on public.notification_prefs
  for insert with check ((select auth.uid()) = user_id);
create policy "own rows update" on public.notification_prefs
  for update using ((select auth.uid()) = user_id);

alter table public.notification_sends enable row level security;
create policy "own rows select" on public.notification_sends
  for select using ((select auth.uid()) = user_id);
create policy "own rows update" on public.notification_sends
  for update using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

create index notification_tokens_user_active_idx on public.notification_tokens (user_id)
  where active;
create index notification_sends_user_kind_idx on public.notification_sends (user_id, kind, sent_at desc);
