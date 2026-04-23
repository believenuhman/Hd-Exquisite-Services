import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoSearch, IoRefresh, IoLogOutOutline, IoClose, IoCheckmarkCircle,
  IoVolumeHigh, IoVolumeMute, IoCall, IoLocationSharp, IoTime,
  IoCard, IoCash, IoFilter,
} from "react-icons/io5";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// Status definitions live here so labels + colors stay consistent across the
// table, the badge, and the status-change dropdown in the detail drawer.
const STATUSES = [
  { value: "received",         label: "New",              dot: "#E4A12B", bg: "rgba(228,161,43,0.14)", text: "#E4A12B" },
  { value: "confirmed",        label: "Confirmed",        dot: "#7C5CFF", bg: "rgba(124,92,255,0.14)", text: "#9B83FF" },
  { value: "packing",          label: "Preparing",        dot: "#C91E8C", bg: "rgba(201,30,140,0.14)", text: "#E866B8" },
  { value: "out_for_delivery", label: "Out for Delivery", dot: "#4A9EFF", bg: "rgba(74,158,255,0.14)", text: "#4A9EFF" },
  { value: "ready_for_pickup", label: "Ready for Pickup", dot: "#00C2A8", bg: "rgba(0,194,168,0.14)",  text: "#00C2A8" },
  { value: "delivered",        label: "Completed",        dot: "#28A745", bg: "rgba(40,167,69,0.14)",  text: "#36C153" },
  { value: "refused",          label: "Cancelled",        dot: "#DC3545", bg: "rgba(220,53,69,0.14)",  text: "#FF6B7A" },
] as const;

type StatusValue = typeof STATUSES[number]["value"];

const statusInfo = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];

const PAYMENT_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: "Pending",   bg: "rgba(228,161,43,0.14)", text: "#E4A12B" },
  paid:      { label: "Paid",      bg: "rgba(40,167,69,0.14)",  text: "#36C153" },
  failed:    { label: "Failed",    bg: "rgba(220,53,69,0.14)",  text: "#FF6B7A" },
  cancelled: { label: "Cancelled", bg: "rgba(120,120,130,0.18)", text: "#A8A8B0" },
  refunded:  { label: "Refunded",  bg: "rgba(124,92,255,0.14)", text: "#9B83FF" },
};

type AdminOrder = {
  id: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string | null;
  delivery_notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency_code: string;
  currency_symbol: string;
  created_at: string;
  payment_method: string;
  payment_status: string;
  payment_reference: string | null;
  paid_at: string | null;
  fulfillment_method?: string | null;
  pickup_location?: string | null;
};

type OrderItem = {
  id: string;
  product_id: string | null;
  name: string;
  qty: number;
  unit_price: number;
};

const SOUND_KEY = "hd_admin_sound_enabled";

// 0.6s soft chime synthesized via WebAudio so we don't ship an audio file.
function playChime() {
  try {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.18);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.6);
  } catch { /* silent */ }
}

function formatMoney(v: number, sym = "$") {
  return `${sym}${(Number(v) || 0).toFixed(2)}`;
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch { return iso; }
}

