-- Destiny AI monetization/entitlements for Selar.
-- Run this in Supabase SQL Editor.

create table if not exists public.destiny_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'premium')),
  credits integer not null default 0 check (credits >= 0),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.destiny_selar_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  email text,
  product_id text,
  product_name text,
  amount numeric,
  currency text,
  raw_event jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

alter table public.destiny_entitlements enable row level security;
alter table public.destiny_selar_events enable row level security;

drop policy if exists "Users can view own entitlement" on public.destiny_entitlements;
create policy "Users can view own entitlement"
  on public.destiny_entitlements for select to authenticated
  using ((select auth.uid()) = user_id);

-- Selar events are server-only. No client INSERT/UPDATE/DELETE policies.
revoke all on table public.destiny_selar_events from anon, authenticated;
grant select on table public.destiny_entitlements to authenticated;

insert into public.destiny_entitlements (user_id, plan, credits)
select id, 'free', 0 from auth.users
on conflict (user_id) do nothing;
