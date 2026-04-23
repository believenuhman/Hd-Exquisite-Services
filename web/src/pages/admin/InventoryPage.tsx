import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoSearch, IoRefresh, IoLogOutOutline, IoSave,
  IoWarningOutline, IoStorefront, IoAlertCircle,
} from "react-icons/io5";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api";
import { AdminTabs } from "./AdminTabs";

type Location = { id: string; slug: string; name: string; address: string; is_active: boolean };

type InventoryRow = {
  product_id: string; product_name: string; product_image: string | null;
  product_category: string | null; product_size: string | null; product_price: number;
  location_id: string; location_slug: string; location_name: string;
  quantity: number; low_stock_threshold: number;
  status: "in_stock" | "low" | "out"; updated_at: string | null;
};

type Me = { isAdmin: boolean; role?: "admin" | "location_admin"; location_slug?: string | null };

const STATUS_BADGES: Record<InventoryRow["status"], { label: string; bg: string; text: string }> = {
  in_stock: { label: "In Stock", bg: "rgba(40,167,69,0.14)",  text: "#36C153" },
  low:      { label: "Low",      bg: "rgba(228,161,43,0.16)", text: "#E4A12B" },
  out:      { label: "Out",      bg: "rgba(220,53,69,0.14)",  text: "#FF6B7A" },
};

