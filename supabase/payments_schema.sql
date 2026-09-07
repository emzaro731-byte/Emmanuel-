-- Destiny AI payment records.
-- Run this in the Supabase SQL Editor before deploying create-payment.

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

alter table public.destiny_payments enable row level security;

drop policy if exists "Users can view own payments" on public.destiny_payments;
create policy "Users can view own payments"
  on public.destiny_payments
  for select
  using (auth.uid() = user_id);

-- Inserts/updates are intentionally server-side through the Edge Function.
