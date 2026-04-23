-- HD XQUISITE LIQUORS — Admin Dashboard migration
-- Run in: Supabase → SQL Editor → New Query
--
-- 1. Expands the orders.status check constraint with the two new admin
--    statuses (`confirmed`, `ready_for_pickup`) while keeping the legacy
--    customer-facing values intact so the customer order tracking page
--    continues to render correctly without any changes.
--
-- 2. Adds the orders + order_items tables to the supabase_realtime
--    publication so the admin dashboard receives live INSERT / UPDATE
--    events as customers place orders.
--
-- Admin authorization itself is enforced two ways:
--   * Server-side: every /api/admin/* endpoint calls requireAdmin() which
--     verifies the Supabase JWT and checks app_metadata.role = 'admin'.
--   * Database-level RLS: the existing "admin manage orders" /
--     "admin manage order_items" policies in supabase-schema.sql gate
--     direct realtime SELECTs to admin JWTs only.
--
-- TO PROMOTE A USER TO ADMIN (run once per admin, in SQL editor):
--   update auth.users
--      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--                             || '{"role":"admin"}'::jsonb
--    where email = 'admin@example.com';
-- Important: app_metadata is NOT user-editable, which is what makes it
-- safe to gate authorization on. Never use user_metadata for roles.

-- ── Expand orders.status check constraint ────────────────────────────────────
alter table orders
  drop constraint if exists orders_status_check;

alter table orders
  add constraint orders_status_check
  check (status in (
    -- Legacy customer-tracking values (kept for backward compatibility)
    'received', 'packing', 'out_for_delivery', 'delivered', 'refused',
    -- New admin-dashboard values
    'confirmed', 'ready_for_pickup'
  ));

-- ── Realtime publication ─────────────────────────────────────────────────────
-- Safely add tables to the supabase_realtime publication. The DO block
-- swallows the "relation already a member" error so this migration is
-- idempotent on databases where realtime is already enabled.
do $$
begin
  begin
    alter publication supabase_realtime add table orders;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table order_items;
  exception when duplicate_object then null;
  end;
end $$;
