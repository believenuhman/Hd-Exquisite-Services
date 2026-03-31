import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronForward } from "react-icons/io5";
import { supabase, Order } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { storage } from "@/lib/storage";

const STATUS_LABELS: Record<string, string> = {
  received: "Order Received",
  packing: "Packing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  refused: "Refused",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  received: { bg: "rgba(228,161,43,0.12)", text: "#E4A12B" },
  packing: { bg: "rgba(201,30,140,0.12)", text: "#C91E8C" },
  out_for_delivery: { bg: "rgba(13,110,253,0.12)", text: "#4A9EFF" },
  delivered: { bg: "rgba(40,167,69,0.12)", text: "#28A745" },
  refused: { bg: "rgba(220,53,69,0.12)", text: "#DC3545" },
};

export function Orders() {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user || isGuest) {
      // Use the phone number from user metadata or localStorage to scope orders to this user
      const savedPhone =
        user?.user_metadata?.phone ||
        storage.get("hd_saved_phone") ||
        "";

      if (savedPhone) {
        supabase
          .from("orders")
          .select("*")
          .eq("customer_phone", savedPhone.trim())
          .order("created_at", { ascending: false })
          .then(({ data }) => {
            if (data) setOrders(data as Order[]);
            setLoading(false);
          });
      } else {
        // No phone available — fall back to fetching without filter
        // (Supabase RLS should restrict results to the authenticated user's rows)
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .then(({ data }) => {
            if (data) setOrders(data as Order[]);
            setLoading(false);
          });
      }
    } else {
      setLoading(false);
    }
  }, [user, isGuest]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", background: "rgba(9,9,12,0.98)", borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
        <p className="font-playfair text-white font-bold text-2xl">My Orders</p>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4" style={{ paddingBottom: 90 }}>
        {!user && !isGuest ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span style={{ fontSize: 40 }}>🔐</span>
            <p className="font-inter text-white font-semibold">Sign in to view orders</p>
            <p className="font-cormorant text-base text-center" style={{ color: "rgba(255,255,255,0.45)" }}>Create an account to track your orders</p>
            <button onClick={() => navigate("/auth/welcome")} className="mt-2 px-8 py-3 rounded-2xl font-inter font-bold text-sm press-active"
              style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
              Sign In
            </button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <div style={{ width: 32, height: 32, border: "2px solid rgba(228,161,43,0.2)", borderTopColor: "#E4A12B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <span style={{ fontSize: 40 }}>📦</span>
            <p className="font-inter text-white font-semibold">No orders yet</p>
            <p className="font-cormorant text-base text-center" style={{ color: "rgba(255,255,255,0.45)" }}>Your order history will appear here</p>
            <button onClick={() => navigate("/")} className="mt-2 px-8 py-3 rounded-2xl font-inter font-bold text-sm press-active"
              style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
              Shop Now
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => {
              const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.received;
              return (
                <button key={order.id} onClick={() => navigate(`/order-tracking/${order.id}`)}
                  className="flex items-center gap-3 rounded-2xl p-4 press-active text-left w-full"
                  style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-inter text-xs font-bold text-white">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <div className="px-2 py-0.5 rounded-full" style={{ background: sc.bg }}>
                        <span className="font-inter text-xs font-semibold" style={{ color: sc.text }}>{STATUS_LABELS[order.status]}</span>
                      </div>
                    </div>
                    <p className="font-inter text-xs mb-1 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{order.delivery_address}</p>
                    <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-inter font-bold text-sm" style={{ color: "#E4A12B" }}>{order.currency_symbol}{order.total?.toFixed(2)}</span>
                    <IoChevronForward size={16} color="rgba(255,255,255,0.3)" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
