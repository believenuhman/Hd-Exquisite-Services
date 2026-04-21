-- HD Xquisite Liquors — Supabase Schema
-- Run this in your Supabase SQL Editor

-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Whiskey',
  price numeric(10,2) not null default 0,
  rating numeric(3,1) not null default 4.5,
  description text not null default '',
  image_url text,
  is_trending boolean not null default false,
  is_active boolean not null default true,
  stock_qty integer not null default 0,
  created_at timestamptz not null default now()
);

-- Settings (single row)
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  currency_code text not null default 'USD',
  currency_symbol text not null default '$',
  delivery_mode text not null default 'zone',
  flat_fee numeric(10,2) not null default 9.99,
  min_order numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- Delivery Zones
create table if not exists delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fee numeric(10,2) not null default 0,
  is_active boolean not null default true
);

-- Orders
-- IMPORTANT: payment_method, payment_status, payment_reference, gateway_name,
-- paid_at, and paypal_order_id are authoritative server-set columns.
-- No public RLS policy permits clients to insert or update these rows directly.
-- All order writes go through the backend Express server using the service role key.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  delivery_notes text,
  age_confirmed boolean not null default false,
  status text not null default 'received'
    check (status in ('received','packing','out_for_delivery','delivered','refused')),
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency_code text not null default 'USD',
  currency_symbol text not null default '$',
  zone_id uuid references delivery_zones(id),
  refusal_reason text,
  created_at timestamptz not null default now(),
  -- Payment columns (server-set only — never trusted from client)
  payment_method text not null default 'cash_on_delivery'
    check (payment_method in ('cash_on_delivery', 'online_card')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  payment_reference text,
  gateway_name text,
  paid_at timestamptz,
  -- Bound PayPal order ID — unique so one PayPal token cannot be replayed across orders
  paypal_order_id text unique
);

-- Order Items
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid,
  name text not null,
  qty integer not null default 1,
  unit_price numeric(10,2) not null default 0
);

-- Storage bucket for product images
insert into storage.buckets (id, name, public)
  values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

-- RLS Policies
alter table products enable row level security;
alter table settings enable row level security;
alter table delivery_zones enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- ── Migration: drop previously created policies before re-creating ────────────
-- These DROP statements are safe to run on a fresh database (IF EXISTS).
-- On existing databases they remove the old over-permissive policies so the
-- hardened ones below take effect cleanly.
drop policy if exists "public insert orders"      on orders;
drop policy if exists "public insert order_items" on order_items;
drop policy if exists "public read orders"        on orders;
drop policy if exists "public read order_items"   on order_items;

drop policy if exists "auth manage products"      on products;
drop policy if exists "auth manage settings"      on settings;
drop policy if exists "auth manage zones"         on delivery_zones;
drop policy if exists "auth manage orders"        on orders;
drop policy if exists "auth manage order_items"   on order_items;

drop policy if exists "auth upload product images" on storage.objects;
drop policy if exists "auth update product images" on storage.objects;
drop policy if exists "auth delete product images" on storage.objects;

-- Public reads for catalog data (products, settings, zones)
-- Customers need to browse products and see delivery options
create policy "public read products" on products for select using (true);
create policy "public read settings" on settings for select using (true);
create policy "public read zones" on delivery_zones for select using (true);

-- Orders and order_items: no public access.
-- All order reads go through the backend server (service role key).
-- All order inserts go through the backend server (service role key).
-- Direct client access is intentionally prohibited.

-- Admin-only writes: only users with app_metadata.role = 'admin' (set via
-- Supabase dashboard or service-role API — not settable by users themselves)
-- can mutate catalog data and manage orders.
create policy "admin manage products"
  on products for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin manage settings"
  on settings for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin manage zones"
  on delivery_zones for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin manage orders"
  on orders for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admin manage order_items"
  on order_items for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Storage policy
create policy "public read product images"
  on storage.objects for select using (bucket_id = 'product-images');

create policy "admin upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "admin update product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "admin delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Seed: initial settings row
insert into settings (currency_code, currency_symbol, delivery_mode, flat_fee, min_order)
  values ('USD', '$', 'zone', 9.99, 0)
  on conflict do nothing;

-- Seed: sample zones
insert into delivery_zones (name, fee, is_active) values
  ('Bridgetown', 5.00, true),
  ('St. Michael', 7.50, true),
  ('Christ Church', 10.00, true),
  ('St. James', 12.50, true),
  ('St. Philip', 15.00, true)
  on conflict do nothing;

-- Seed: sample products
insert into products (name, category, price, rating, description, is_trending, is_active, stock_qty) values
  ('Hennessy VS', 'Whiskey', 42.99, 4.9, 'A timeless blend of eaux-de-vie from four natural crus of the Cognac region. Smooth and rich, with lively fruity notes and a slightly oaky finish.', true, true, 50),
  ('Don Julio 1942', 'Vodka', 169.99, 4.8, 'Handcrafted in tribute to the year Don Julio González began his tequila-making journey. Aged for a minimum of two and a half years, this is the spirit that started it all.', true, true, 20),
  ('Johnnie Walker Blue Label', 'Whiskey', 219.99, 4.9, 'Our pinnacle expression. One in every ten thousand casks has the rare quality to deliver the exceptional liquid that goes into Blue Label. Incomparably smooth.', true, true, 15),
  ('Plantation XO 20th Anniversary', 'Rum', 58.99, 4.7, 'A sophisticated blend of Barbados and Jamaican rums, aged in ex-Bourbon barrels then finished in French Cognac casks. Complex and refined.', false, true, 40),
  ('Belvedere Pure', 'Vodka', 39.99, 4.6, 'Made from 100% Polska rye and purified water from its own artesian wells. Four times distilled and never filtered — full flavored, ultra-smooth.', false, true, 60),
  ('Opus One 2019', 'Wine', 349.99, 5.0, 'A Napa Valley icon. The 2019 vintage delivers an opulent red with notes of black currant, dark cherry, and violet — structured and enduring.', true, true, 10)
  on conflict do nothing;

-- User Profiles (stores extra auth metadata for signed-in users)
-- Run this in your Supabase SQL Editor after enabling Auth
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  delivery_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security: users can only see/edit their own profile
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup via trigger
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── ADMIN SETUP INSTRUCTIONS ──────────────────────────────────────────────────
-- To grant a user admin access, run the following in the Supabase SQL Editor
-- (replace <user-uuid> with the actual user's UUID from auth.users):
--
--   UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
--   WHERE id = '<user-uuid>';
--
-- This sets app_metadata.role = 'admin' in the user's JWT.
-- app_metadata can ONLY be set by the service role — regular users cannot
-- modify it, making it safe to use for privilege escalation checks.
