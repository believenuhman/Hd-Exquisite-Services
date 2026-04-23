-- HD Xquisite Liquors — Inventory & Per-Location Stock Migration
-- Apply AFTER: supabase-schema.sql, supabase-payment-migration.sql,
--              supabase-membership-coupon-migration.sql, supabase-admin-migration.sql
-- Safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Optional product size / variant column (e.g. "750ml", "1L")
-- ─────────────────────────────────────────────────────────────────────────────
alter table products
  add column if not exists size text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Pickup locations
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pickup_locations (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9_]+$'),
  name        text not null,
  address     text not null default '',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

insert into pickup_locations (slug, name, address) values
  ('bridgetown', 'Bridgetown', 'Barbershop, James Fort Building, Bridgetown'),
  ('st_george',  'St. George', 'St. George, Barbados')
  on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Per-location product stock
--    One row per (product, location). Quantity, low-stock threshold, updated_at.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists product_stock (
  id                   uuid primary key default gen_random_uuid(),
  product_id           uuid not null references products(id)         on delete cascade,
  location_id          uuid not null references pickup_locations(id) on delete cascade,
  quantity             integer not null default 0 check (quantity >= 0),
  low_stock_threshold  integer not null default 5 check (low_stock_threshold >= 0),
  updated_at           timestamptz not null default now(),
  unique (product_id, location_id)
);

create index if not exists idx_product_stock_product  on product_stock(product_id);
create index if not exists idx_product_stock_location on product_stock(location_id);

-- Auto-stamp updated_at on every UPDATE
create or replace function touch_product_stock_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_product_stock_updated_at on product_stock;
create trigger trg_product_stock_updated_at
  before update on product_stock
  for each row execute procedure touch_product_stock_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Seed: one row per (active product × location) at quantity = 0
--    Admins start by stocking products through the Inventory page.
-- ─────────────────────────────────────────────────────────────────────────────
insert into product_stock (product_id, location_id, quantity)
select p.id, l.id, 0
  from products p
  cross join pickup_locations l
  on conflict (product_id, location_id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Bind orders to a pickup location (FK)
-- ─────────────────────────────────────────────────────────────────────────────
alter table orders
  add column if not exists pickup_location_id uuid references pickup_locations(id);

create index if not exists idx_orders_pickup_location on orders(pickup_location_id);

-- Idempotency marker for post-payment stock deduction. Set to now() once
-- decrementStockForOrder() has successfully decremented every line item; the
-- server uses this to skip already-processed orders on capture retries.
alter table orders add column if not exists stock_decremented_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Atomic stock decrement helper.
--    Returns the new remaining quantity on success.
--    Returns -1 if there is insufficient stock (caller logs an oversell —
--    payment was already captured so we never roll back, but the merchant is
--    notified via server logs and the inventory page shows the unchanged qty).
--    Returns NULL if the row doesn't exist.
--    Race-safe: the conditional UPDATE takes a row-level lock and only fires
--    when the current quantity covers the requested qty.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function decrement_stock_for_pickup(
  p_product_id  uuid,
  p_location_id uuid,
  p_qty         integer
) returns integer
language plpgsql as $$
declare
  remaining integer;
  current_qty integer;
begin
  if p_qty is null or p_qty <= 0 then
    select quantity into remaining
      from product_stock
     where product_id  = p_product_id
       and location_id = p_location_id;
    return remaining;
  end if;

  -- Conditional update: only succeeds if there's enough stock RIGHT NOW.
  update product_stock
     set quantity = quantity - p_qty
   where product_id  = p_product_id
     and location_id = p_location_id
     and quantity   >= p_qty
   returning quantity into remaining;

  if remaining is not null then
    return remaining;
  end if;

  -- Either the row doesn't exist (NULL) or there wasn't enough stock (-1).
  select quantity into current_qty
    from product_stock
   where product_id  = p_product_id
     and location_id = p_location_id;
  if current_qty is null then
    return null;
  end if;
  return -1;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RLS
--    pickup_locations + product_stock — public READ (catalogue/availability).
--    Writes restricted to: super-admin (role='admin') OR
--                          location admin (role='location_admin' AND
--                          app_metadata.location matches the row's location slug).
-- ─────────────────────────────────────────────────────────────────────────────
alter table pickup_locations enable row level security;
alter table product_stock    enable row level security;

drop policy if exists "public read pickup_locations" on pickup_locations;
create policy "public read pickup_locations"
  on pickup_locations for select using (true);

drop policy if exists "admin manage pickup_locations" on pickup_locations;
create policy "admin manage pickup_locations"
  on pickup_locations for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "public read product_stock" on product_stock;
create policy "public read product_stock"
  on product_stock for select using (true);

drop policy if exists "admin manage product_stock" on product_stock;
create policy "admin manage product_stock"
  on product_stock for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "location_admin manage product_stock" on product_stock;
create policy "location_admin manage product_stock"
  on product_stock for all
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'location_admin'
    and exists (
      select 1 from pickup_locations l
       where l.id = product_stock.location_id
         and l.slug = (auth.jwt() -> 'app_metadata' ->> 'location')
    )
  );

-- Location admin sees only their own location's orders (super-admin policy
-- "admin manage orders" from supabase-admin-migration.sql still grants the
-- super-admin full access).
drop policy if exists "location_admin read orders" on orders;
create policy "location_admin read orders"
  on orders for select
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'location_admin'
    and exists (
      select 1 from pickup_locations l
       where l.id = orders.pickup_location_id
         and l.slug = (auth.jwt() -> 'app_metadata' ->> 'location')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Realtime: surface live stock changes to the admin Inventory page.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'product_stock'
  ) then
    execute 'alter publication supabase_realtime add table public.product_stock';
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'pickup_locations'
  ) then
    execute 'alter publication supabase_realtime add table public.pickup_locations';
  end if;
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- HOW TO ASSIGN A USER TO A LOCATION (run in Supabase SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Super admin (sees + manages everything across both locations):
--   update auth.users
--      set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
--                              || '{"role":"admin"}'::jsonb
--    where email = 'owner@example.com';
--
-- Bridgetown location admin (sees + manages Bridgetown only):
--   update auth.users
--      set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
--                              || '{"role":"location_admin","location":"bridgetown"}'::jsonb
--    where email = 'bridgetown.manager@example.com';
--
-- St. George location admin (sees + manages St. George only):
--   update auth.users
--      set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
--                              || '{"role":"location_admin","location":"st_george"}'::jsonb
--    where email = 'stgeorge.manager@example.com';
--
-- After changing roles, the user must sign out and back in for the new JWT
-- claims to take effect.
