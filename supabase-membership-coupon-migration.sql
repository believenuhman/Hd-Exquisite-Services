-- =============================================================================
-- HD XQUISITE LIQUORS — Membership + Coupon System Migration
-- Safe to re-run. Idempotent. Does NOT touch existing orders/products/users.
-- =============================================================================

-- ─── 1. user_memberships ─────────────────────────────────────────────────────
-- One row per customer (keyed by Supabase auth.users.id). Guests have no row
-- and are treated as the default "standard" tier in application code.
create table if not exists public.user_memberships (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  tier            text not null default 'standard'
                  check (tier in ('standard','gold','platinum')),
  status          text not null default 'pending_payment'
                  check (status in ('pending_payment','active','expired','cancelled')),
  started_at      timestamptz,
  expires_at      timestamptz,
  payment_reference text,
  paypal_order_id text,                              -- last successfully captured PayPal order id
  amount_paid     numeric(10,2),
  currency_code   text,
  -- Pending checkout snapshot. We store an in-flight PayPal order WITHOUT modifying
  -- the active tier/status/expires_at — that way an existing active member is never
  -- downgraded if they abandon a renewal/upgrade checkout.
  pending_paypal_order_id text,
  pending_tier            text check (pending_tier in ('standard','gold','platinum')),
  pending_amount          numeric(10,2),
  pending_currency_code   text,
  pending_created_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- For pre-existing tables, add the pending_* columns if they don't exist yet.
alter table public.user_memberships add column if not exists pending_paypal_order_id text;
alter table public.user_memberships add column if not exists pending_tier            text;
alter table public.user_memberships add column if not exists pending_amount          numeric(10,2);
alter table public.user_memberships add column if not exists pending_currency_code   text;
alter table public.user_memberships add column if not exists pending_created_at      timestamptz;

create index if not exists idx_user_memberships_user            on public.user_memberships (user_id);
create index if not exists idx_user_memberships_status          on public.user_memberships (status);
create index if not exists idx_user_memberships_expires         on public.user_memberships (expires_at);
create index if not exists idx_user_memberships_paypal          on public.user_memberships (paypal_order_id);
create index if not exists idx_user_memberships_pending_paypal  on public.user_memberships (pending_paypal_order_id);

-- ─── 2. coupons ──────────────────────────────────────────────────────────────
create table if not exists public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,                  -- always stored uppercase
  description     text,
  discount_type   text not null check (discount_type in ('percent','fixed','free_delivery')),
  discount_value  numeric(10,2) not null default 0,      -- percent (0-100) or fixed currency amount; 0 for free_delivery
  min_order       numeric(10,2) not null default 0,      -- minimum subtotal to use coupon (in same currency as orders)
  usage_limit     integer,                               -- null = unlimited
  per_user_limit  integer not null default 1,            -- max uses per signed-in user; ignored for guests (limit=1 by phone)
  member_only     text check (member_only in ('gold','platinum')) ,  -- null = open to all; otherwise minimum tier required
  active          boolean not null default true,
  starts_at       timestamptz,
  ends_at         timestamptz,
  times_used      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_coupons_code     on public.coupons (code);
create index if not exists idx_coupons_active   on public.coupons (active);

-- ─── 3. coupon_redemptions ───────────────────────────────────────────────────
-- Audit trail of every coupon application. One row per successful order apply.
create table if not exists public.coupon_redemptions (
  id            uuid primary key default gen_random_uuid(),
  coupon_id     uuid not null references public.coupons(id) on delete restrict,
  coupon_code   text not null,
  order_id      uuid references public.orders(id) on delete set null,
  user_id       uuid references auth.users(id)    on delete set null,
  customer_phone text,
  discount_amount numeric(10,2) not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_coupon_redemptions_coupon on public.coupon_redemptions (coupon_id);
create index if not exists idx_coupon_redemptions_order  on public.coupon_redemptions (order_id);
create index if not exists idx_coupon_redemptions_user   on public.coupon_redemptions (user_id);
create index if not exists idx_coupon_redemptions_phone  on public.coupon_redemptions (customer_phone);

-- ─── 4. Extend orders with membership + coupon snapshot ──────────────────────
-- Snapshot of WHAT was applied at purchase time. Future tier/coupon changes
-- never affect historical orders.
alter table public.orders add column if not exists user_id              uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists membership_tier      text;     -- 'standard' | 'gold' | 'platinum'
alter table public.orders add column if not exists membership_discount  numeric(10,2) not null default 0;
alter table public.orders add column if not exists coupon_code          text;
alter table public.orders add column if not exists coupon_discount      numeric(10,2) not null default 0;
alter table public.orders add column if not exists total_discount       numeric(10,2) not null default 0;

create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_coupon  on public.orders (coupon_code);

-- ─── 5. Seed sample coupons (safe to re-run; uses on-conflict do nothing) ────
insert into public.coupons (code, description, discount_type, discount_value, min_order, member_only, active)
values
  ('WELCOME10',  '10% off your first order',          'percent',       10, 0,    null,       true),
  ('SAVE5',      'BBD $5 off orders over $50',        'fixed',          5, 50,   null,       true),
  ('FREEDROP',   'Free delivery on any order',        'free_delivery',  0, 0,    null,       true),
  ('GOLD15',     'Gold member exclusive — 15% off',   'percent',       15, 0,    'gold',     true),
  ('PLATINUM20', 'Platinum exclusive — 20% off',      'percent',       20, 0,    'platinum', true)
on conflict (code) do nothing;