function StatusBadge({ status }: { status: string }) {
  const info = statusInfo(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 999,
      background: info.bg, color: info.text,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: info.dot }} />
      {info.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const b = PAYMENT_BADGES[status] ?? PAYMENT_BADGES.pending;
  return (
    <span style={{
      display: "inline-block", padding: "3px 8px", borderRadius: 6,
      background: b.bg, color: b.text, fontSize: 10, fontWeight: 600,
      textTransform: "uppercase", letterSpacing: 0.4,
    }}>
      {b.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail drawer
// ─────────────────────────────────────────────────────────────────────────────
function OrderDetailDrawer({
  orderId, onClose, onUpdated,
}: { orderId: string | null; onClose: () => void; onUpdated: () => void }) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) { setOrder(null); setItems([]); return; }
    setLoading(true); setError(null);
    authedFetch(`/api/admin/orders/${orderId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load");
        setOrder(d.order); setItems(d.items ?? []);
      })
      .catch((e) => setError(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [orderId]);

  const updateStatus = useCallback(async (status: StatusValue) => {
    if (!order) return;
    setBusy(true); setError(null);
    try {
      const r = await authedFetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to update");
      setOrder({ ...order, status });
      onUpdated();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to update");
    } finally { setBusy(false); }
  }, [order, onUpdated]);

  const updatePayment = useCallback(async (payment_status: string) => {
    if (!order) return;
    setBusy(true); setError(null);
    try {
      const r = await authedFetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to update");
      setOrder({ ...order, payment_status });
      onUpdated();
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to update");
    } finally { setBusy(false); }
  }, [order, onUpdated]);

  if (!orderId) return null;

  const sym = order?.currency_symbol ?? "$";
  const isPickup = order?.fulfillment_method === "pickup";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(5,5,8,0.72)", zIndex: 1000,
        display: "flex", justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)", height: "100%", background: "#0F0F14",
          borderLeft: "1px solid rgba(228,161,43,0.18)", overflowY: "auto",
          color: "#fff",
        }}
      >
        <div style={{
          position: "sticky", top: 0, background: "#0F0F14", zIndex: 2,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "#8C8C95", letterSpacing: 0.6, textTransform: "uppercase" }}>Order</div>
            <div style={{ fontFamily: "monospace", fontSize: 13, marginTop: 2 }}>#{orderId.slice(0, 8)}</div>
          </div>
          <button onClick={onClose} style={{ color: "#fff", background: "transparent", border: "none", padding: 6, cursor: "pointer" }} aria-label="Close">
            <IoClose size={22} />
          </button>
        </div>

        {loading && <div style={{ padding: 40, textAlign: "center", color: "#8C8C95" }}>Loading…</div>}
        {error   && <div style={{ padding: 20, color: "#FF6B7A" }}>{error}</div>}

        {order && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Status + payment row */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <StatusBadge status={order.status} />
              <PaymentBadge status={order.payment_status} />
              <span style={{
                padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                background: "rgba(255,255,255,0.06)", color: "#A8A8B0",
                textTransform: "uppercase", letterSpacing: 0.4,
              }}>
                {isPickup ? "Pickup" : "Delivery"}
              </span>
            </div>

            {/* Customer */}
            <Section title="Customer">
              <div style={{ fontSize: 16, fontWeight: 600 }}>{order.customer_name}</div>
              <a href={`tel:${order.customer_phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4, color: "#E4A12B", fontSize: 14 }}>
                <IoCall size={14} /> {order.customer_phone}
              </a>
            </Section>

            {/* Fulfillment */}
            <Section title={isPickup ? "Pickup Location" : "Delivery Address"}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "#D8D8DE" }}>
                <IoLocationSharp size={16} style={{ marginTop: 2, color: "#8C8C95", flexShrink: 0 }} />
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                  {isPickup ? (order.pickup_location ?? "—") : (order.delivery_address ?? "—")}
                </div>
              </div>
              {order.delivery_notes && (
                <div style={{ marginTop: 8, padding: 10, background: "rgba(228,161,43,0.06)", borderRadius: 8, fontSize: 13, color: "#D8D8DE" }}>
                  <div style={{ fontSize: 10, color: "#8C8C95", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Notes</div>
                  {order.delivery_notes}
                </div>
              )}
            </Section>

            {/* Items */}
            <Section title={`Items (${items.length})`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((it) => (
                  <div key={it.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{it.name}</div>
                      <div style={{ fontSize: 12, color: "#8C8C95", marginTop: 2 }}>Qty {it.qty} × {formatMoney(it.unit_price, sym)}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{formatMoney(it.qty * Number(it.unit_price), sym)}</div>
                  </div>
                ))}
                {items.length === 0 && <div style={{ fontSize: 13, color: "#8C8C95" }}>No items recorded.</div>}
              </div>
            </Section>

            {/* Totals */}
            <Section title="Totals">
              <Row label="Subtotal"     value={formatMoney(order.subtotal, sym)} />
              <Row label="Delivery Fee" value={formatMoney(order.delivery_fee, sym)} />
              <Row label="Total"        value={formatMoney(order.total, sym)} bold />
            </Section>

            {/* Payment */}
            <Section title="Payment">
              <Row label="Method" value={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {order.payment_method === "online_card" ? <IoCard size={14} /> : <IoCash size={14} />}
                  {order.payment_method === "online_card" ? "Online (PayPal)" : "Cash on Delivery"}
                </span>
              } />
              <Row label="Status" value={<PaymentBadge status={order.payment_status} />} />
              {order.paid_at && <Row label="Paid at" value={formatDateTime(order.paid_at)} />}
              {order.payment_reference && (
                <Row label="Reference" value={<span style={{ fontFamily: "monospace", fontSize: 12 }}>{order.payment_reference}</span>} />
              )}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {order.payment_status !== "paid" && (
                  <button disabled={busy} onClick={() => updatePayment("paid")} style={smallBtn("#28A745")}>
                    <IoCheckmarkCircle size={14} /> Mark Paid
                  </button>
                )}
                {order.payment_status === "paid" && (
                  <button disabled={busy} onClick={() => updatePayment("pending")} style={smallBtn("#8C8C95")}>
                    Mark Unpaid
                  </button>
                )}
              </div>
            </Section>

            {/* Status change */}
            <Section title="Update Status">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                {STATUSES.map((s) => {
                  const active = order.status === s.value;
                  return (
                    <button
                      key={s.value}
                      disabled={busy || active}
                      onClick={() => updateStatus(s.value)}
                      style={{
                        padding: "10px 12px", borderRadius: 8, border: `1px solid ${active ? s.dot : "rgba(255,255,255,0.08)"}`,
                        background: active ? s.bg : "rgba(255,255,255,0.03)", color: active ? s.text : "#D8D8DE",
                        fontSize: 13, fontWeight: 500, cursor: active ? "default" : "pointer",
                        display: "flex", alignItems: "center", gap: 8, opacity: busy && !active ? 0.5 : 1,
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot }} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </Section>

            <div style={{ fontSize: 11, color: "#6E6E78", display: "flex", alignItems: "center", gap: 6 }}>
              <IoTime size={12} /> Placed {formatDateTime(order.created_at)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const smallBtn = (color: string) => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 12px", borderRadius: 8, border: "none",
  background: color, color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer",
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#8C8C95", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 13, color: "#8C8C95" }}>{label}</span>
      <span style={{ fontSize: bold ? 16 : 13, color: "#fff", fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dashboard
// ─────────────────────────────────────────────────────────────────────────────
type Stats = {
  total_orders: number; pending_orders: number; completed_orders: number;
  total_sales: number; paid_sales: number; currency_symbol: string;
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [orders, setOrders]   = useState<AdminOrder[]>([]);
  const [stats,  setStats]    = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filters
  const [status, setStatus]           = useState("all");
  const [fulfillment, setFulfillment] = useState("all");
  const [payment, setPayment]         = useState("all");
  const [date, setDate]               = useState<string>("");
  const [q, setQ]                     = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Notifications
  const [soundOn, setSoundOn]         = useState<boolean>(() => localStorage.getItem(SOUND_KEY) !== "false");
  const [newOrderFlash, setNewOrderFlash] = useState(0);
  const seenIds = useRef<Set<string>>(new Set());
  const firstLoadDone = useRef(false);

  useEffect(() => { localStorage.setItem(SOUND_KEY, String(soundOn)); }, [soundOn]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status      !== "all") params.set("status", status);
      if (fulfillment !== "all") params.set("fulfillment", fulfillment);
      if (payment     !== "all") params.set("payment", payment);
      if (date)                  params.set("date", date);
      if (q.trim())              params.set("q", q.trim());
      params.set("limit", "100");

      const [ordersRes, statsRes] = await Promise.all([
        authedFetch(`/api/admin/orders?${params.toString()}`),
        authedFetch(`/api/admin/stats/today`),
      ]);
      const ordersData = await ordersRes.json();
      const statsData  = await statsRes.json();
      if (!ordersRes.ok) throw new Error(ordersData.error ?? "Failed to load orders");
      if (!statsRes.ok)  throw new Error(statsData.error  ?? "Failed to load stats");
      setOrders(ordersData.orders ?? []);
      setStats(statsData);

      if (!firstLoadDone.current) {
        for (const o of ordersData.orders ?? []) seenIds.current.add(o.id);
        firstLoadDone.current = true;
      }
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to load.");
    } finally { setLoading(false); }
  }, [status, fulfillment, payment, date, q]);

  useEffect(() => { load(); }, [load]);

  // ── Realtime subscription ────────────────────────────────────────────────
  // Subscribe to INSERT/UPDATE on the orders table. The admin's Supabase
  // session provides the JWT; RLS (admin manage orders) gates delivery.
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const newRow = (payload.new ?? payload.old ?? {}) as { id?: string };
        if (payload.eventType === "INSERT" && newRow.id && !seenIds.current.has(newRow.id)) {
          seenIds.current.add(newRow.id);
          setNewOrderFlash((n) => n + 1);
          if (soundOn) playChime();
        }
        // Always refetch — keeps filters/sort consistent with server logic.
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, soundOn]);

  const dismissFlash = () => setNewOrderFlash(0);

  const visibleOrders = useMemo(() => orders, [orders]);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", color: "#fff", paddingBottom: 60 }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 5, background: "rgba(10,10,15,0.92)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(228,161,43,0.18)",
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, color: "#8C8C95", letterSpacing: 1.4, textTransform: "uppercase" }}>HD Xquisite Liquors</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Merchant Panel</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setSoundOn((s) => !s)} title={soundOn ? "Mute new-order chime" : "Enable new-order chime"} style={iconBtn}>
            {soundOn ? <IoVolumeHigh size={18} /> : <IoVolumeMute size={18} />}
          </button>
          <button onClick={load} title="Refresh" style={iconBtn}><IoRefresh size={18} /></button>
          <button onClick={async () => { await signOut(); navigate("/auth/login"); }} title="Sign out" style={iconBtn}>
            <IoLogOutOutline size={18} />
          </button>
        </div>
      </div>

      {/* New-order toast */}
      {newOrderFlash > 0 && (
        <div onClick={dismissFlash} style={{
          margin: "12px 20px", padding: "12px 16px", borderRadius: 10,
          background: "linear-gradient(90deg, rgba(40,167,69,0.18), rgba(40,167,69,0.06))",
          border: "1px solid rgba(40,167,69,0.4)", color: "#36C153",
          display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer",
        }}>
          <span style={{ fontWeight: 600 }}>
            🔔 {newOrderFlash} new order{newOrderFlash === 1 ? "" : "s"} just came in
          </span>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Tap to dismiss</span>
        </div>
      )}

      {/* Stats */}
      <div style={{
        padding: "16px 20px",
        display: "grid", gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      }}>
        <StatTile label="Today's Orders"  value={stats?.total_orders ?? 0} />
        <StatTile label="Today's Sales"   value={formatMoney(stats?.total_sales ?? 0, stats?.currency_symbol)} accent />
        <StatTile label="Pending"         value={stats?.pending_orders ?? 0} color="#E4A12B" />
        <StatTile label="Completed"       value={stats?.completed_orders ?? 0} color="#36C153" />
      </div>

      {/* Search + filter bar */}
      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <IoSearch size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6E6E78" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, phone, or order ID…"
              style={{
                width: "100%", padding: "11px 12px 11px 36px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff", fontSize: 14, outline: "none",
              }}
            />
          </div>
          <button onClick={() => setShowFilters((v) => !v)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderRadius: 10,
            background: showFilters ? "rgba(228,161,43,0.16)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${showFilters ? "rgba(228,161,43,0.5)" : "rgba(255,255,255,0.08)"}`,
            color: showFilters ? "#E4A12B" : "#D8D8DE", fontSize: 13, cursor: "pointer",
          }}>
            <IoFilter size={14} /> Filters
          </button>
        </div>

        {showFilters && (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <Select label="Status" value={status} onChange={setStatus} options={[
              { value: "all", label: "All statuses" },
              ...STATUSES.map((s) => ({ value: s.value, label: s.label })),
            ]} />
            <Select label="Type" value={fulfillment} onChange={setFulfillment} options={[
              { value: "all", label: "All types" },
              { value: "delivery", label: "Delivery" },
              { value: "pickup",   label: "Pickup" },
            ]} />
            <Select label="Payment" value={payment} onChange={setPayment} options={[
              { value: "all", label: "All payments" },
              { value: "pending", label: "Pending" },
              { value: "paid",    label: "Paid" },
              { value: "failed",  label: "Failed" },
              { value: "cancelled", label: "Cancelled" },
              { value: "refunded",  label: "Refunded" },
            ]} />
            <DateInput label="Date" value={date} onChange={setDate} />
          </div>
        )}
      </div>

      {/* Orders */}
      <div style={{ padding: "0 20px" }}>
        {loading && <div style={{ padding: 30, textAlign: "center", color: "#8C8C95" }}>Loading orders…</div>}
        {error   && <div style={{ padding: 16, color: "#FF6B7A" }}>{error}</div>}
        {!loading && visibleOrders.length === 0 && !error && (
          <div style={{ padding: 40, textAlign: "center", color: "#8C8C95" }}>No orders match your filters.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleOrders.map((o) => (
            <OrderCard key={o.id} order={o} onClick={() => setSelectedId(o.id)} />
          ))}
        </div>
      </div>

      <OrderDetailDrawer orderId={selectedId} onClose={() => setSelectedId(null)} onUpdated={load} />

      <div style={{ textAlign: "center", padding: "24px 20px 8px", color: "#444", fontSize: 11 }}>
        Signed in as {user?.email ?? "—"}
      </div>
    </div>
  );
}

// ── Small UI helpers ─────────────────────────────────────────────────────────

const iconBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
  color: "#D8D8DE", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};

