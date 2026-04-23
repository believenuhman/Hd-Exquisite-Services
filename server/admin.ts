// Admin dashboard data layer. Every function here uses the service-role
// Supabase client (bypasses RLS) but is ONLY ever called from routes guarded
// by `requireAdmin(req)` in server/routes.ts — so authorization is enforced
// at the route layer, never the data layer.
import { getSupabaseAdmin } from "./payment";

export type AdminOrderStatus =
  | "received" | "confirmed" | "packing" | "out_for_delivery"
  | "ready_for_pickup" | "delivered" | "refused";

export const ADMIN_ORDER_STATUSES: AdminOrderStatus[] = [
  "received", "confirmed", "packing",
  "out_for_delivery", "ready_for_pickup",
  "delivered", "refused",
];

export type ListOrdersFilters = {
  status?:      string | null;
  fulfillment?: string | null;   // 'delivery' | 'pickup'
  payment?:     string | null;   // 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
  q?:           string | null;   // search by name / phone / order id
  date?:        string | null;   // YYYY-MM-DD (filter by created_at on that local day, UTC-relative)
  limit?:       number;
  offset?:      number;
};

const BASE_COLS =
  "id,status,customer_name,customer_phone,delivery_address,delivery_notes," +
  "subtotal,delivery_fee,total,currency_code,currency_symbol,created_at," +
  "payment_method,payment_status,payment_reference,paid_at,zone_id";
const EXTENDED_COLS = BASE_COLS + ",fulfillment_method,pickup_location";

async function selectCols(): Promise<string> {
  // Reuse the existing fulfillment-column probe from payment.ts so older DBs
  // (which haven't run supabase-fulfillment-migration.sql yet) still load.
  const mod = await import("./payment.js");
  return (await mod.fulfillmentColumnsExist()) ? EXTENDED_COLS : BASE_COLS;
}

export async function listOrders(f: ListOrdersFilters): Promise<{ orders: unknown[]; total: number }> {
  const supabase = getSupabaseAdmin();
  const cols = await selectCols();

  const limit  = Math.min(Math.max(f.limit  ?? 50, 1), 200);
  const offset = Math.max(f.offset ?? 0, 0);

  let query = supabase.from("orders").select(cols, { count: "exact" });

  if (f.status      && f.status      !== "all") query = query.eq("status", f.status);
  if (f.payment     && f.payment     !== "all") query = query.eq("payment_status", f.payment);
  if (f.fulfillment && f.fulfillment !== "all") query = query.eq("fulfillment_method", f.fulfillment);

  if (f.date) {
    // Treat the date as a UTC day window. Good enough for the admin's
    // "today" filter; switch to a tz-aware solution if needed later.
    const start = `${f.date}T00:00:00.000Z`;
    const endDate = new Date(`${f.date}T00:00:00.000Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const end = endDate.toISOString();
    query = query.gte("created_at", start).lt("created_at", end);
  }

  const q = (f.q ?? "").trim();
  if (q) {
    // UUIDs are queryable by full match; partial UUID search is impossible
    // in the orders table without casting, so we OR on name/phone and on
    // the full id when the search input looks like a UUID.
    const isUuid = /^[0-9a-f-]{36}$/i.test(q);
    const escaped = q.replace(/[%,]/g, " ");
    const filters = [
      `customer_name.ilike.%${escaped}%`,
      `customer_phone.ilike.%${escaped}%`,
    ];
    if (isUuid) filters.push(`id.eq.${q}`);
    query = query.or(filters.join(","));
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { orders: data ?? [], total: count ?? 0 };
}

export async function getOrderDetail(id: string): Promise<{ order: unknown; items: unknown[] } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = getSupabaseAdmin();
  const cols = await selectCols();
  const [orderRes, itemsRes] = await Promise.all([
    supabase.from("orders").select(cols + ",coupon_code,coupon_discount,membership_tier,membership_discount,refusal_reason").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("id,product_id,name,qty,unit_price").eq("order_id", id),
  ]);
  if (orderRes.error) {
    // The membership/coupon snapshot columns are only present after the
    // membership migration; retry without them so the dashboard still loads
    // on databases that haven't applied it yet.
    const fallback = await supabase.from("orders").select(cols + ",refusal_reason").eq("id", id).maybeSingle();
    if (fallback.error) throw fallback.error;
    if (!fallback.data) return null;
    return { order: fallback.data, items: itemsRes.data ?? [] };
  }
  if (!orderRes.data) return null;
  return { order: orderRes.data, items: itemsRes.data ?? [] };
}

export async function updateOrderStatus(id: string, status: AdminOrderStatus): Promise<unknown> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("id,status")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updatePaymentStatus(id: string, payment_status: string): Promise<unknown> {
  const supabase = getSupabaseAdmin();
  const patch: Record<string, unknown> = { payment_status };
  // When an admin manually marks an order as paid we also stamp paid_at so
  // downstream reporting (today's revenue, etc) treats it consistently with
  // gateway-captured payments.
  if (payment_status === "paid") patch.paid_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("id,payment_status,paid_at")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function todayStats(): Promise<{
  total_orders:     number;
  pending_orders:   number;
  completed_orders: number;
  total_sales:      number;
  paid_sales:       number;
  currency_symbol:  string;
}> {
  const supabase = getSupabaseAdmin();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const { data, error } = await supabase
    .from("orders")
    .select("status,payment_status,total,currency_symbol")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());
  if (error) throw error;

  const rows = (data ?? []) as Array<{ status: string; payment_status: string; total: number; currency_symbol: string }>;
  let total_orders = 0, pending_orders = 0, completed_orders = 0;
  let total_sales = 0, paid_sales = 0;
  let currency_symbol = "$";
  for (const r of rows) {
    total_orders += 1;
    total_sales  += Number(r.total) || 0;
    if (r.currency_symbol) currency_symbol = r.currency_symbol;
    if (r.status === "delivered") completed_orders += 1;
    else if (r.status !== "refused") pending_orders += 1;
    if (r.payment_status === "paid") paid_sales += Number(r.total) || 0;
  }
  return { total_orders, pending_orders, completed_orders, total_sales, paid_sales, currency_symbol };
}
