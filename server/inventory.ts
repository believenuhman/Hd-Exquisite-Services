// Inventory & per-location stock service.
// Routes call into this module; authorization is enforced at the route layer
// via getAdminContext() in server/auth.ts. RLS in Supabase is the second line
// of defence (super admin = full; location_admin = own-location only).
//
// Designed to degrade gracefully if supabase-inventory-migration.sql has not
// been applied yet — every Supabase access is guarded by inventoryTablesExist().

import { getSupabaseAdmin } from "./payment";

// ─── Cached schema probes ────────────────────────────────────────────────────
let inventoryTablesExistCache: boolean | null = null;
export async function inventoryTablesExist(): Promise<boolean> {
  if (inventoryTablesExistCache !== null) return inventoryTablesExistCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("pickup_locations").select("id").limit(1);
    inventoryTablesExistCache = !error;
    if (error) console.warn("[inventory] pickup_locations table missing — apply supabase-inventory-migration.sql.");
  } catch { inventoryTablesExistCache = false; }
  return inventoryTablesExistCache;
}

let productSizeColCache: boolean | null = null;
async function productHasSize(): Promise<boolean> {
  if (productSizeColCache !== null) return productSizeColCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("products").select("size").limit(1);
    productSizeColCache = !error;
  } catch { productSizeColCache = false; }
  return productSizeColCache;
}

let orderPickupLocationColCache: boolean | null = null;
export async function orderPickupLocationColExists(): Promise<boolean> {
  if (orderPickupLocationColCache !== null) return orderPickupLocationColCache;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("orders").select("pickup_location_id").limit(1);
    orderPickupLocationColCache = !error;
  } catch { orderPickupLocationColCache = false; }
  return orderPickupLocationColCache;
}

// ─── Locations ───────────────────────────────────────────────────────────────
export type Location = {
  id: string; slug: string; name: string; address: string; is_active: boolean;
};

export async function listLocations(activeOnly = false): Promise<Location[]> {
  if (!(await inventoryTablesExist())) return [];
  const supabase = getSupabaseAdmin();
  let q = supabase.from("pickup_locations").select("id,slug,name,address,is_active").order("name");
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Location[];
}

export async function getLocationBySlug(slug: string): Promise<Location | null> {
  if (!(await inventoryTablesExist())) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("pickup_locations")
    .select("id,slug,name,address,is_active").eq("slug", slug).maybeSingle();
  if (error) return null;
  return (data as Location) ?? null;
}

export async function getLocationById(id: string): Promise<Location | null> {
  if (!(await inventoryTablesExist())) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("pickup_locations")
    .select("id,slug,name,address,is_active").eq("id", id).maybeSingle();
  if (error) return null;
  return (data as Location) ?? null;
}

// ─── Inventory listing ───────────────────────────────────────────────────────
export type InventoryRow = {
  product_id:        string;
  product_name:      string;
  product_image:     string | null;
  product_category:  string | null;
  product_size:      string | null;
  product_price:     number;
  location_id:       string;
  location_slug:     string;
  location_name:     string;
  quantity:          number;
  low_stock_threshold: number;
  status:            "in_stock" | "low" | "out";
  updated_at:        string | null;
};

