-- HD XQUISITE LIQUORS — Payment columns migration
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method     text NOT NULL DEFAULT 'cash_on_delivery',
  ADD COLUMN IF NOT EXISTS payment_status     text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference  text,
  ADD COLUMN IF NOT EXISTS gateway_name       text,
  ADD COLUMN IF NOT EXISTS paid_at            timestamptz,
  ADD COLUMN IF NOT EXISTS paypal_order_id    text;

-- Optional: add a check constraint for known values
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cash_on_delivery', 'online_card'));

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded'));

-- Bind PayPal order IDs uniquely to local orders so they can't be replayed
CREATE UNIQUE INDEX IF NOT EXISTS orders_paypal_order_id_unique
  ON orders (paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

-- Backfill existing cash orders
UPDATE orders
  SET payment_method = 'cash_on_delivery',
      payment_status = 'pending'
  WHERE payment_method IS NULL OR payment_status IS NULL;
