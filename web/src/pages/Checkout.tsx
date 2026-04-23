import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoChevronBack, IoCheckmarkCircle, IoAlertCircle, IoCard, IoCash, IoBicycle, IoStorefront, IoLocationSharp, IoTime, IoPricetag, IoClose, IoSparkles } from "react-icons/io5";
import { supabase, DeliveryZone } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/context/MembershipContext";
import { authedFetch } from "@/lib/api";
import { storage } from "@/lib/storage";
import { PICKUP_LOCATION, TIERS, deliveryCutoffLabelForTier, isDeliveryAvailableForTier } from "@/lib/business";

const PENDING_ORDER_KEY = "hd_pending_payment_order_id";

type PaymentMethod = "cash_on_delivery" | "online_card";
type FulfillmentMethod = "delivery" | "pickup";

export function Checkout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const { settings } = useAppSettings();
  const { user }  = useAuth();
  const { tier } = useMembership();
  const tierCfg = TIERS[tier];

  const [zones, setZones]               = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  // Pickup locations come from the server (Bridgetown / St. George, etc.)
  // and only matter when fulfillment === "pickup".
  type PickupLoc = { id: string; slug: string; name: string; address: string };
  const [pickupLocs,    setPickupLocs]   = useState<PickupLoc[]>([]);
  const [pickupLocId,   setPickupLocId]  = useState<string>(() => storage.get("hd_saved_pickup_loc_id") ?? "");
  const [name, setName]       = useState(() => storage.get("hd_saved_name")    ?? user?.user_metadata?.full_name ?? "");
  const [phone, setPhone]     = useState(() => storage.get("hd_saved_phone")   ?? user?.user_metadata?.phone     ?? "");
  const [address, setAddress] = useState(() => storage.get("hd_saved_address") ?? storage.get("hd_profile_address") ?? "");
  const [notes, setNotes]     = useState("");
  const [ageConfirm, setAgeConfirm]   = useState(false);
  const [idConfirm, setIdConfirm]     = useState(false);
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>(
    () => (storage.get("hd_saved_fulfillment") as FulfillmentMethod) ?? "delivery"
  );
  // Pickup orders MUST be paid online — no Cash on Delivery for pickup.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    () => (storage.get("hd_saved_fulfillment") === "pickup" ? "online_card" : "cash_on_delivery")
  );

  // Force online payment whenever Pickup is active.
  useEffect(() => {
    if (fulfillment === "pickup" && paymentMethod !== "online_card") {
      setPaymentMethod("online_card");
    }
  }, [fulfillment, paymentMethod]);

  const deliveryAvailable = fulfillment === "delivery" ? isDeliveryAvailableForTier(tier) : true;

  // Coupon state — discount values come from the SERVER, never the client.
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    description: string | null;
    discount_type: "percent" | "fixed" | "free_delivery";
    coupon_discount: number;
    free_delivery: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const submittingRef = useRef(false);

  // Show cancellation notice if user came back from PayPal and cancelled
  const cancelledNotice = (location.state as { paypalCancelled?: boolean } | null)?.paypalCancelled;

  useEffect(() => {
    supabase.from("delivery_zones").select("*").eq("is_active", true)
      .then(({ data }) => { if (data) setZones(data as DeliveryZone[]); })
      .catch(() => {});
  }, []);

  // Fetch active pickup locations once. Falls back to the static
  // PICKUP_LOCATION constant if the inventory migration hasn't been applied.
  useEffect(() => {
    fetch("/api/locations").then(async (r) => {
      if (!r.ok) return;
      const d = await r.json() as { locations: PickupLoc[] };
      setPickupLocs(d.locations ?? []);
      // Default selection: the previously saved location id if it's still
      // available, otherwise the first active location.
      setPickupLocId((cur) => {
        if (cur && (d.locations ?? []).some((l) => l.id === cur)) return cur;
        return (d.locations?.[0]?.id) ?? "";
      });
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (pickupLocId) storage.set("hd_saved_pickup_loc_id", pickupLocId);
  }, [pickupLocId]);

  const selectedPickupLoc = pickupLocs.find((l) => l.id === pickupLocId) ?? null;

  const baseDeliveryFee = fulfillment === "pickup"
    ? 0
    : (selectedZone?.fee ?? (settings?.flat_fee ?? 0));
  const sym          = settings?.currency_symbol ?? "$";
  const currencyCode = settings?.currency_code ?? "USD";

  // Member discount preview (recomputed authoritatively on the server).
  const membershipDiscount = Math.round((subtotal * tierCfg.memberDiscountPct / 100) * 100) / 100;

  const couponFreeDelivery = appliedCoupon?.free_delivery ?? false;
  const couponDiscount     = appliedCoupon && !appliedCoupon.free_delivery ? Number(appliedCoupon.coupon_discount ?? 0) : 0;
  const deliveryFee        = couponFreeDelivery ? 0 : baseDeliveryFee;
  const totalDiscount      = Math.round((membershipDiscount + couponDiscount) * 100) / 100;
  const total              = Math.max(0, Math.round((subtotal - totalDiscount + deliveryFee) * 100) / 100);

  // If subtotal or tier or fulfillment changes after a coupon was applied, drop the coupon
  // so the user re-applies it against the new context (prevents stale totals).
  useEffect(() => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setCouponInput((c) => c || appliedCoupon.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, tier, fulfillment]);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCouponError("Enter a coupon code."); return; }
    setCouponError(null);
    setCouponBusy(true);
    try {
      const r = await authedFetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotal,
          delivery_fee:   baseDeliveryFee,
          customer_phone: phone.trim(),
        }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error ?? "Invalid coupon.");
      setAppliedCoupon({
        code:            data.code,
        description:     data.description ?? null,
        discount_type:   data.discount_type,
        coupon_discount: Number(data.coupon_discount ?? 0),
        free_delivery:   Boolean(data.free_delivery),
      });
    } catch (err: unknown) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : "Invalid coupon.");
    } finally {
      setCouponBusy(false);
    }
  };
  const removeCoupon = () => { setAppliedCoupon(null); setCouponError(null); setCouponInput(""); };

  const validate = (): string | null => {
    if (!name.trim())    return "Please enter your name.";
    if (!phone.trim())   return "Please enter your phone number.";
    if (fulfillment === "delivery" && !address.trim()) return "Please enter your delivery address.";
    if (fulfillment === "delivery" && !deliveryAvailable) {
      return `Delivery is closed for today (your cutoff: ${deliveryCutoffLabelForTier(tier)}). Please choose Pick Up or order again tomorrow.`;
    }
    if (fulfillment === "pickup" && paymentMethod !== "online_card") {
      return "Pickup orders must be paid online.";
    }
    if (fulfillment === "pickup" && pickupLocs.length > 0 && !pickupLocId) {
      return "Please choose a pickup location.";
    }
    if (!ageConfirm)     return "You must confirm you are 18+ years old.";
    if (!idConfirm)      return "You must confirm you have valid ID.";
    if (items.length === 0) return "Your cart is empty.";
    return null;
  };

  // Server-authoritative order creation. The server reads product prices from
  // the database — totals here are only for UI display and are NEVER trusted
  // by the backend.
  const createOrder = async (method: PaymentMethod): Promise<{ orderId: string; total: number; currencyCode: string }> => {
    const apiRes = await authedFetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((it) => ({ product_id: it.product.id, quantity: it.quantity })),
        customer_name:      name.trim(),
        customer_phone:     phone.trim(),
        delivery_address:   fulfillment === "delivery" ? address.trim() : "",
        delivery_notes:     notes.trim() || null,
        zone_id:            fulfillment === "delivery" ? (selectedZone?.id ?? null) : null,
        payment_method:     method,
        fulfillment_method: fulfillment,
        // Send both: address label (legacy column) AND the FK so the server
        // can scope orders to the correct location and decrement stock.
        pickup_location:    fulfillment === "pickup" ? (selectedPickupLoc?.address ?? PICKUP_LOCATION) : null,
        pickup_location_id: fulfillment === "pickup" ? (pickupLocId || null) : null,
        coupon_code:        appliedCoupon?.code ?? null,
      }),
    });
    if (!apiRes.ok) {
      const err = await apiRes.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
      throw new Error(err.error ?? `Order creation failed (${apiRes.status})`);
    }
    return apiRes.json() as Promise<{ orderId: string; total: number; currencyCode: string }>;
  };

  const handlePlaceOrder = async () => {
    if (submittingRef.current) return;
    const validationError = validate();
    if (validationError) return setError(validationError);
    setError(null);
    submittingRef.current = true;
    setLoading(true);

    storage.set("hd_saved_name",        name.trim());
    storage.set("hd_saved_phone",       phone.trim());
    storage.set("hd_saved_address",     address.trim());
    storage.set("hd_saved_fulfillment", fulfillment);

    try {
      const order = await createOrder(paymentMethod);

      if (paymentMethod === "cash_on_delivery") {
        clearCart();
        submittingRef.current = false;
        setLoading(false);
        navigate(`/order-tracking/${order.orderId}`);
        return;
      }

      // ── PayPal online payment ──────────────────────────────────────────────
      // Ask the backend to create a PayPal order. We send ONLY the order id
      // and origin — the backend reads the authoritative amount from the DB.
      const apiRes = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
          origin:  window.location.origin,
        }),
      });

      if (!apiRes.ok) {
        const err = await apiRes.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(err.error ?? `PayPal API error (${apiRes.status})`);
      }

      const { approvalUrl } = await apiRes.json() as { paypalOrderId: string; approvalUrl: string };

      // Save the Supabase order ID so PaymentSuccess can navigate to tracking
      localStorage.setItem(PENDING_ORDER_KEY, order.orderId);
      clearCart();

      // 3. Redirect to PayPal — keep loading=true, we're leaving the page
      window.location.href = approvalUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      submittingRef.current = false;
      setLoading(false);
      setError(msg);
    }
  };

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: "#09090C" }}>
        <p className="font-inter text-white mb-4">Your cart is empty</p>
        <button onClick={() => navigate("/")}
          className="px-6 py-3 rounded-2xl font-inter font-bold text-sm press-active"
          style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
          Go Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", background: "rgba(9,9,12,0.98)", borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
        <button onClick={() => navigate(-1)}
          className="flex items-center justify-center rounded-full press-active"
          style={{ width: 36, height: 36, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.15)" }}>
          <IoChevronBack size={20} color="#E4A12B" />
        </button>
        <p className="font-playfair text-white font-bold text-xl">Checkout</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-5" style={{ paddingBottom: 100 }}>

        {/* PayPal cancellation notice */}
        {cancelledNotice && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.25)" }}>
            <IoAlertCircle size={16} color="#E4A12B" />
            <span className="font-inter text-sm" style={{ color: "#E4A12B" }}>Payment was cancelled. You can try again or choose Cash on Delivery.</span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.3)" }}>
            <IoAlertCircle size={16} color="#DC3545" />
            <span className="font-inter text-sm" style={{ color: "#DC3545" }}>{error}</span>
          </div>
        )}

        {/* Fulfillment Method (Delivery / Pickup) */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#E4A12B" }}>How would you like it?</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "delivery" as const, label: "Delivery", sub: "Bring it to me",   Icon: IoBicycle    },
              { key: "pickup"   as const, label: "Pick Up",  sub: "I'll come get it", Icon: IoStorefront },
            ]).map(({ key, label, sub, Icon }) => {
              const active = fulfillment === key;
              return (
                <button key={key} onClick={() => setFulfillment(key)}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 press-active"
                  style={{
                    background: active ? "rgba(228,161,43,0.1)" : "rgba(255,255,255,0.03)",
                    border: `1.5px solid ${active ? "rgba(228,161,43,0.5)" : "rgba(255,255,255,0.08)"}`,
                    transition: "all 0.2s",
                  }}>
                  <Icon size={22} color={active ? "#E4A12B" : "rgba(255,255,255,0.4)"} />
                  <span className="font-inter text-sm font-semibold" style={{ color: active ? "#fff" : "rgba(255,255,255,0.6)" }}>{label}</span>
                  <span className="font-inter text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{sub}</span>
                </button>
              );
            })}
          </div>

          {/* Pickup location picker — fetched from /api/locations */}
          {fulfillment === "pickup" && (
            <div className="mt-3">
              <p className="font-inter text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                Choose a Pickup Location
              </p>
              {pickupLocs.length === 0 ? (
                <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(228,161,43,0.06)", border: "1px solid rgba(228,161,43,0.2)" }}>
                  <IoLocationSharp size={16} color="#E4A12B" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p className="font-inter text-sm text-white">{PICKUP_LOCATION}</p>
                    <p className="font-inter text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Pickup orders must be paid online.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {pickupLocs.map((loc) => {
                    const active = pickupLocId === loc.id;
                    return (
                      <button key={loc.id} onClick={() => setPickupLocId(loc.id)}
                        className="flex items-start gap-2 p-3 rounded-xl press-active text-left"
                        style={{
                          background: active ? "rgba(228,161,43,0.1)" : "rgba(255,255,255,0.03)",
                          border: `1.5px solid ${active ? "rgba(228,161,43,0.5)" : "rgba(255,255,255,0.08)"}`,
                          transition: "all 0.2s",
                        }}>
                        <IoLocationSharp size={16} color={active ? "#E4A12B" : "rgba(255,255,255,0.4)"} style={{ marginTop: 2, flexShrink: 0 }} />
                        <div className="min-w-0">
                          <p className="font-inter text-sm font-semibold" style={{ color: active ? "#fff" : "rgba(255,255,255,0.85)" }}>
                            {loc.name}
                          </p>
                          <p className="font-inter text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                            {loc.address}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  <p className="font-inter text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Pickup orders must be paid online. We'll text you when your order is ready.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Delivery cutoff notice */}
          {fulfillment === "delivery" && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl"
              style={{
                background: deliveryAvailable ? "rgba(76,175,80,0.06)" : "rgba(220,53,69,0.08)",
                border:     `1px solid ${deliveryAvailable ? "rgba(76,175,80,0.25)" : "rgba(220,53,69,0.3)"}`,
              }}>
              <IoTime size={16} color={deliveryAvailable ? "#4CAF50" : "#DC3545"} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <p className="font-inter text-xs font-semibold" style={{ color: deliveryAvailable ? "#4CAF50" : "#DC3545" }}>
                  {deliveryAvailable ? `Delivery available until ${deliveryCutoffLabelForTier(tier)} (${tierCfg.label})` : `Delivery closed for today`}
                </p>
                <p className="font-inter text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {deliveryAvailable
                    ? `Place your order before ${deliveryCutoffLabelForTier(tier)} to receive it tonight.`
                    : `Please choose Pick Up to order now, or come back tomorrow for delivery.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Customer / Delivery details */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-4" style={{ color: "#E4A12B" }}>
            {fulfillment === "pickup" ? "Your Details" : "Delivery Details"}
          </p>
          {([
            { label: "Full Name",        value: name,    onChange: setName,    placeholder: "Your full name",       type: "text", show: true },
            { label: "Phone Number",     value: phone,   onChange: setPhone,   placeholder: "+1 555 000 0000",      type: "tel",  show: true },
            { label: "Delivery Address", value: address, onChange: setAddress, placeholder: "Street address, city", type: "text", show: fulfillment === "delivery" },
          ]).filter((f) => f.show).map(({ label, value, onChange, placeholder, type }) => (
            <div key={label} className="mb-4">
              <label className="font-inter text-xs mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</label>
              <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                className="w-full rounded-xl px-4 font-inter text-sm text-white"
                style={{ background: "rgba(20,20,28,0.7)", border: "1px solid rgba(228,161,43,0.15)", height: 46 }} />
            </div>
          ))}
          <div>
            <label className="font-inter text-xs mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
              {fulfillment === "pickup" ? "Notes for us (optional)" : "Delivery Notes (optional)"}
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={fulfillment === "pickup" ? "Anything we should know..." : "Special instructions..."}
              className="w-full rounded-xl px-4 py-3 font-inter text-sm text-white resize-none"
              style={{ background: "rgba(20,20,28,0.7)", border: "1px solid rgba(228,161,43,0.15)", height: 80 }} />
          </div>
        </div>

        {/* Delivery Zone — hidden for pickup */}
        {fulfillment === "delivery" && zones.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
            <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#E4A12B" }}>Delivery Zone</p>
            <div className="flex flex-col gap-2">
              {zones.map((zone) => (
                <button key={zone.id} onClick={() => setSelectedZone(zone)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 press-active"
                  style={{ background: selectedZone?.id === zone.id ? "rgba(228,161,43,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${selectedZone?.id === zone.id ? "rgba(228,161,43,0.4)" : "rgba(255,255,255,0.08)"}` }}>
                  <span className="font-inter text-sm text-white">{zone.name}</span>
                  <span className="font-inter text-sm font-bold" style={{ color: selectedZone?.id === zone.id ? "#E4A12B" : "rgba(255,255,255,0.5)" }}>{sym}{zone.fee.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#E4A12B" }}>Order Summary</p>
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex justify-between mb-2">
              <span className="font-inter text-sm text-white">{product.name} ×{quantity}</span>
              <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{sym}{((product.price ?? 0) * quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ height: 1, background: "rgba(228,161,43,0.1)", margin: "12px 0" }} />
          <div className="flex justify-between mb-2">
            <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Subtotal</span>
            <span className="font-inter text-sm text-white">{sym}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
              {fulfillment === "pickup" ? "Pickup" : "Delivery"}
            </span>
            <span className="font-inter text-sm text-white">
              {fulfillment === "pickup"
                ? "FREE"
                : (selectedZone || (settings?.flat_fee ?? 0) > 0)
                  ? `${sym}${deliveryFee.toFixed(2)}`
                  : "Select zone"}
            </span>
          </div>
          {membershipDiscount > 0 && (
            <div className="flex justify-between mb-2">
              <span className="font-inter text-sm flex items-center gap-1" style={{ color: tierCfg.accent }}>
                <IoSparkles size={13} /> {tierCfg.label} member ({tierCfg.memberDiscountPct}% off)
              </span>
              <span className="font-inter text-sm font-semibold" style={{ color: tierCfg.accent }}>−{sym}{membershipDiscount.toFixed(2)}</span>
            </div>
          )}
          {appliedCoupon && (
            <div className="flex justify-between mb-2">
              <span className="font-inter text-sm flex items-center gap-1" style={{ color: "#4CAF50" }}>
                <IoPricetag size={13} /> {appliedCoupon.code}
                {appliedCoupon.free_delivery && <span className="text-[10px] opacity-80"> (free delivery)</span>}
              </span>
              <span className="font-inter text-sm font-semibold" style={{ color: "#4CAF50" }}>
                {appliedCoupon.free_delivery ? `−${sym}${baseDeliveryFee.toFixed(2)}` : `−${sym}${couponDiscount.toFixed(2)}`}
              </span>
            </div>
          )}
          <div className="flex justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(228,161,43,0.1)" }}>
            <span className="font-inter font-bold text-white">Total</span>
            <span className="font-inter font-bold text-xl" style={{ color: "#E4A12B" }}>{sym}{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Coupon */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: "#E4A12B" }}>
            <IoPricetag size={12} /> Promo / Coupon
          </p>
          {appliedCoupon ? (
            <div className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: "rgba(76,175,80,0.08)", border: "1px solid rgba(76,175,80,0.3)" }}>
              <div className="flex flex-col min-w-0">
                <span className="font-inter font-bold text-sm" style={{ color: "#4CAF50" }}>{appliedCoupon.code} applied</span>
                {appliedCoupon.description && (
                  <span className="font-inter text-[11px] truncate" style={{ color: "rgba(255,255,255,0.55)" }}>{appliedCoupon.description}</span>
                )}
              </div>
              <button onClick={removeCoupon} type="button"
                className="flex items-center justify-center rounded-full press-active flex-shrink-0 ml-2"
                style={{ width: 28, height: 28, background: "rgba(255,255,255,0.06)" }}>
                <IoClose size={14} color="rgba(255,255,255,0.7)" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-2.5 rounded-xl font-inter text-sm tracking-wide"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(228,161,43,0.15)", color: "#fff", outline: "none" }}
                />
                <button onClick={applyCoupon} type="button" disabled={couponBusy || !couponInput.trim()}
                  className="px-4 rounded-xl font-inter font-bold text-sm press-active"
                  style={{
                    background: couponBusy || !couponInput.trim() ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #E4A12B, #C88A1F)",
                    color: couponBusy || !couponInput.trim() ? "rgba(255,255,255,0.4)" : "#09090C",
                    cursor: couponBusy || !couponInput.trim() ? "default" : "pointer",
                  }}>
                  {couponBusy ? "…" : "Apply"}
                </button>
              </div>
              {couponError && (
                <p className="font-inter text-[11px] mt-2 flex items-center gap-1" style={{ color: "#DC3545" }}>
                  <IoAlertCircle size={12} /> {couponError}
                </p>
              )}
            </>
          )}
        </div>

        {/* Age / ID confirmations */}
        {[
          { val: ageConfirm, set: setAgeConfirm, label: "I confirm I am 18+ years of age" },
          { val: idConfirm,  set: setIdConfirm,  label: "I confirm I have valid government-issued ID" },
        ].map(({ val, set, label }) => (
          <button key={label} onClick={() => set((v) => !v)} className="flex items-center gap-3 press-active">
            <div className="flex items-center justify-center rounded-full flex-shrink-0"
              style={{ width: 24, height: 24, background: val ? "linear-gradient(135deg, #D4901A, #F5C842)" : "rgba(255,255,255,0.06)", border: `1px solid ${val ? "transparent" : "rgba(255,255,255,0.2)"}` }}>
              {val && <IoCheckmarkCircle size={16} color="#09090C" />}
            </div>
            <span className="font-inter text-sm text-left" style={{ color: val ? "#E4A12B" : "rgba(255,255,255,0.55)" }}>{label}</span>
          </button>
        ))}

        {/* Payment Method */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#E4A12B" }}>
            Payment Method{fulfillment === "pickup" ? " · Online Only" : ""}
          </p>
          <div className="flex flex-col gap-3">

            {/* Cash on Delivery — hidden for pickup orders */}
            {fulfillment === "delivery" && (
            <button onClick={() => setPaymentMethod("cash_on_delivery")}
              className="flex items-center gap-4 rounded-xl p-4 press-active text-left"
              style={{ background: paymentMethod === "cash_on_delivery" ? "rgba(228,161,43,0.08)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${paymentMethod === "cash_on_delivery" ? "rgba(228,161,43,0.5)" : "rgba(255,255,255,0.08)"}`, transition: "all 0.2s" }}>
              <div className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 40, height: 40, background: paymentMethod === "cash_on_delivery" ? "rgba(228,161,43,0.15)" : "rgba(255,255,255,0.05)" }}>
                <IoCash size={20} color={paymentMethod === "cash_on_delivery" ? "#E4A12B" : "rgba(255,255,255,0.4)"} />
              </div>
              <div className="flex-1">
                <p className="font-inter text-sm font-semibold" style={{ color: paymentMethod === "cash_on_delivery" ? "#fff" : "rgba(255,255,255,0.6)" }}>Cash on Delivery</p>
                <p className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Pay when your order arrives</p>
              </div>
              <div className="flex-shrink-0 rounded-full"
                style={{ width: 18, height: 18, border: `2px solid ${paymentMethod === "cash_on_delivery" ? "#E4A12B" : "rgba(255,255,255,0.2)"}`, background: paymentMethod === "cash_on_delivery" ? "#E4A12B" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {paymentMethod === "cash_on_delivery" && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#09090C" }} />}
              </div>
            </button>
            )}

            {/* Pay Online — PayPal */}
            <button onClick={() => setPaymentMethod("online_card")}
              className="flex items-center gap-4 rounded-xl p-4 press-active text-left"
              style={{ background: paymentMethod === "online_card" ? "rgba(0,112,186,0.08)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${paymentMethod === "online_card" ? "rgba(0,112,186,0.45)" : "rgba(255,255,255,0.08)"}`, transition: "all 0.2s" }}>
              <div className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width: 40, height: 40, background: paymentMethod === "online_card" ? "rgba(0,112,186,0.12)" : "rgba(255,255,255,0.05)" }}>
                <IoCard size={20} color={paymentMethod === "online_card" ? "#0070BA" : "rgba(255,255,255,0.4)"} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-inter text-sm font-semibold" style={{ color: paymentMethod === "online_card" ? "#fff" : "rgba(255,255,255,0.6)" }}>Pay Online</p>
                  {/* PayPal wordmark badge */}
                  <span className="font-inter font-bold rounded-full px-2 py-0.5"
                    style={{ background: "rgba(0,112,186,0.15)", border: "1px solid rgba(0,112,186,0.35)", color: "#0070BA", fontSize: 9, letterSpacing: "0.04em" }}>
                    PAYPAL
                  </span>
                  <span className="font-inter font-bold rounded-full px-2 py-0.5"
                    style={{ background: "rgba(76,175,80,0.12)", border: "1px solid rgba(76,175,80,0.25)", color: "#4CAF50", fontSize: 9 }}>
                    SECURE
                  </span>
                </div>
                <p className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Credit / Debit card via PayPal</p>
              </div>
              <div className="flex-shrink-0 rounded-full"
                style={{ width: 18, height: 18, border: `2px solid ${paymentMethod === "online_card" ? "#0070BA" : "rgba(255,255,255,0.2)"}`, background: paymentMethod === "online_card" ? "#0070BA" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {paymentMethod === "online_card" && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
              </div>
            </button>
          </div>

          {/* PayPal info note */}
          {paymentMethod === "online_card" && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl" style={{ background: "rgba(0,112,186,0.06)", border: "1px solid rgba(0,112,186,0.2)" }}>
              <span className="text-sm" style={{ marginTop: 1 }}>🔒</span>
              <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                You'll be redirected to PayPal's secure hosted page. Pay with your PayPal account or any credit/debit card. Your card details are never stored by us.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Place order / Pay with PayPal button */}
      <div className="flex-shrink-0 px-4 pt-2"
        style={{ background: "rgba(9,9,12,0.98)", borderTop: "1px solid rgba(228,161,43,0.1)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        <button onClick={handlePlaceOrder} disabled={loading}
          className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active"
          style={{
            background: loading
              ? "rgba(228,161,43,0.3)"
              : paymentMethod === "online_card"
              ? "linear-gradient(135deg, #003087, #0070BA)"
              : "linear-gradient(135deg, #D4901A, #F5C842)",
            color: "#fff",
            opacity: loading ? 0.7 : 1,
          }}>
          {loading
            ? (paymentMethod === "online_card" ? "Connecting to PayPal..." : "Placing Order...")
            : paymentMethod === "online_card"
            ? `PAY WITH PAYPAL · ${sym}${total.toFixed(2)}`
            : `PLACE ORDER · ${sym}${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
