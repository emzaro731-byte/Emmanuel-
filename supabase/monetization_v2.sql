-- Destiny AI monetization V2: plan entitlements, daily usage limits and credits.
-- Run this once in the Supabase SQL Editor.
-- Client apps may read their own entitlement, but cannot change plan, usage or credits.

create table if not exists public.destiny_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  ai_requests integer not null default 0 check (ai_requests >= 0),
  primary key (user_id, usage_date)
);

alter table public.destiny_entitlements
  add column if not exists daily_ai_limit integer not null default 20;

alter table public.destiny_entitlements
  add column if not exists lifetime_ai_requests bigint not null default 0;

alter table public.destiny_usage_daily enable row level security;

drop policy if exists "Users can view own daily usage" on public.destiny_usage_daily;
create policy "Users can view own daily usage"
  on public.destiny_usage_daily for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on table public.destiny_usage_daily from anon, authenticated;
grant select on table public.destiny_usage_daily to authenticated;

-- Keep the daily limit controlled by the server-side entitlement record.
update public.destiny_entitlements
set daily_ai_limit = case plan
  when 'premium' then 1000
  when 'pro' then 200
  else 20
end
where daily_ai_limit is null or daily_ai_limit = 20;

-- Atomic server-side reservation for one AI request.
-- A free user receives 20 requests/day; Pro 200/day; Premium 1000/day.
-- Paid credit balances are separate from the daily request allowance.
create or replace function public.reserve_destiny_ai_request()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_limit integer := 20;
  v_used integer := 0;
  v_credits integer := 0;
  v_expires timestamptz;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  insert into public.destiny_entitlements (user_id, plan, credits, daily_ai_limit)
  values (v_user, 'free', 0, 20)
  on conflict (user_id) do nothing;

  select plan, credits, expires_at, daily_ai_limit
    into v_plan, v_credits, v_expires, v_limit
  from public.destiny_entitlements
  where user_id = v_user
  for update;

  if v_expires is not null and v_expires <= now() then
    v_plan := 'free';
    v_limit := 20;
  else
    v_limit := case v_plan
      when 'premium' then 1000
      when 'pro' then 200
      else 20
    end;
  end if;

  insert into public.destiny_usage_daily (user_id, usage_date, ai_requests)
  values (v_user, current_date, 0)
  on conflict (user_id, usage_date) do nothing;

  select ai_requests into v_used
  from public.destiny_usage_daily
  where user_id = v_user and usage_date = current_date
  for update;

  if v_used >= v_limit and v_credits <= 0 then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily_limit_reached',
      'plan', v_plan,
      'daily_limit', v_limit,
      'used', v_used,
      'credits', v_credits
    );
  end if;

  update public.destiny_usage_daily
  set ai_requests = ai_requests + 1
  where user_id = v_user and usage_date = current_date;

  update public.destiny_entitlements
  set lifetime_ai_requests = lifetime_ai_requests + 1,
      updated_at = now()
  where user_id = v_user;

  if v_used >= v_limit then
    update public.destiny_entitlements
    set credits = credits - 1,
        updated_at = now()
    where user_id = v_user and credits > 0;
    v_credits := greatest(v_credits - 1, 0);
  end if;

  return jsonb_build_object(
    'allowed', true,
    'plan', v_plan,
    'daily_limit', v_limit,
    'used', v_used + 1,
    'credits', v_credits
  );
end;
$$;

revoke all on function public.reserve_destiny_ai_request() from public;
grant execute on function public.reserve_destiny_ai_request() to authenticated;

-- Server-side helper for adding purchased credits. Never expose this to the client.
create or replace function public.add_destiny_credits(p_user_id uuid, p_credits integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_credits <= 0 then raise exception 'CREDITS_MUST_BE_POSITIVE'; end if;
  update public.destiny_entitlements
  set credits = credits + p_credits, updated_at = now()
  where user_id = p_user_id;
  if not found then
    insert into public.destiny_entitlements(user_id, plan, credits)
    values (p_user_id, 'free', p_credits);
  end if;
end;
$$;

revoke all on function public.add_destiny_credits(uuid, integer) from public, anon, authenticated;
