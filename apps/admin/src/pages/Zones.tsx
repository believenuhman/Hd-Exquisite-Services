import React, { useEffect, useState } from "react";
import { supabase, DeliveryZone } from "../lib/supabase";

const S: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  title: { fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#fff" },
  addBtn: { background: "linear-gradient(90deg,#D6A24A,#F6D27A)", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: "#000" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 },
  card: { background: "rgba(20,20,28,0.78)", border: "1px solid rgba(214,162,74,0.15)", borderRadius: 16, padding: 20 },
  zoneName: { fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 },
  zoneFee: { fontFamily: "Inter,sans-serif", fontSize: 22, fontWeight: 700, color: "#E8B86D", marginBottom: 12 },
  badge: (active: boolean): React.CSSProperties => ({ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: active ? "rgba(76,175,80,0.15)" : "rgba(255,77,77,0.15)", color: active ? "#4CAF50" : "#FF4D4D", marginBottom: 14 }),
  actions: { display: "flex", gap: 8 },
  editBtn: { background: "rgba(214,162,74,0.1)", border: "1px solid rgba(214,162,74,0.3)", color: "#E8B86D", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter,sans-serif" },
  delBtn: { background: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.3)", color: "#FF4D4D", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter,sans-serif" },
  toggleBtn: (active: boolean): React.CSSProperties => ({ background: active ? "rgba(255,77,77,0.1)" : "rgba(76,175,80,0.1)", border: active ? "1px solid rgba(255,77,77,0.3)" : "1px solid rgba(76,175,80,0.3)", color: active ? "#FF4D4D" : "#4CAF50", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontFamily: "Inter,sans-serif" }),
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#14141C", border: "1px solid rgba(214,162,74,0.2)", borderRadius: 20, padding: 32, width: "90%", maxWidth: 420 },
  modalTitle: { fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 20 },
  label: { fontFamily: "Inter,sans-serif", fontSize: 11, color: "#E8B86D", letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 5, display: "block" },
  input: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(214,162,74,0.2)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: 14, marginBottom: 14, outline: "none" },
  saveBtn: { background: "linear-gradient(90deg,#D6A24A,#F6D27A)", border: "none", borderRadius: 10, padding: "12px 24px", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#000" },
  cancelBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 24px", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(185,185,195,0.8)", marginLeft: 10 },
};

export default function Zones() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [modal, setModal] = useState<Partial<DeliveryZone> | null>(null);
  const [form, setForm] = useState({ name: "", fee: 0 });

  const load = () => supabase.from("delivery_zones").select("*").order("name").then(({ data }) => setZones((data ?? []) as DeliveryZone[]));
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ name: "", fee: 0 }); setModal({}); };
  const openEdit = (z: DeliveryZone) => { setForm({ name: z.name, fee: z.fee }); setModal(z); };

  const handleSave = async () => {
    const data = { name: form.name, fee: Number(form.fee) };
    if ((modal as DeliveryZone)?.id) {
      await supabase.from("delivery_zones").update(data).eq("id", (modal as DeliveryZone).id);
    } else {
      await supabase.from("delivery_zones").insert({ ...data, is_active: true });
    }
    setModal(null); load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this zone?")) return;
    await supabase.from("delivery_zones").delete().eq("id", id);
    load();
  };

  const handleToggle = async (z: DeliveryZone) => {
    await supabase.from("delivery_zones").update({ is_active: !z.is_active }).eq("id", z.id);
    load();
  };

  return (
    <div>
      <div style={S.header}>
        <div style={S.title}>Delivery Zones</div>
        <button style={S.addBtn} onClick={openNew}>+ Add Zone</button>
      </div>
      <div style={S.grid}>
        {zones.map(z => (
          <div key={z.id} style={S.card}>
            <div style={S.zoneName}>{z.name}</div>
            <div style={S.zoneFee}>${Number(z.fee).toFixed(2)}</div>
            <div><span style={S.badge(z.is_active)}>{z.is_active ? "Active" : "Inactive"}</span></div>
            <div style={S.actions}>
              <button style={S.editBtn} onClick={() => openEdit(z)}>Edit</button>
              <button style={S.toggleBtn(z.is_active)} onClick={() => handleToggle(z)}>{z.is_active ? "Disable" : "Enable"}</button>
              <button style={S.delBtn} onClick={() => handleDelete(z.id)}>Delete</button>
            </div>
          </div>
        ))}
        {zones.length === 0 && <div style={{ color: "rgba(185,185,195,0.4)", fontFamily: "Inter,sans-serif" }}>No zones yet</div>}
      </div>

      {modal !== null && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>{(modal as DeliveryZone)?.id ? "Edit Zone" : "New Zone"}</div>
            <label style={S.label}>Zone Name</label>
            <input style={S.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bridgetown" />
            <label style={S.label}>Delivery Fee</label>
            <input style={S.input} type="number" step="0.01" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: Number(e.target.value) }))} />
            <div style={{ marginTop: 8 }}>
              <button style={S.saveBtn} onClick={handleSave}>Save</button>
              <button style={S.cancelBtn} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
