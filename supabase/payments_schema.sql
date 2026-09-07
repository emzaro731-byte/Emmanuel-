-- Destiny AI payment records.
-- Transactional data is client-readable only for the authenticated owner.
-- Merchant/bank account details MUST NOT be stored in this public table.
-- Put merchant account secrets in Supabase Edge Function secrets instead.

create table if not exists public.destiny_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null unique,
  plan text not null check (plan in ('pro', 'premium')),
  amount_kobo bigint not null check (amount_kobo > 0),
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  provider text not null default 'moniepoint',
  checkout_url text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists destiny_payments_user_created_idx
  on public.destiny_payments (user_id, created_at desc);

create index if not exists destiny_payments_reference_idx
  on public.destiny_payments (reference);

alter table public.destiny_payments enable row level security;

-- Remove broad/default policies before recreating the owner-only read policy.
drop policy if exists "Users can view own payments" on public.destiny_payments;
drop policy if exists "Users can insert own payments" on public.destiny_payments;
drop policy if exists "Users can update own payments" on public.destiny_payments;
drop policy if exists "Users can delete own payments" on public.destiny_payments;

create policy "Users can view own payments"
  on public.destiny_payments
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Payment creation, status changes, and provider callbacks are server-side only.
-- No INSERT/UPDATE/DELETE policy is intentionally exposed to the mobile client.

revoke all on table public.destiny_payments from anon;
revoke all on table public.destiny_payments from authenticated;
grant select on table public.destiny_payments to authenticated;

after schema migration, the Edge Function uses its server-side secret key to create/update records.