export async function listInventory(opts: {
  locationSlug?: string | null;   // restrict to this location (location_admin scope)
  q?:            string | null;   // product name search
  category?:     string | null;
  lowStockOnly?: boolean;
}): Promise<InventoryRow[]> {
  if (!(await inventoryTablesExist())) return [];
  const supabase = getSupabaseAdmin();

  let restrictLocationIds: string[] | null = null;
  if (opts.locationSlug) {
    const loc = await getLocationBySlug(opts.locationSlug);
    if (!loc) return [];
    restrictLocationIds = [loc.id];
  }

  let stockQuery = supabase.from("product_stock")
    .select("product_id,location_id,quantity,low_stock_threshold,updated_at");
  if (restrictLocationIds) stockQuery = stockQuery.in("location_id", restrictLocationIds);
  const { data: stock, error: stockErr } = await stockQuery;
  if (stockErr) throw stockErr;

  const productIds = [...new Set((stock ?? []).map((r) => (r as { product_id: string }).product_id))];
  const locIds     = [...new Set((stock ?? []).map((r) => (r as { location_id: string }).location_id))];
  const productCols = (await productHasSize())
    ? "id,name,image_url,category,price,size,is_active"
    : "id,name,image_url,category,price,is_active";

  const [productsRes, locsRes] = await Promise.all([
    productIds.length
      ? supabase.from("products").select(productCols).in("id", productIds)
      : Promise.resolve({ data: [] as unknown[] }),
    locIds.length
      ? supabase.from("pickup_locations").select("id,slug,name").in("id", locIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  type Prod = { id: string; name: string; image_url: string | null; category: string | null; price: number; size?: string | null; is_active: boolean };
  type Loc  = { id: string; slug: string; name: string };
  const productById = new Map<string, Prod>(((productsRes.data ?? []) as Prod[]).map((p) => [p.id, p]));
  const locById     = new Map<string, Loc>(((locsRes.data ?? []) as Loc[]).map((l) => [l.id, l]));

  const qLower = (opts.q ?? "").trim().toLowerCase();
  const cat    = (opts.category ?? "").trim().toLowerCase();

  const rows: InventoryRow[] = [];
  for (const r of (stock ?? []) as Array<{ product_id: string; location_id: string; quantity: number; low_stock_threshold: number; updated_at: string | null }>) {
    const p = productById.get(r.product_id);
    const l = locById.get(r.location_id);
    if (!p || !l) continue;
    if (p.is_active === false) continue;
    if (cat && (p.category ?? "").toLowerCase() !== cat) continue;
    if (qLower && !p.name.toLowerCase().includes(qLower)) continue;
    const qty = Number(r.quantity ?? 0);
    const thr = Number(r.low_stock_threshold ?? 0);
    const status: InventoryRow["status"] = qty <= 0 ? "out" : (qty <= thr ? "low" : "in_stock");
    if (opts.lowStockOnly && status === "in_stock") continue;
    rows.push({
      product_id:           p.id,
      product_name:         p.name,
      product_image:        p.image_url,
      product_category:     p.category,
      product_size:         p.size ?? null,
      product_price:        Number(p.price ?? 0),
      location_id:          l.id,
      location_slug:        l.slug,
      location_name:        l.name,
      quantity:             qty,
      low_stock_threshold:  thr,
      status,
      updated_at:           r.updated_at,
    });
  }
  rows.sort((a, b) =>
    a.product_name.localeCompare(b.product_name)
    || a.location_name.localeCompare(b.location_name),
  );
  return rows;
}

// ─── Update a single (product, location) stock row ───────────────────────────
export async function upsertStock(opts: {
  productId: string;
  locationId: string;
  quantity?: number;
  lowStockThreshold?: number;
}): Promise<InventoryRow | null> {
  if (!(await inventoryTablesExist())) {
    throw new Error("Inventory not enabled. Apply supabase-inventory-migration.sql.");
  }
  if (!/^[0-9a-f-]{36}$/i.test(opts.productId))  throw new Error("Invalid productId.");
  if (!/^[0-9a-f-]{36}$/i.test(opts.locationId)) throw new Error("Invalid locationId.");

  const patch: Record<string, unknown> = {
    product_id:  opts.productId,
    location_id: opts.locationId,
  };
  if (typeof opts.quantity === "number" && Number.isFinite(opts.quantity)) {
    patch.quantity = Math.max(0, Math.floor(opts.quantity));
  }
  if (typeof opts.lowStockThreshold === "number" && Number.isFinite(opts.lowStockThreshold)) {
    patch.low_stock_threshold = Math.max(0, Math.floor(opts.lowStockThreshold));
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("product_stock")
    .upsert(patch, { onConflict: "product_id,location_id" });
  if (error) throw error;

  // Re-read the row through listInventory for a consistent shape (status, etc).
  const all = await listInventory({});
  return all.find((r) => r.product_id === opts.productId && r.location_id === opts.locationId) ?? null;
}

// ─── Per-location stock check used by createServerOrder for pickup orders ────
export async function checkPickupStock(
  locationId: string,
  items: { product_id: string; quantity: number }[],
): Promise<string | null> {
  if (!(await inventoryTablesExist())) {
    return "Per-location inventory is not enabled. Please apply supabase-inventory-migration.sql.";
  }
  const supabase = getSupabaseAdmin();
  // Aggregate quantities by product_id BEFORE comparing against stock — a
  // crafted cart with duplicate line items for the same product would
  // otherwise pass each line independently and bypass the stock check.
  const wanted = new Map<string, number>();
  for (const it of items) {
    const q = Number(it.quantity ?? 0);
    if (!it.product_id || !Number.isFinite(q) || q <= 0) continue;
    wanted.set(it.product_id, (wanted.get(it.product_id) ?? 0) + q);
  }
  const ids = [...wanted.keys()];
  if (ids.length === 0) return null;
  const [stockRes, prodRes] = await Promise.all([
    supabase.from("product_stock")
      .select("product_id,quantity")
      .eq("location_id", locationId)
      .in("product_id", ids),
    supabase.from("products").select("id,name").in("id", ids),
  ]);
  const stockMap = new Map<string, number>(
    ((stockRes.data ?? []) as Array<{ product_id: string; quantity: number }>)
      .map((s) => [s.product_id, Number(s.quantity ?? 0)]),
  );
  const nameMap  = new Map<string, string>(
    ((prodRes.data ?? []) as Array<{ id: string; name: string }>)
      .map((p) => [p.id, p.name]),
  );
  for (const [productId, want] of wanted) {
    const have = stockMap.get(productId) ?? 0;
    const name = nameMap.get(productId) ?? "Item";
    if (have <= 0) {
      return `"${name}" is out of stock at the selected pickup location.`;
    }
    if (want > have) {
      return `Only ${have} of "${name}" available at the selected pickup location; you requested ${want}.`;
    }
  }
  return null;
}

// ─── Decrement stock for a paid pickup order ─────────────────────────────────
// Called from /api/paypal/capture-order AFTER updateOrderPaid. Designed to be:
//   • idempotent  — short-circuits if `orders.stock_decremented_at` is set
//   • safe to retry — capture handler can re-call this if a previous decrement
//                     failed, until every line item is applied
//   • race-safe   — uses the conditional `decrement_stock_for_pickup` RPC,
//                   which only succeeds when current qty covers the request.
//
// On insufficient stock the RPC returns -1; we DO NOT roll the payment back
// (PayPal has already captured), but we log a loud OVERSELL warning so the
// merchant can reconcile. Such an order also intentionally leaves
// `stock_decremented_at` NULL so it stays visible to retry tooling.
export async function decrementStockForOrder(orderId: string): Promise<void> {
  if (!(await inventoryTablesExist())) return;
  if (!(await orderPickupLocationColExists())) return;
  const supabase = getSupabaseAdmin();

  // Aggregate line items by product_id so duplicate lines in the same order
  // don't double-decrement (and so a single failed RPC blocks the whole prod).
  const { data: orderRow } = await supabase
    .from("orders")
    .select("id,pickup_location_id,fulfillment_method,stock_decremented_at")
    .eq("id", orderId)
    .maybeSingle();
  const order = orderRow as {
    id: string;
    pickup_location_id: string | null;
    fulfillment_method: string | null;
    stock_decremented_at: string | null;
  } | null;
  if (!order) return;
  if (order.fulfillment_method !== "pickup" || !order.pickup_location_id) return;
  if (order.stock_decremented_at) return; // already applied — idempotent retry

  const { data: items } = await supabase
    .from("order_items").select("product_id,qty").eq("order_id", orderId);

  const totals = new Map<string, number>();
  for (const it of (items ?? []) as Array<{ product_id: string | null; qty: number | null }>) {
    if (!it.product_id || !it.qty || it.qty <= 0) continue;
    totals.set(it.product_id, (totals.get(it.product_id) ?? 0) + Number(it.qty));
  }

  let allApplied = true;
  for (const [productId, qty] of totals) {
    const { data, error } = await supabase.rpc("decrement_stock_for_pickup", {
      p_product_id:  productId,
      p_location_id: order.pickup_location_id,
      p_qty:         qty,
    });
    if (error) {
      console.error(`[inventory] decrement RPC error order=${orderId} product=${productId}:`, error);
      allApplied = false;
      continue;
    }
    const remaining = (data as number | null) ?? null;
    if (remaining === -1) {
      console.error(`[inventory] OVERSELL on order=${orderId} product=${productId} qty=${qty} — insufficient stock at location ${order.pickup_location_id}. Manual reconciliation required.`);
      allApplied = false;
    } else if (remaining === null) {
      // Stock row missing — treat as oversell-equivalent for the merchant's attention.
      console.error(`[inventory] decrement skipped — no product_stock row for order=${orderId} product=${productId} location=${order.pickup_location_id}.`);
      allApplied = false;
    }
  }

  if (allApplied) {
    await supabase.from("orders")
      .update({ stock_decremented_at: new Date().toISOString() })
      .eq("id", orderId);
  }
}

// ─── Public availability map { product_id: quantity } for a location ────────
export async function locationAvailability(slugOrId: string): Promise<Record<string, number>> {
  if (!(await inventoryTablesExist())) return {};
  const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
  const loc = isUuid ? await getLocationById(slugOrId) : await getLocationBySlug(slugOrId);
  if (!loc) return {};
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("product_stock")
    .select("product_id,quantity")
    .eq("location_id", loc.id);
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as Array<{ product_id: string; quantity: number }>) {
    out[r.product_id] = Number(r.quantity ?? 0);
  }
  return out;
}

// ─── List of distinct product categories (for the inventory filter dropdown).
export async function listCategories(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("products").select("category").not("category", "is", null);
  const set = new Set<string>();
  for (const r of (data ?? []) as Array<{ category: string | null }>) {
    if (r.category && r.category.trim()) set.add(r.category.trim());
  }
  return [...set].sort();
}
