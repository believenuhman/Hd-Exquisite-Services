import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronBack, IoCheckmarkCircle, IoAlertCircle } from "react-icons/io5";
import { supabase, DeliveryZone } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";

export function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { settings } = useAppSettings();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [ageConfirm, setAgeConfirm] = useState(false);
  const [idConfirm, setIdConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("delivery_zones").select("*").eq("is_active", true)
      .then(({ data }) => { if (data) setZones(data as DeliveryZone[]); });
  }, []);

  const deliveryFee = selectedZone?.fee ?? (settings?.flat_fee ?? 0);
  const total = subtotal + deliveryFee;
  const sym = settings?.currency_symbol ?? "$";

  const handlePlaceOrder = async () => {
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (!phone.trim()) return setError("Please enter your phone number.");
    if (!address.trim()) return setError("Please enter your delivery address.");
    if (!ageConfirm) return setError("You must confirm you are 18+ years old.");
    if (!idConfirm) return setError("You must confirm you have valid ID.");
    if (items.length === 0) return setError("Your cart is empty.");
    setLoading(true);

    const { data: order, error: orderErr } = await supabase.from("orders").insert({
      customer_name: name,
      customer_phone: phone,
      delivery_address: address,
      delivery_notes: notes || null,
      age_confirmed: true,
      status: "received",
      subtotal,
      delivery_fee: deliveryFee,
      total,
      currency_code: settings?.currency_code ?? "USD",
      currency_symbol: sym,
      zone_id: selectedZone?.id ?? null,
    }).select().single();

    if (orderErr) { setLoading(false); return setError("Failed to place order: " + orderErr.message); }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      name: item.product.name,
      qty: item.quantity,
      unit_price: item.product.price,
    }));

    await supabase.from("order_items").insert(orderItems);
    clearCart();
    setLoading(false);
    navigate(`/order-tracking/${order.id}`);
  };

  if (items.length === 0 && !success) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: "#09090C" }}>
        <p className="font-inter text-white mb-4">Your cart is empty</p>
        <button onClick={() => navigate("/")} className="px-6 py-3 rounded-2xl font-inter font-bold text-sm press-active" style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>Go Shopping</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", background: "rgba(9,9,12,0.98)", borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
        <button onClick={() => navigate(-1)} className="flex items-center justify-center rounded-full press-active"
          style={{ width: 36, height: 36, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.15)" }}>
          <IoChevronBack size={20} color="#E4A12B" />
        </button>
        <p className="font-playfair text-white font-bold text-xl">Checkout</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-5" style={{ paddingBottom: 100 }}>
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.3)" }}>
            <IoAlertCircle size={16} color="#DC3545" />
            <span className="font-inter text-sm" style={{ color: "#DC3545" }}>{error}</span>
          </div>
        )}

        {/* Delivery details */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-4" style={{ color: "#E4A12B" }}>Delivery Details</p>
          {[
            { label: "Full Name", value: name, onChange: setName, placeholder: "Your full name", type: "text" },
            { label: "Phone Number", value: phone, onChange: setPhone, placeholder: "+1 555 000 0000", type: "tel" },
            { label: "Delivery Address", value: address, onChange: setAddress, placeholder: "Street address, city", type: "text" },
          ].map(({ label, value, onChange, placeholder, type }) => (
            <div key={label} className="mb-4">
              <label className="font-inter text-xs mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
              <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                className="w-full rounded-xl px-4 font-inter text-sm text-white"
                style={{ background: "rgba(20,20,28,0.7)", border: "1px solid rgba(228,161,43,0.15)", height: 46 }} />
            </div>
          ))}
          <div>
            <label className="font-inter text-xs mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>Delivery Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions..."
              className="w-full rounded-xl px-4 py-3 font-inter text-sm text-white resize-none"
              style={{ background: "rgba(20,20,28,0.7)", border: "1px solid rgba(228,161,43,0.15)", height: 80 }} />
          </div>
        </div>

        {/* Delivery Zone */}
        {zones.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
            <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#E4A12B" }}>Delivery Zone</p>
            <div className="flex flex-col gap-2">
              {zones.map((zone) => (
                <button key={zone.id} onClick={() => setSelectedZone(zone)} className="flex items-center justify-between rounded-xl px-4 py-3 press-active"
                  style={{ background: selectedZone?.id === zone.id ? "rgba(228,161,43,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${selectedZone?.id === zone.id ? "rgba(228,161,43,0.4)" : "rgba(255,255,255,0.08)"}` }}>
                  <span className="font-inter text-sm text-white">{zone.name}</span>
                  <span className="font-inter text-sm font-bold" style={{ color: selectedZone?.id === zone.id ? "#E4A12B" : "rgba(255,255,255,0.5)" }}>{sym}{zone.fee.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Order summary */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#E4A12B" }}>Order Summary</p>
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex justify-between mb-2">
              <span className="font-inter text-sm text-white">{product.name} ×{quantity}</span>
              <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{sym}{(product.price * quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ height: 1, background: "rgba(228,161,43,0.1)", margin: "12px 0" }} />
          <div className="flex justify-between mb-2">
            <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Subtotal</span>
            <span className="font-inter text-sm text-white">{sym}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Delivery</span>
            <span className="font-inter text-sm text-white">{selectedZone ? `${sym}${deliveryFee.toFixed(2)}` : "Select zone"}</span>
          </div>
          <div className="flex justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(228,161,43,0.1)" }}>
            <span className="font-inter font-bold text-white">Total</span>
            <span className="font-inter font-bold text-xl" style={{ color: "#E4A12B" }}>{sym}{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Confirmations */}
        {[
          { val: ageConfirm, set: setAgeConfirm, label: "I confirm I am 18+ years of age" },
          { val: idConfirm, set: setIdConfirm, label: "I confirm I have valid government-issued ID" },
        ].map(({ val, set, label }) => (
          <button key={label} onClick={() => set((v) => !v)} className="flex items-center gap-3 press-active">
            <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 24, height: 24, background: val ? "linear-gradient(135deg, #D4901A, #F5C842)" : "rgba(255,255,255,0.06)", border: `1px solid ${val ? "transparent" : "rgba(255,255,255,0.2)"}` }}>
              {val && <IoCheckmarkCircle size={16} color="#09090C" />}
            </div>
            <span className="font-inter text-sm text-left" style={{ color: val ? "#E4A12B" : "rgba(255,255,255,0.55)" }}>{label}</span>
          </button>
        ))}

        {/* Payment */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#E4A12B" }}>Payment Method</p>
          <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(228,161,43,0.06)", border: "1px solid rgba(228,161,43,0.2)" }}>
            <span style={{ fontSize: 20 }}>💵</span>
            <div>
              <p className="font-inter text-sm font-semibold text-white">Cash on Delivery</p>
              <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Pay when your order arrives</p>
            </div>
          </div>
        </div>
      </div>

      {/* Place order button */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2" style={{ background: "rgba(9,9,12,0.98)", borderTop: "1px solid rgba(228,161,43,0.1)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        <button onClick={handlePlaceOrder} disabled={loading} className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active"
          style={{ background: loading ? "rgba(228,161,43,0.3)" : "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
          {loading ? "Placing Order..." : `PLACE ORDER · ${sym}${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