function StatTile({ label, value, accent, color }: { label: string; value: React.ReactNode; accent?: boolean; color?: string }) {
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: accent ? "linear-gradient(140deg, rgba(228,161,43,0.18), rgba(228,161,43,0.04))" : "rgba(255,255,255,0.03)",
      border: `1px solid ${accent ? "rgba(228,161,43,0.4)" : "rgba(255,255,255,0.06)"}`,
    }}>
      <div style={{ fontSize: 11, color: "#8C8C95", letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color: color ?? (accent ? "#E4A12B" : "#fff") }}>{value}</div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, color: "#8C8C95", letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        padding: "10px 12px", borderRadius: 8, background: "#15151B",
        border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, outline: "none",
      }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, color: "#8C8C95", letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} style={{
        padding: "10px 12px", borderRadius: 8, background: "#15151B",
        border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, outline: "none",
        colorScheme: "dark",
      }} />
    </label>
  );
}

function OrderCard({ order, onClick }: { order: AdminOrder; onClick: () => void }) {
  const sym = order.currency_symbol ?? "$";
  const isPickup = order.fulfillment_method === "pickup";
  return (
    <div onClick={onClick} style={{
      padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
      transition: "border-color 120ms",
    }}
    onMouseOver={(e) => (e.currentTarget.style.borderColor = "rgba(228,161,43,0.4)")}
    onMouseOut={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "monospace", fontSize: 12, color: "#8C8C95" }}>#{order.id.slice(0, 8)}</span>
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.payment_status} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{order.customer_name}</div>
          <div style={{ fontSize: 13, color: "#A8A8B0", display: "flex", alignItems: "center", gap: 6 }}>
            <IoCall size={12} /> {order.customer_phone}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#E4A12B" }}>{formatMoney(order.total, sym)}</div>
          <div style={{ fontSize: 11, color: "#8C8C95", marginTop: 2 }}>{formatDateTime(order.created_at)}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#A8A8B0", fontSize: 12, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <IoLocationSharp size={12} />
          {isPickup ? "Pickup" : (order.delivery_address ?? "—")}
        </span>
        <span style={{ color: "#444" }}>•</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {order.payment_method === "online_card" ? <IoCard size={12} /> : <IoCash size={12} />}
          {order.payment_method === "online_card" ? "PayPal" : "Cash"}
        </span>
      </div>
    </div>
  );
}
