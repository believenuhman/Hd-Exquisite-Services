import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoSearch, IoRefresh, IoLogOutOutline, IoSave,
  IoWarningOutline, IoStorefront, IoAlertCircle,
  IoAdd, IoRemove, IoLocationSharp,
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

const STATUS_COLORS: Record<InventoryRow["status"], { label: string; color: string; bg: string; border: string; ring: string }> = {
  in_stock: { label: "In Stock", color: "#36C153", bg: "rgba(54,193,83,0.10)",  border: "rgba(54,193,83,0.32)",  ring: "rgba(54,193,83,0.18)" },
  low:      { label: "Low",      color: "#E4A12B", bg: "rgba(228,161,43,0.10)", border: "rgba(228,161,43,0.32)", ring: "rgba(228,161,43,0.18)" },
  out:      { label: "Sold Out", color: "#FF6B7A", bg: "rgba(220,53,69,0.10)",  border: "rgba(220,53,69,0.32)",  ring: "rgba(220,53,69,0.18)" },
};

// Compute the on-screen status for a (possibly edited) row based on current
// pending qty + threshold so the UI updates the moment the user clicks +/-.
function computeStatus(qty: number, threshold: number): InventoryRow["status"] {
  if (qty <= 0) return "out";
  if (qty <= threshold) return "low";
  return "in_stock";
}

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

  // Per-row debounced auto-save timers for +/- buttons and the toggle.
  const autoSaveTimers = useRef<Record<string, number>>({});

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

  // Banner label at the top of the dashboard. Shows the active location when
  // either filtered by one location or scoped via location_admin role; falls
  // back to "All Locations" so the admin always sees what they're editing.
  const activeLocation: Location | null = useMemo(() => {
    if (locationSlug !== "all") {
      return locations.find((l) => l.slug === locationSlug) ?? null;
    }
    return null;
  }, [locations, locationSlug]);

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

  // Bump the pending quantity by `delta` (clamped at 0) and schedule an
  // auto-save. Rapid clicks on +/- coalesce into a single PATCH after 600ms.
  const bumpQty = useCallback((r: InventoryRow, delta: number) => {
    const k = rowKey(r);
    const current = edits[k]?.quantity ?? r.quantity;
    const next = Math.max(0, Number(current) + delta);
    setEdit(r, { quantity: next });

    if (autoSaveTimers.current[k]) window.clearTimeout(autoSaveTimers.current[k]);
    autoSaveTimers.current[k] = window.setTimeout(() => {
      // Re-read latest row & edit at fire time to avoid stale closure issues.
      setRows((prev) => {
        const fresh = prev.find((p) => p.product_id === r.product_id && p.location_id === r.location_id);
        if (fresh) saveRow(fresh);
        return prev;
      });
      delete autoSaveTimers.current[k];
    }, 600);
    // We intentionally read `edits` from latest state via the timer callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edits, saveRow]);

  // "Out of Stock" toggle: ON => force qty to 0; OFF => restore to 1 (or the
  // current pending qty if the admin already typed something non-zero).
  const toggleOutOfStock = useCallback((r: InventoryRow, makeOut: boolean) => {
    const k = rowKey(r);
    const target = makeOut ? 0 : Math.max(1, edits[k]?.quantity ?? r.quantity ?? 1);
    setEdit(r, { quantity: target });
    if (autoSaveTimers.current[k]) window.clearTimeout(autoSaveTimers.current[k]);
    autoSaveTimers.current[k] = window.setTimeout(() => {
      setRows((prev) => {
        const fresh = prev.find((p) => p.product_id === r.product_id && p.location_id === r.location_id);
        if (fresh) saveRow(fresh);
        return prev;
      });
      delete autoSaveTimers.current[k];
    }, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edits, saveRow]);

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

      {/* Active-location banner — always visible so admins know which shop
          their edits apply to. Clearly distinguishes single-location view from
          the "All Locations" cross-store view. */}
      <div style={{
        margin: "16px 20px 0",
        padding: "14px 18px",
        borderRadius: 14,
        background: activeLocation
          ? "linear-gradient(135deg, rgba(228,161,43,0.14), rgba(228,161,43,0.04))"
          : "rgba(255,255,255,0.04)",
        border: `1px solid ${activeLocation ? "rgba(228,161,43,0.4)" : "rgba(255,255,255,0.08)"}`,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: activeLocation ? "rgba(228,161,43,0.18)" : "rgba(255,255,255,0.06)",
          color: activeLocation ? "#E4A12B" : "#8C8C95",
          flexShrink: 0,
        }}>
          <IoLocationSharp size={22} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, color: "#8C8C95", letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 600 }}>
            Currently Managing
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, color: activeLocation ? "#fff" : "#D8D8DE", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeLocation ? activeLocation.name : "All Locations"}
          </div>
          {activeLocation?.address && (
            <div style={{ fontSize: 12, color: "#8C8C95", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeLocation.address}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#8C8C95", textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, color: "#fff", fontSize: 18 }}>{rows.length}</div>
          <div style={{ letterSpacing: 0.6, textTransform: "uppercase" }}>items</div>
        </div>
      </div>

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

      {/* Inventory cards */}
      <div style={{ padding: "8px 20px" }}>
        {loading && <div style={{ padding: 30, textAlign: "center", color: "#8C8C95" }}>Loading inventory…</div>}
        {!loading && rows.length === 0 && enabled && (
          <div style={{ padding: 40, textAlign: "center", color: "#8C8C95" }}>
            {lowStockOnly ? "No low-stock items at the moment." : "No inventory rows match your filters."}
          </div>
        )}

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {rows.map((r) => {
            const k = rowKey(r);
            const e = editFor(r);
            const dirty = isDirty(r);
            const pendingQty = e.quantity ?? r.quantity;
            const pendingThreshold = e.low_stock_threshold ?? r.low_stock_threshold;
            const liveStatus = computeStatus(pendingQty, pendingThreshold);
            const c = STATUS_COLORS[liveStatus];
            const isOut = pendingQty <= 0;

            return (
              <div key={k} style={{
                position: "relative",
                padding: 16, borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${dirty ? "rgba(228,161,43,0.5)" : c.border}`,
                boxShadow: `inset 0 0 0 1px ${c.ring}`,
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                {/* Header: image + name + location */}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, background: "#15151B", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {r.product_image
                      ? <img src={r.product_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <IoStorefront size={22} color="#6E6E78" />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                      {r.product_name}
                    </div>
                    <div style={{ fontSize: 11, color: "#8C8C95", marginTop: 4 }}>
                      {[r.product_category, r.product_size].filter(Boolean).join(" • ") || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "#A8A8B0", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <IoStorefront size={11} /> {r.location_name}
                    </div>
                  </div>
                </div>

                {/* Big stock number with color band */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 12,
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: c.color, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 700, opacity: 0.85 }}>
                      {c.label}
                    </div>
                    <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.05, color: c.color, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
                      {pendingQty}
                    </div>
                    <div style={{ fontSize: 11, color: "#8C8C95", marginTop: 4 }}>
                      Low at ≤ {pendingThreshold} units
                    </div>
                  </div>

                  {/* +/- quick adjust */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      onClick={() => bumpQty(r, +1)}
                      title="Add one"
                      style={qtyBtn(c.color)}
                    >
                      <IoAdd size={20} />
                    </button>
                    <button
                      onClick={() => bumpQty(r, -1)}
                      disabled={pendingQty <= 0}
                      title="Remove one"
                      style={{ ...qtyBtn(c.color), opacity: pendingQty <= 0 ? 0.35 : 1, cursor: pendingQty <= 0 ? "not-allowed" : "pointer" }}
                    >
                      <IoRemove size={20} />
                    </button>
                  </div>
                </div>

                {/* Out of Stock toggle + manual quantity / threshold inputs */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <button
                    onClick={() => toggleOutOfStock(r, !isOut)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "8px 12px", borderRadius: 999,
                      background: isOut ? "rgba(220,53,69,0.16)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isOut ? "rgba(220,53,69,0.5)" : "rgba(255,255,255,0.1)"}`,
                      color: isOut ? "#FF6B7A" : "#D8D8DE",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                    title={isOut ? "Restore stock to 1" : "Mark as out of stock"}
                  >
                    <span style={{
                      width: 28, height: 16, borderRadius: 999, position: "relative",
                      background: isOut ? "#FF6B7A" : "rgba(255,255,255,0.15)",
                      transition: "background 120ms",
                    }}>
                      <span style={{
                        position: "absolute", top: 2, left: isOut ? 14 : 2,
                        width: 12, height: 12, borderRadius: "50%", background: "#0A0A0F",
                        transition: "left 120ms",
                      }} />
                    </span>
                    Out of Stock
                  </button>

                  {dirty && (
                    <button
                      onClick={() => saveRow(r)}
                      disabled={savingKey === k}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "8px 12px", borderRadius: 8, border: "none",
                        background: "linear-gradient(135deg, #D4901A, #F5C842)",
                        color: "#0A0A0F", fontSize: 12, fontWeight: 700,
                        cursor: "pointer", opacity: savingKey === k ? 0.6 : 1,
                      }}
                    >
                      <IoSave size={13} /> {savingKey === k ? "Saving…" : "Save now"}
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={miniLabel}>Set quantity</label>
                    <input
                      type="number" min={0} step={1}
                      value={pendingQty}
                      onChange={(ev) => setEdit(r, { quantity: Math.max(0, Number(ev.target.value || 0)) })}
                      onBlur={() => { if (isDirty(r)) saveRow(r); }}
                      style={numInput}
                    />
                  </div>
                  <div>
                    <label style={miniLabel}>Low at ≤</label>
                    <input
                      type="number" min={0} step={1}
                      value={pendingThreshold}
                      onChange={(ev) => setEdit(r, { low_stock_threshold: Math.max(0, Number(ev.target.value || 0)) })}
                      onBlur={() => { if (isDirty(r)) saveRow(r); }}
                      style={numInput}
                    />
                  </div>
                </div>
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
  display: "block", fontSize: 9, color: "#6E6E78", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4,
};
const numInput: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 6,
  background: "#0F0F14", border: "1px solid rgba(255,255,255,0.08)",
  color: "#fff", fontSize: 13, outline: "none",
};
const qtyBtn = (accent: string): React.CSSProperties => ({
  width: 38, height: 38, borderRadius: 10,
  background: "rgba(255,255,255,0.06)",
  border: `1px solid ${accent}55`,
  color: accent,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
});
