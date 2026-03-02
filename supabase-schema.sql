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
  created_at timestamptz not null default now()
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

-- Public reads
create policy "public read products" on products for select using (true);
create policy "public read settings" on settings for select using (true);
create policy "public read zones" on delivery_zones for select using (true);

-- Public writes for orders (customers can create orders)
create policy "public insert orders" on orders for insert with check (true);
create policy "public insert order_items" on order_items for insert with check (true);
create policy "public read orders" on orders for select using (true);
create policy "public read order_items" on order_items for select using (true);

-- Admin writes (authenticated users can do everything)
create policy "auth manage products" on products for all using (auth.role() = 'authenticated');
create policy "auth manage settings" on settings for all using (auth.role() = 'authenticated');
create policy "auth manage zones" on delivery_zones for all using (auth.role() = 'authenticated');
create policy "auth manage orders" on orders for all using (auth.role() = 'authenticated');
create policy "auth manage order_items" on order_items for all using (auth.role() = 'authenticated');

-- Storage policy
create policy "public read product images"
  on storage.objects for select using (bucket_id = 'product-images');
create policy "auth upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "auth update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "auth delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

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
