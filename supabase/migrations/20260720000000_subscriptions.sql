-- Phase 10 — subscriptions (02 §4, 12 §5).
--
-- `subscription_state` is a MIRROR, not the source of truth. RevenueCat's SDK is
-- what gates the UI (12 §2); this row exists so the BACKEND can gate too — the
-- entitlement guard, credit checks and the win-back cron all need to know who is
-- premium without calling RevenueCat on every request. Mirror lag is tolerated
-- by design (12 §5): the client already knows, and the server catches up on the
-- next webhook.
--
-- Writes are service-role only. A user who could write this table could grant
-- herself premium, so the GRANTs below give `authenticated` SELECT and nothing
-- else — the one table in the schema where that asymmetry is the whole point.

create type public.entitlement as enum ('free', 'premium');
create type public.period_type as enum ('trial', 'normal');

create table public.subscription_state (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- RC `app_user_id` ≡ Supabase `user_id` for anonymous AND claimed users
  -- (03 §4), so this is normally a copy of user_id. Stored anyway because a
  -- TRANSFER event (12 §5) is precisely the case where they diverge, and the
  -- incoming id is what identifies the row to re-point.
  rc_app_user_id text,

  entitlement public.entitlement not null default 'free',
  product_id text,
  period_type public.period_type,

  -- Entitlement survives to period end after a cancellation (12 §5) — she paid
  -- for the period, so `will_renew=false` with a future `expires_at` is a
  -- perfectly normal premium state, not a lapsed one.
  expires_at timestamptz,
  will_renew boolean not null default false,

  -- Last RC event applied, for support and for webhook idempotency debugging.
  last_event text,
  last_event_at timestamptz,

  -- Set on EXPIRATION; the win-back cron reads it (12 §5, 11 §3).
  lapsed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.subscription_state
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTs (02 §5) — select-own only; every write is service-role.
-- ─────────────────────────────────────────────────────────────────────────────

grant select on public.subscription_state to authenticated;
grant all on public.subscription_state to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.subscription_state enable row level security;
create policy "own rows select" on public.subscription_state
  for select using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- The win-back cron sweeps recently-lapsed users (11 §3).
create index subscription_state_lapsed_idx on public.subscription_state (lapsed_at)
  where lapsed_at is not null;

-- TRANSFER re-points by RC id rather than by user_id (03 §2.3).
create index subscription_state_rc_app_user_idx on public.subscription_state (rc_app_user_id);
