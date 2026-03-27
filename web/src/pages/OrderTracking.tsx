import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack, IoHome, IoCheckmarkCircle, IoTime, IoAlertCircle, IoCard, IoCash } from "react-icons/io5";
import { supabase, Order, OrderItem } from "@/lib/supabase";

const STEPS: { key: Order["status"]; label: string; sub: string; icon: string }[] = [
  { key: "received", label: "Order Received", sub: "We got your order", icon: "📋" },
  { key: "packing", label: "Packing", sub: "Your order is being packed", icon: "📦" },
  { key: "out_for_delivery", label: "Out for Delivery", sub: "Driver on the way", icon: "🚗" },
  { key: "delivered", label: "Delivered", sub: "Enjoy your order!", icon: "🎉" },
];

const ORDER_IDX: Record<string, number> = { received: 0, packing: 1, out_for_delivery: 2, delivered: 3, refused: -1 };

export function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("orders").select("*").eq("id", id).single(),
      supabase.from("order_items").select("*").eq("order_id", id),
    ]).then(([{ data: o }, { data: oi }]) => {
      if (o) setOrder(o as Order);
      if (oi) setOrderItems(oi as OrderItem[]);
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#09090C" }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(228,161,43,0.2)", borderTopColor: "#E4A12B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!order) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#09090C" }}>
      <p className="font-inter text-white">Order not found</p>
    </div>
  );

  const currentIdx = ORDER_IDX[order.status] ?? 0;
  const isRefused = order.status === "refused";

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", background: "rgba(9,9,12,0.98)", borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
        <button onClick={() => navigate(-1)} className="flex items-center justify-center rounded-full press-active"
          style={{ width: 36, height: 36, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.15)" }}>
          <IoChevronBack size={20} color="#E4A12B" />
        </button>
        <p className="font-playfair text-white font-bold text-lg">Track Order</p>
        <button onClick={() => navigate("/")} className="flex items-center justify-center rounded-full press-active"
          style={{ width: 36, height: 36, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.15)" }}>
          <IoHome size={18} color="#E4A12B" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-4" style={{ paddingBottom: 80 }}>
        {/* Order ID card */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(228,161,43,0.08), rgba(201,30,140,0.05))", border: "1px solid rgba(228,161,43,0.15)" }}>
          <p className="font-inter text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Order ID</p>
          <p className="font-inter font-bold text-white tracking-wider">#{order.id.toUpperCase()}</p>
          <p className="font-inter text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
            {new Date(order.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Payment method badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: order.payment_method === "online_card" ? "rgba(201,30,140,0.12)" : "rgba(228,161,43,0.1)", border: `1px solid ${order.payment_method === "online_card" ? "rgba(201,30,140,0.3)" : "rgba(228,161,43,0.25)"}` }}>
              {order.payment_method === "online_card"
                ? <IoCard size={11} color="#C91E8C" />
                : <IoCash size={11} color="#E4A12B" />}
              <span className="font-inter text-xs font-semibold" style={{ color: order.payment_method === "online_card" ? "#C91E8C" : "#E4A12B" }}>
                {order.payment_method === "online_card" ? "Paid Online" : "Cash on Delivery"}
              </span>
            </div>
            {/* Payment status badge */}
            {order.payment_status && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{
                background: order.payment_status === "paid" ? "rgba(76,175,80,0.1)" : order.payment_status === "failed" ? "rgba(220,53,69,0.1)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${order.payment_status === "paid" ? "rgba(76,175,80,0.3)" : order.payment_status === "failed" ? "rgba(220,53,69,0.3)" : "rgba(255,255,255,0.12)"}`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: order.payment_status === "paid" ? "#4CAF50" : order.payment_status === "failed" ? "#DC3545" : "rgba(255,255,255,0.3)" }} />
                <span className="font-inter text-xs font-semibold capitalize" style={{ color: order.payment_status === "paid" ? "#4CAF50" : order.payment_status === "failed" ? "#DC3545" : "rgba(255,255,255,0.4)" }}>
                  {order.payment_status === "paid" ? "Paid" : order.payment_status === "failed" ? "Payment Failed" : order.payment_status === "pending" ? "Awaiting Payment" : order.payment_status}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Refused state */}
        {isRefused ? (
          <div className="rounded-2xl p-5 flex flex-col items-center text-center" style={{ background: "rgba(220,53,69,0.08)", border: "1px solid rgba(220,53,69,0.2)" }}>
            <IoAlertCircle size={36} color="#DC3545" />
            <p className="font-inter font-bold text-white text-lg mt-3 mb-2">Order Refused</p>
            <p className="font-cormorant text-base" style={{ color: "rgba(255,255,255,0.55)" }}>
              {order.refusal_reason ?? "Your order could not be fulfilled at this time."}
            </p>
          </div>
        ) : (
          /* Timeline */
          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
            <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-4" style={{ color: "#E4A12B" }}>Order Status</p>
            {STEPS.map((step, i) => {
              const done = currentIdx >= i;
              const active = currentIdx === i;
              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center rounded-full"
                      style={{ width: 36, height: 36, background: done ? "linear-gradient(135deg, #D4901A, #F5C842)" : "rgba(255,255,255,0.06)", border: `1px solid ${done ? "transparent" : "rgba(255,255,255,0.12)"}`, flexShrink: 0 }}>
                      {done ? <IoCheckmarkCircle size={18} color="#09090C" /> : <span style={{ fontSize: 16 }}>{step.icon}</span>}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ width: 2, height: 32, background: currentIdx > i ? "rgba(228,161,43,0.5)" : "rgba(255,255,255,0.08)", margin: "4px 0" }} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="font-inter text-sm font-semibold" style={{ color: done ? "#E4A12B" : "rgba(255,255,255,0.35)" }}>{step.label}</p>
                    <p className="font-inter text-xs mt-0.5" style={{ color: done ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)" }}>{step.sub}</p>
                    {active && <div className="mt-1 px-2 py-0.5 rounded-full inline-block" style={{ background: "rgba(228,161,43,0.12)" }}>
                      <span className="font-inter text-xs" style={{ color: "#E4A12B" }}>● Current</span>
                    </div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Order items */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#E4A12B" }}>Order Items</p>
          {orderItems.map((item, i) => (
            <React.Fragment key={item.id}>
              <div className="flex justify-between py-2">
                <span className="font-inter text-sm text-white">{item.name} ×{item.qty}</span>
                <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{order.currency_symbol}{(item.unit_price * item.qty).toFixed(2)}</span>
              </div>
              {i < orderItems.length - 1 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />}
            </React.Fragment>
          ))}
          <div style={{ height: 1, background: "rgba(228,161,43,0.1)", margin: "12px 0 8px" }} />
          <div className="flex justify-between py-1">
            <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Subtotal</span>
            <span className="font-inter text-sm text-white">{order.currency_symbol}{order.subtotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Delivery</span>
            <span className="font-inter text-sm text-white">{order.currency_symbol}{order.delivery_fee?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 mt-1" style={{ borderTop: "1px solid rgba(228,161,43,0.1)" }}>
            <span className="font-inter font-bold text-white">Total</span>
            <span className="font-inter font-bold text-lg" style={{ color: "#E4A12B" }}>{order.currency_symbol}{order.total?.toFixed(2)}</span>
          </div>
        </div>

        {/* Delivery info */}
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
          <p className="font-inter font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: "#E4A12B" }}>Delivery Info</p>
          {[
            { label: "Name", value: order.customer_name },
            { label: "Phone", value: order.customer_phone },
            { label: "Address", value: order.delivery_address },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
              <span className="font-inter text-xs text-right text-white flex-1 ml-4">{value}</span>
            </div>
          ))}
        </div>

        <button onClick={() => navigate("/")} className="w-full py-4 rounded-2xl font-inter font-bold text-sm press-active"
          style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
