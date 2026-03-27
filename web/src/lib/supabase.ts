import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "hd-xquisite-mobile-auth",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  description: string;
  image_url: string | null;
  is_trending: boolean;
  is_active: boolean;
  stock_qty: number;
  created_at: string;
};

export type AppSettings = {
  id: string;
  currency_code: string;
  currency_symbol: string;
  delivery_mode: string;
  flat_fee: number;
  min_order: number;
  updated_at: string;
};

export type DeliveryZone = {
  id: string;
  name: string;
  fee: number;
  is_active: boolean;
};

export type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_notes: string | null;
  age_confirmed: boolean;
  status: "received" | "packing" | "out_for_delivery" | "delivered" | "refused";
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency_code: string;
  currency_symbol: string;
  zone_id: string | null;
  refusal_reason: string | null;
  created_at: string;
  payment_method: "cash_on_delivery" | "online_card" | null;
  payment_status: "pending" | "paid" | "failed" | "refunded" | null;
  payment_reference: string | null;
  gateway_name: string | null;
  paid_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  name: string;
  qty: number;
  unit_price: number;
};

export const formatPrice = (amount: number, symbol: string) =>
  `${symbol}${amount.toFixed(2)}`;
