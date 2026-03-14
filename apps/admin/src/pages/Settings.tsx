import React, { useEffect, useState } from "react";
import { supabase, AppSettings } from "../lib/supabase";

const S = {
  title: { fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8 },
  sub: { color: "rgba(185,185,195,0.7)", fontFamily: "Inter,sans-serif", fontSize: 14, marginBottom: 32 },
  card: { background: "rgba(20,20,28,0.78)", border: "1px solid rgba(214,162,74,0.15)", borderRadius: 16, padding: 28, maxWidth: 560 },
  row: { display: "flex", gap: 16 },
  label: { fontFamily: "Inter,sans-serif", fontSize: 11, color: "#E8B86D", letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 5, display: "block" },
  input: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(214,162,74,0.2)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontFamily: "Inter,sans-serif", fontSize: 14, marginBottom: 18, outline: "none" },
  saveBtn: { background: "linear-gradient(90deg,#D6A24A,#F6D27A)", border: "none", borderRadius: 10, padding: "12px 28px", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#000" },
  success: { color: "#4CAF50", fontFamily: "Inter,sans-serif", fontSize: 13, marginTop: 12 },
  currencyBtns: { display: "flex", gap: 10, marginBottom: 18 },
  currencyBtn: (active: boolean): React.CSSProperties => ({
    padding: "10px 20px", borderRadius: 10, cursor: "pointer",
    fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 600,
    border: "1px solid rgba(214,162,74,0.3)",
    background: active ? "rgba(214,162,74,0.15)" : "rgba(255,255,255,0.04)",
    color: active ? "#E8B86D" : "rgba(185,185,195,0.7)",
  }),
};

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "BBD", symbol: "BDS$", label: "BBD (BDS$)" },
];

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [form, setForm] = useState({ currency_code: "USD", currency_symbol: "$", delivery_mode: "zone", flat_fee: 9.99, min_order: 0 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("*").limit(1).single().then(({ data }) => {
      if (data) {
        setSettings(data as AppSettings);
        setForm({ currency_code: data.currency_code, currency_symbol: data.currency_symbol, delivery_mode: data.delivery_mode, flat_fee: Number(data.flat_fee), min_order: Number(data.min_order) });
      }
    });
  }, []);

  const selectCurrency = (c: typeof CURRENCIES[0]) => {
    setForm(f => ({ ...f, currency_code: c.code, currency_symbol: c.symbol }));
  };

  const handleSave = async () => {
    const payload = { ...form, updated_at: new Date().toISOString() };
    if (settings?.id) {
      await supabase.from("settings").update(payload).eq("id", settings.id);
    } else {
      await supabase.from("settings").insert(payload);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div style={S.title}>Settings</div>
      <div style={S.sub}>Configure currency, delivery mode, and order minimums. Changes apply to the mobile app immediately.</div>
      <div style={S.card}>
        <label style={S.label}>Currency</label>
        <div style={S.currencyBtns}>
          {CURRENCIES.map(c => (
            <button key={c.code} style={S.currencyBtn(form.currency_code === c.code)} onClick={() => selectCurrency(c)}>
              {c.label}
            </button>
          ))}
        </div>
        <label style={S.label}>Currency Symbol (custom)</label>
        <input style={S.input} value={form.currency_symbol} onChange={e => setForm(f => ({ ...f, currency_symbol: e.target.value }))} placeholder="$" />
        <label style={S.label}>Delivery Mode</label>
        <select style={S.input} value={form.delivery_mode} onChange={e => setForm(f => ({ ...f, delivery_mode: e.target.value }))}>
          <option value="zone">Zone-based (per delivery zone)</option>
          <option value="flat">Flat rate</option>
        </select>
        {form.delivery_mode === "flat" && (
          <>
            <label style={S.label}>Flat Delivery Fee</label>
            <input style={S.input} type="number" step="0.01" value={form.flat_fee} onChange={e => setForm(f => ({ ...f, flat_fee: Number(e.target.value) }))} />
          </>
        )}
        <label style={S.label}>Minimum Order Amount</label>
        <input style={S.input} type="number" step="0.01" value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: Number(e.target.value) }))} placeholder="0 = no minimum" />
        <button style={S.saveBtn} onClick={handleSave}>Save Settings</button>
        {saved && <div style={S.success}>✓ Settings saved successfully</div>}
      </div>
    </div>
  );
}
