-- HD XQUISITE LIQUORS — Payment columns migration
-- REQUIRED for existing databases. Fresh installs using supabase-schema.sql
-- already include these columns. Run in: Supabase → SQL Editor → New Query.
--
-- SECURITY NOTE: This migration must be applied before any online (PayPal)
-- payments go live. The paypal_order_id unique constraint is critical —
-- it prevents one approved PayPal token from being replayed against multiple
-- local orders, and ensures bindPayPalOrderId() is enforced at the DB layer
-- even if application-level checks are bypassed.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method     text NOT NULL DEFAULT 'cash_on_delivery',
  ADD COLUMN IF NOT EXISTS payment_status     text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference  text,
  ADD COLUMN IF NOT EXISTS gateway_name       text,
  ADD COLUMN IF NOT EXISTS paid_at            timestamptz,
  ADD COLUMN IF NOT EXISTS paypal_order_id    text;

-- Enforce known values for payment_method
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cash_on_delivery', 'online_card'));

-- Enforce known values for payment_status
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded'));

-- SECURITY: Enforce that each PayPal token can only be bound to one local order.
-- This prevents replay attacks where an approved PayPal order token is submitted
-- against a different (more expensive) local order.
-- IF NOT EXISTS is safe to run on fresh DBs that already have the unique column constraint.
CREATE UNIQUE INDEX IF NOT EXISTS orders_paypal_order_id_unique
  ON orders (paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

-- Backfill existing cash orders that predate these columns
UPDATE orders
  SET payment_method = 'cash_on_delivery',
      payment_status = 'pending'
  WHERE payment_method IS NULL OR payment_status IS NULL;
