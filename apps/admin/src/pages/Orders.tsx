import React, { useEffect, useState } from "react";
import { supabase, Order, OrderItem } from "../lib/supabase";

const STATUSES = ["all", "received", "packing", "out_for_delivery", "delivered", "refused"];

const S: Record<string, React.CSSProperties> = {
  title: { fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8 },
  filters: { display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" as const },
  filterBtn: (active: boolean): React.CSSProperties => ({
    padding: "7px 16px", borderRadius: 20, border: "1px solid rgba(214,162,74,0.25)",
    background: active ? "rgba(214,162,74,0.15)" : "rgba(255,255,255,0.04)",
    color: active ? "#E8B86D" : "rgba(185,185,195,0.7)",
    cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 12,
  }),
  card: { background: "rgba(20,20,28,0.78)", border: "1px solid rgba(214,162,74,0.15)", borderRadius: 16, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { fontFamily: "Inter,sans-serif", fontSize: 11, color: "#E8B86D", letterSpacing: 1.5, textTransform: "uppercase" as const, padding: "12px 16px", textAlign: "left" as const, borderBottom: "1px solid rgba(214,162,74,0.12)" },
  td: { fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(185,185,195,0.85)", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle" as const },
  status: (s: string): React.CSSProperties => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: s === "delivered" ? "rgba(76,175,80,0.15)" : s === "refused" ? "rgba(255,77,77,0.15)" : "rgba(214,162,74,0.15)",
    color: s === "delivered" ? "#4CAF50" : s === "refused" ? "#FF4D4D" : "#E8B86D",
  }),
  viewBtn: { background: "rgba(214,162,74,0.1)", border: "1px solid rgba(214,162,74,0.3)", color: "#E8B86D", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "Inter,sans-serif" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#14141C", border: "1px solid rgba(214,162,74,0.2)", borderRadius: 20, padding: 32, width: "90%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto" as const },
  modalTitle: { fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 20 },
  section: { fontFamily: "Inter,sans-serif", fontSize: 11, color: "#E8B86D", letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 10, marginTop: 20 },
  info: { fontFamily: "Inter,sans-serif", fontSize: 14, color: "rgba(185,185,195,0.8)", marginBottom: 6 },
  statusSelect: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(214,162,74,0.2)", borderRadius: 8, padding: "9px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: 13, marginRight: 10 },
  updateBtn: { background: "linear-gradient(90deg,#D6A24A,#F6D27A)", border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: "#000" },
  reasonInput: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(214,162,74,0.2)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: 14, marginTop: 8, outline: "none" },
  closeBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(185,185,195,0.8)", marginLeft: 10 },
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [newStatus, setNewStatus] = useState<string>("");
  const [reason, setReason] = useState("");

  const load = () => {
    let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    q.then(({ data }) => setOrders((data ?? []) as Order[]));
  };

  useEffect(() => { load(); }, [filter]);

  const openOrder = async (o: Order) => {
    setSelected(o);
    setNewStatus(o.status);
    setReason(o.refusal_reason ?? "");
    const { data } = await supabase.from("order_items").select("*").eq("order_id", o.id);
    setItems((data ?? []) as OrderItem[]);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    const payload: any = { status: newStatus };
    if (newStatus === "refused") payload.refusal_reason = reason;
    await supabase.from("orders").update(payload).eq("id", selected.id);
    setSelected(null);
    load();
  };

  return (
    <div>
      <div style={S.title}>Orders</div>
      <div style={S.filters}>
        {STATUSES.map(s => (
          <button key={s} style={S.filterBtn(filter === s)} onClick={() => setFilter(s)}>
            {s.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())}
          </button>
        ))}
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>ID</th>
              <th style={S.th}>Customer</th>
              <th style={S.th}>Phone</th>
              <th style={S.th}>Total</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Date</th>
              <th style={S.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={S.td}>{o.id.slice(0, 8).toUpperCase()}</td>
                <td style={{ ...S.td, color: "#fff" }}>{o.customer_name}</td>
                <td style={S.td}>{o.customer_phone}</td>
                <td style={S.td}>{o.currency_symbol}{Number(o.total).toFixed(2)}</td>
                <td style={S.td}><span style={S.status(o.status)}>{o.status.replace(/_/g, " ")}</span></td>
                <td style={S.td}>{new Date(o.created_at).toLocaleDateString()}</td>
                <td style={S.td}><button style={S.viewBtn} onClick={() => openOrder(o)}>View</button></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td style={{ ...S.td, textAlign: "center", color: "rgba(185,185,195,0.4)" }} colSpan={7}>No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>Order {selected.id.slice(0, 8).toUpperCase()}</div>
            <div style={S.section}>Customer Info</div>
            <div style={S.info}><b style={{ color: "#E8B86D" }}>Name:</b> {selected.customer_name}</div>
            <div style={S.info}><b style={{ color: "#E8B86D" }}>Phone:</b> {selected.customer_phone}</div>
            <div style={S.info}><b style={{ color: "#E8B86D" }}>Address:</b> {selected.delivery_address}</div>
            {selected.delivery_notes && <div style={S.info}><b style={{ color: "#E8B86D" }}>Notes:</b> {selected.delivery_notes}</div>}
            <div style={S.section}>Items</div>
            {items.map(i => <div key={i.id} style={S.info}>• {i.name} ×{i.qty} — {selected.currency_symbol}{Number(i.unit_price * i.qty).toFixed(2)}</div>)}
            <div style={S.section}>Payment</div>
            <div style={S.info}>Subtotal: {selected.currency_symbol}{Number(selected.subtotal).toFixed(2)}</div>
            <div style={S.info}>Delivery: {selected.currency_symbol}{Number(selected.delivery_fee).toFixed(2)}</div>
            <div style={{ ...S.info, color: "#E8B86D", fontWeight: 600 }}>Total: {selected.currency_symbol}{Number(selected.total).toFixed(2)}</div>
            <div style={S.section}>Update Status</div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" as const, gap: 10 }}>
              <select style={S.statusSelect} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                {STATUSES.slice(1).map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
              <button style={S.updateBtn} onClick={handleUpdate}>Update</button>
              <button style={S.closeBtn} onClick={() => setSelected(null)}>Close</button>
            </div>
            {newStatus === "refused" && (
              <textarea style={S.reasonInput} placeholder="Reason for refusal…" value={reason} onChange={e => setReason(e.target.value)} rows={3} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
