import React, { useEffect, useState, useRef } from "react";
import { supabase, Product } from "../lib/supabase";

const CATS = ["Beers", "Whiskey", "Wine", "Vodka", "Rum"];

const S: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  title: { fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#fff" },
  addBtn: {
    background: "linear-gradient(90deg,#D6A24A,#F6D27A)", border: "none",
    borderRadius: 10, padding: "10px 20px", cursor: "pointer",
    fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: "#000",
  },
  table: { width: "100%", borderCollapse: "collapse" as const },
  card: { background: "rgba(20,20,28,0.78)", border: "1px solid rgba(214,162,74,0.15)", borderRadius: 16, overflow: "hidden" },
  th: { fontFamily: "Inter,sans-serif", fontSize: 11, color: "#E8B86D", letterSpacing: 1.5, textTransform: "uppercase" as const, padding: "12px 16px", textAlign: "left" as const, borderBottom: "1px solid rgba(214,162,74,0.12)" },
  td: { fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(185,185,195,0.85)", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle" as const },
  img: { width: 44, height: 56, objectFit: "cover" as const, borderRadius: 6, border: "1px solid rgba(214,162,74,0.2)" },
  badge: (active: boolean): React.CSSProperties => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: active ? "rgba(76,175,80,0.15)" : "rgba(255,77,77,0.15)",
    color: active ? "#4CAF50" : "#FF4D4D",
  }),
  editBtn: { background: "rgba(214,162,74,0.1)", border: "1px solid rgba(214,162,74,0.3)", color: "#E8B86D", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "Inter,sans-serif" },
  delBtn: { background: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.3)", color: "#FF4D4D", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontFamily: "Inter,sans-serif", marginLeft: 6 },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#14141C", border: "1px solid rgba(214,162,74,0.2)", borderRadius: 20, padding: 32, width: "90%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" as const },
  modalTitle: { fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 24 },
  label: { fontFamily: "Inter,sans-serif", fontSize: 11, color: "#E8B86D", letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 5, display: "block" },
  input: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(214,162,74,0.2)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: 14, marginBottom: 14, outline: "none" },
  row: { display: "flex", gap: 12 },
  saveBtn: { background: "linear-gradient(90deg,#D6A24A,#F6D27A)", border: "none", borderRadius: 10, padding: "12px 24px", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#000", marginTop: 8 },
  cancelBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 24px", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(185,185,195,0.8)", marginTop: 8, marginLeft: 10 },
  toggle: (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
    fontFamily: "Inter,sans-serif", fontSize: 13, color: active ? "#E8B86D" : "rgba(185,185,195,0.6)", marginBottom: 12,
  }),
  imgPreview: { width: 80, height: 100, objectFit: "cover" as const, borderRadius: 8, border: "1px solid rgba(214,162,74,0.2)", marginBottom: 10 },
  uploadBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(214,162,74,0.2)", color: "#E8B86D", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontFamily: "Inter,sans-serif" },
};

const empty: Omit<Product, "id" | "created_at"> = {
  name: "", category: "Whiskey", price: 0, rating: 4.5,
  description: "", image_url: null, is_trending: false, is_active: true, stock_qty: 0,
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [modal, setModal] = useState<Partial<Product> | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => supabase.from("products").select("*").order("created_at", { ascending: false }).then(({ data }) => setProducts((data ?? []) as Product[]));

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ ...empty }); setModal({}); };
  const openEdit = (p: Product) => { setForm({ name: p.name, category: p.category, price: p.price, rating: p.rating, description: p.description, image_url: p.image_url, is_trending: p.is_trending, is_active: p.is_active, stock_qty: p.stock_qty }); setModal(p); };

  const handleSave = async () => {
    const data = { name: form.name, category: form.category, price: Number(form.price), rating: Number(form.rating), description: form.description, image_url: form.image_url, is_trending: form.is_trending, is_active: form.is_active, stock_qty: Number(form.stock_qty) };
    if ((modal as Product)?.id) {
      await supabase.from("products").update(data).eq("id", (modal as Product).id);
    } else {
      await supabase.from("products").insert(data);
    }
    setModal(null); load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (!error) {
      const { data: url } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: url.publicUrl }));
    }
    setUploading(false);
  };

  return (
    <div>
      <div style={S.header}>
        <div style={S.title}>Products</div>
        <button style={S.addBtn} onClick={openNew}>+ Add Product</button>
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Image</th>
              <th style={S.th}>Name</th>
              <th style={S.th}>Category</th>
              <th style={S.th}>Price</th>
              <th style={S.th}>Stock</th>
              <th style={S.th}>Trending</th>
              <th style={S.th}>Active</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td style={S.td}>{p.image_url ? <img src={p.image_url} style={S.img} alt={p.name} /> : <div style={{ ...S.img, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>🍾</div>}</td>
                <td style={{ ...S.td, fontWeight: 600, color: "#fff" }}>{p.name}</td>
                <td style={S.td}>{p.category}</td>
                <td style={S.td}>${Number(p.price).toFixed(2)}</td>
                <td style={S.td}>{p.stock_qty}</td>
                <td style={S.td}><span style={S.badge(p.is_trending)}>{p.is_trending ? "Yes" : "No"}</span></td>
                <td style={S.td}><span style={S.badge(p.is_active)}>{p.is_active ? "Active" : "Inactive"}</span></td>
                <td style={S.td}>
                  <button style={S.editBtn} onClick={() => openEdit(p)}>Edit</button>
                  <button style={S.delBtn} onClick={() => handleDelete(p.id)}>Del</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td style={{ ...S.td, textAlign: "center", color: "rgba(185,185,195,0.4)" }} colSpan={8}>No products yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div style={S.modal}>
            <div style={S.modalTitle}>{(modal as Product)?.id ? "Edit Product" : "New Product"}</div>
            <label style={S.label}>Name</label>
            <input style={S.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" />
            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Category</label>
                <select style={S.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Price</label>
                <input style={S.input} type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
            </div>
            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Rating (0-5)</label>
                <input style={S.input} type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Stock Qty</label>
                <input style={S.input} type="number" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: Number(e.target.value) }))} />
              </div>
            </div>
            <label style={S.label}>Description</label>
            <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" as const }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <label style={S.label}>Product Image</label>
            {form.image_url && <img src={form.image_url} style={S.imgPreview} alt="preview" />}
            <div>
              <button style={S.uploadBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : "Upload Image"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
            </div>
            {form.image_url && <div style={{ marginTop: 8 }}><label style={S.label}>Image URL</label><input style={S.input} value={form.image_url ?? ""} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} /></div>}
            <div style={{ marginTop: 12 }}>
              <label style={S.toggle(form.is_trending)} onClick={() => setForm(f => ({ ...f, is_trending: !f.is_trending }))}>
                <span style={{ fontSize: 18 }}>{form.is_trending ? "⭐" : "☆"}</span> Trending
              </label>
              <label style={{ ...S.toggle(form.is_active), marginLeft: 24 }} onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
                <span style={{ fontSize: 18 }}>{form.is_active ? "✅" : "⬜"}</span> Active
              </label>
            </div>
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
