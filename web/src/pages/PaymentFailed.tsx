import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { IoCloseCircle, IoRefresh, IoCart } from "react-icons/io5";
import { supabase } from "@/lib/supabase";

export function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId") ?? "";

  useEffect(() => {
    if (!orderId) return;
    supabase.from("orders").update({ payment_status: "failed" }).eq("id", orderId).then(() => {});
  }, [orderId]);

  const handleRetry = () => {
    navigate("/checkout");
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="flex items-center justify-center rounded-full" style={{ width: 96, height: 96, background: "rgba(220,53,69,0.08)", border: "1px solid rgba(220,53,69,0.25)" }}>
          <IoCloseCircle size={52} color="#DC3545" />
        </div>

        <div className="text-center">
          <p className="font-playfair text-3xl font-bold text-white mb-2">Payment Failed</p>
          <p className="font-cormorant text-lg" style={{ color: "rgba(255,255,255,0.55)" }}>
            We could not process your payment. Your order has been saved.
          </p>
        </div>

        <div className="w-full rounded-2xl p-4" style={{ background: "rgba(220,53,69,0.06)", border: "1px solid rgba(220,53,69,0.2)" }}>
          <p className="font-inter text-sm text-white mb-1 font-semibold">Don't worry</p>
          <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            Your order is saved in our system. You can retry the payment or return to your cart to make changes.
          </p>
          {orderId && (
            <p className="font-inter text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
              Order ID: #{orderId.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>

        <div className="w-full flex flex-col gap-3">
          <button onClick={handleRetry} className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #C91E8C, #9B15A0)", color: "#fff" }}>
            <IoRefresh size={18} />
            RETRY PAYMENT
          </button>
          {orderId && (
            <button onClick={() => navigate(`/order-tracking/${orderId}`)} className="w-full py-3 rounded-2xl font-inter text-sm press-active flex items-center justify-center gap-2"
              style={{ background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.2)", color: "#E4A12B" }}>
              <IoCart size={16} />
              View Order
            </button>
          )}
          <button onClick={() => navigate("/")} className="w-full py-3 rounded-2xl font-inter text-sm press-active"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