export function InventoryPage({ initialLowStockOnly = false }: { initialLowStockOnly?: boolean }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [me,           setMe]            = useState<Me | null>(null);
  const [locations,    setLocations]     = useState<Location[]>([]);
  const [categories,   setCategories]    = useState<string[]>([]);
  const [rows,         setRows]          = useState<InventoryRow[]>([]);
  const [loading,      setLoading]       = useState(true);
  const [error,        setError]         = useState<string | null>(null);
  const [enabled,      setEnabled]       = useState(true);

  // Filters
  const [q,            setQ]             = useState("");
  const [category,     setCategory]      = useState("all");
  const [locationSlug, setLocationSlug]  = useState<string>("all");
  const [lowStockOnly, setLowStockOnly]  = useState<boolean>(initialLowStockOnly);

  // Per-row in-flight edits keyed by `${productId}:${locationId}`.
  const [edits, setEdits] = useState<Record<string, { quantity?: number; low_stock_threshold?: number }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Fetch /api/admin/me once to learn role + locked location for location_admin.
  useEffect(() => {
    authedFetch("/api/admin/me").then(async (r) => {
      const d = await r.json();
      setMe(d);
      if (d?.role === "location_admin" && d.location_slug) {
        setLocationSlug(d.location_slug);
      }
    }).catch(() => { /* ignored — page still works as super-admin */ });
  }, []);

  // Fetch locations + categories once.
  useEffect(() => {
    Promise.all([
      authedFetch("/api/admin/locations").then((r) => r.json()),
      authedFetch("/api/admin/inventory/categories").then((r) => r.json()),
    ]).then(([locsData, catsData]) => {
      setLocations(locsData?.locations ?? []);
      setCategories(catsData?.categories ?? []);
      if (locsData?.inventory_enabled === false) setEnabled(false);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim())                               params.set("q", q.trim());
      if (category !== "all")                     params.set("category", category);
      if (lowStockOnly)                           params.set("low_stock", "1");
      if (locationSlug && locationSlug !== "all") params.set("location_slug", locationSlug);

      const r = await authedFetch(`/api/admin/inventory?${params.toString()}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? "Failed to load inventory.");
      if (d?.inventory_enabled === false) {
        setEnabled(false);
        setRows([]);
        return;
      }
      setEnabled(true);
      setRows(d.inventory ?? []);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [q, category, lowStockOnly, locationSlug]);

  // Debounced reload on filter change.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(load, 250);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [load]);

  const filteredLocations = useMemo(() => {
    if (me?.role === "location_admin" && me.location_slug) {
      return locations.filter((l) => l.slug === me.location_slug);
    }
    return locations;
  }, [locations, me]);

  const rowKey = (r: InventoryRow) => `${r.product_id}:${r.location_id}`;
  const editFor = (r: InventoryRow) => edits[rowKey(r)] ?? {};
  const setEdit = (r: InventoryRow, patch: Partial<{ quantity: number; low_stock_threshold: number }>) => {
    setEdits((prev) => ({ ...prev, [rowKey(r)]: { ...prev[rowKey(r)], ...patch } }));
  };
  const isDirty = (r: InventoryRow) => {
    const e = editFor(r);
    if (e.quantity            !== undefined && Number(e.quantity)            !== Number(r.quantity)) return true;
    if (e.low_stock_threshold !== undefined && Number(e.low_stock_threshold) !== Number(r.low_stock_threshold)) return true;
    return false;
  };

  const saveRow = useCallback(async (r: InventoryRow) => {
    const e = editFor(r);
    if (!isDirty(r)) return;
    setSavingKey(rowKey(r));
    setError(null);
    try {
      const body: Record<string, unknown> = {
        product_id:  r.product_id,
        location_id: r.location_id,
      };
      if (e.quantity            !== undefined) body.quantity            = Number(e.quantity);
      if (e.low_stock_threshold !== undefined) body.low_stock_threshold = Number(e.low_stock_threshold);

      const res = await authedFetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Failed to save.");
      // Drop the edit entry and refresh the row from server response.
      setEdits((prev) => { const n = { ...prev }; delete n[rowKey(r)]; return n; });
      if (d.row) {
        setRows((prev) => prev.map((row) => row.product_id === r.product_id && row.location_id === r.location_id ? d.row : row));
      } else {
        load();
      }
    } catch (e2: unknown) {
      setError((e2 as Error)?.message ?? "Failed to save.");
    } finally {
      setSavingKey(null);
    }
    // editFor + isDirty depend on `edits` which is tracked by setEdits — load is only used as a fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edits, load]);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", color: "#fff", paddingBottom: 60 }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 5, background: "rgba(10,10,15,0.92)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(228,161,43,0.18)",
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 12, color: "#8C8C95", letterSpacing: 1.4, textTransform: "uppercase" }}>HD Xquisite Liquors</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            {initialLowStockOnly ? "Low Stock" : "Inventory"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={load} title="Refresh" style={iconBtn}><IoRefresh size={18} /></button>
          <button onClick={async () => { await signOut(); navigate("/auth/login"); }} title="Sign out" style={iconBtn}>
            <IoLogOutOutline size={18} />
          </button>
        </div>
      </div>
      <AdminTabs />

      {!enabled && (
        <div style={{ margin: "16px 20px", padding: 14, borderRadius: 10, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.3)", color: "#E4A12B", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <IoAlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <strong>Inventory not enabled.</strong> Apply <code style={{ background: "rgba(0,0,0,0.3)", padding: "1px 6px", borderRadius: 4 }}>supabase-inventory-migration.sql</code> in your Supabase SQL editor to enable per-location stock management.
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ padding: "16px 20px 8px", display: "grid", gap: 10, gridTemplateColumns: "minmax(220px, 2fr) repeat(auto-fit, minmax(160px, 1fr))" }}>
        <div style={{ position: "relative" }}>
          <IoSearch size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6E6E78" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…"
            style={{ width: "100%", padding: "11px 12px 11px 36px", borderRadius: 10,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#fff", fontSize: 14, outline: "none" }} />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {me?.role !== "location_admin" && filteredLocations.length > 1 && (
          <select value={locationSlug} onChange={(e) => setLocationSlug(e.target.value)} style={selectStyle}>
            <option value="all">All locations</option>
            {filteredLocations.map((l) => <option key={l.id} value={l.slug}>{l.name}</option>)}
          </select>
        )}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 12px", borderRadius: 10, background: lowStockOnly ? "rgba(228,161,43,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${lowStockOnly ? "rgba(228,161,43,0.45)" : "rgba(255,255,255,0.08)"}`, color: lowStockOnly ? "#E4A12B" : "#D8D8DE", fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} style={{ accentColor: "#E4A12B" }} />
          <IoWarningOutline size={14} /> Low stock only
        </label>
      </div>

      {error && (
        <div style={{ margin: "8px 20px", padding: 12, borderRadius: 8, background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.3)", color: "#FF6B7A", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Inventory table */}
      <div style={{ padding: "8px 20px" }}>
        {loading && <div style={{ padding: 30, textAlign: "center", color: "#8C8C95" }}>Loading inventory…</div>}
        {!loading && rows.length === 0 && enabled && (
          <div style={{ padding: 40, textAlign: "center", color: "#8C8C95" }}>
            {lowStockOnly ? "No low-stock items at the moment." : "No inventory rows match your filters."}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => {
            const k = rowKey(r);
            const e = editFor(r);
            const dirty = isDirty(r);
            const badge = STATUS_BADGES[r.status];
            return (
              <div key={k} style={{
                display: "grid",
                gridTemplateColumns: "56px minmax(180px, 2fr) minmax(120px, 1fr) 110px 110px 110px 110px",
                gap: 12, alignItems: "center",
                padding: 12, borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${dirty ? "rgba(228,161,43,0.5)" : "rgba(255,255,255,0.06)"}`,
              }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, background: "#15151B", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {r.product_image
                    ? <img src={r.product_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <IoStorefront size={20} color="#6E6E78" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.product_name}</div>
                  <div style={{ fontSize: 11, color: "#8C8C95", marginTop: 2 }}>
                    {[r.product_category, r.product_size].filter(Boolean).join(" • ") || "—"}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#A8A8B0", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <IoStorefront size={12} /> {r.location_name}
                </div>
                <div>
                  <label style={miniLabel}>Quantity</label>
                  <input
                    type="number" min={0} step={1}
                    value={e.quantity ?? r.quantity}
                    onChange={(ev) => setEdit(r, { quantity: Math.max(0, Number(ev.target.value || 0)) })}
                    style={numInput}
                  />
                </div>
                <div>
                  <label style={miniLabel}>Low at ≤</label>
                  <input
                    type="number" min={0} step={1}
                    value={e.low_stock_threshold ?? r.low_stock_threshold}
                    onChange={(ev) => setEdit(r, { low_stock_threshold: Math.max(0, Number(ev.target.value || 0)) })}
                    style={numInput}
                  />
                </div>
                <div>
                  <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: badge.bg, color: badge.text, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {badge.label}
                  </span>
                </div>
                <button
                  onClick={() => saveRow(r)}
                  disabled={!dirty || savingKey === k}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px 12px", borderRadius: 8, border: "none",
                    background: dirty ? "linear-gradient(135deg, #D4901A, #F5C842)" : "rgba(255,255,255,0.05)",
                    color: dirty ? "#0A0A0F" : "#6E6E78",
                    fontSize: 13, fontWeight: 600,
                    cursor: dirty ? "pointer" : "default",
                    opacity: savingKey === k ? 0.6 : 1,
                  }}
                >
                  <IoSave size={14} /> {savingKey === k ? "Saving…" : "Save"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "24px 20px 8px", color: "#444", fontSize: 11 }}>
        Signed in as {user?.email ?? "—"} {me?.role === "location_admin" && me.location_slug ? ` • ${me.location_slug}` : ""}
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
  color: "#D8D8DE", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};
const selectStyle: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 10, background: "#15151B",
  border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, outline: "none",
};
const miniLabel: React.CSSProperties = {
  display: "block", fontSize: 9, color: "#6E6E78", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2,
};
const numInput: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 6,
  background: "#0F0F14", border: "1px solid rgba(255,255,255,0.08)",
  color: "#fff", fontSize: 13, outline: "none",
};
