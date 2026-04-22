-- =====================================================================
-- HD XQUISITE LIQUORS — Fulfillment Migration (Delivery / Pickup)
-- Adds fulfillment_method + pickup_location to orders, makes
-- delivery_address nullable for pickup orders. Run once in Supabase SQL Editor.
-- =====================================================================

-- 1. New columns
alter table public.orders
  add column if not exists fulfillment_method text not null default 'delivery',
  add column if not exists pickup_location    text;

-- 2. Constrain values
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_fulfillment_method_check'
  ) then
    alter table public.orders
      add constraint orders_fulfillment_method_check
      check (fulfillment_method in ('delivery', 'pickup'));
  end if;
end$$;

-- 3. Make delivery_address nullable so pickup orders can omit it.
--    (Existing rows are unaffected; they keep their address values.)
alter table public.orders
  alter column delivery_address drop not null;

-- 4. Helpful index for filtering by fulfillment method (analytics, dashboards)
create index if not exists orders_fulfillment_idx
  on public.orders (fulfillment_method, created_at desc);
