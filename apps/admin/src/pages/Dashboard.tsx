import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Stats = { products: number; orders: number; revenue: number; pending: number };

const S = {
  title: { fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8 },
  sub: { color: "rgba(185,185,195,0.7)", fontFamily: "Inter,sans-serif", fontSize: 14, marginBottom: 32 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20, marginBottom: 40 },
  card: {
    background: "rgba(20,20,28,0.78)", border: "1px solid rgba(214,162,74,0.15)",
    borderRadius: 16, padding: 24,
  },
  statVal: { fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, color: "#E8B86D" },
  statLabel: { fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(185,185,195,0.7)", marginTop: 6 },
  recentTitle: { fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 16 },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { fontFamily: "Inter,sans-serif", fontSize: 11, color: "#E8B86D", letterSpacing: 1.5, textTransform: "uppercase" as const, padding: "8px 12px", textAlign: "left" as const, borderBottom: "1px solid rgba(214,162,74,0.12)" },
  td: { fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(185,185,195,0.85)", padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  status: (s: string): React.CSSProperties => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 600,
    background: s === "delivered" ? "rgba(76,175,80,0.15)" : s === "refused" ? "rgba(255,77,77,0.15)" : "rgba(214,162,74,0.15)",
    color: s === "delivered" ? "#4CAF50" : s === "refused" ? "#FF4D4D" : "#E8B86D",
  }),
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ products: 0, orders: 0, revenue: 0, pending: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("products").select("id", { count: "exact" }),
      supabase.from("orders").select("id,total,status", { count: "exact" }),
    ]).then(([p, o]) => {
      const orders = o.data ?? [];
      setStats({
        products: p.count ?? 0,
        orders: o.count ?? 0,
        revenue: orders.reduce((acc: number, x: any) => acc + (x.total ?? 0), 0),
        pending: orders.filter((x: any) => x.status === "received" || x.status === "packing").length,
      });
      setRecentOrders(orders.slice(-10).reverse());
    });
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setRecentOrders(data); });
  }, []);

  return (
    <div>
      <div style={S.title}>Dashboard</div>
      <div style={S.sub}>Welcome back. Here's what's happening with HD Xquisite.</div>
      <div style={S.grid}>
        <div style={S.card}><div style={S.statVal}>{stats.products}</div><div style={S.statLabel}>Active Products</div></div>
        <div style={S.card}><div style={S.statVal}>{stats.orders}</div><div style={S.statLabel}>Total Orders</div></div>
        <div style={S.card}><div style={S.statVal}>${stats.revenue.toFixed(2)}</div><div style={S.statLabel}>Total Revenue</div></div>
        <div style={S.card}><div style={S.statVal}>{stats.pending}</div><div style={S.statLabel}>Pending Orders</div></div>
      </div>
      <div style={S.recentTitle}>Recent Orders</div>
      <div style={{ ...S.card, padding: 0, overflowX: "auto" as const }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Order ID</th>
              <th style={S.th}>Customer</th>
              <th style={S.th}>Total</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o.id}>
                <td style={S.td}>{o.id?.slice(0, 8).toUpperCase()}</td>
                <td style={S.td}>{o.customer_name}</td>
                <td style={S.td}>{o.currency_symbol}{Number(o.total).toFixed(2)}</td>
                <td style={S.td}><span style={S.status(o.status)}>{o.status?.replace(/_/g, " ")}</span></td>
                <td style={S.td}>{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr><td style={{ ...S.td, color: "rgba(185,185,195,0.4)", textAlign: "center" }} colSpan={5}>No orders yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
