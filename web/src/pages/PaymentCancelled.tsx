import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { IoCloseCircleOutline, IoChevronBack, IoCart } from "react-icons/io5";

export function PaymentCancelled() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId") ?? "";

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <div className="flex items-center justify-center rounded-full" style={{ width: 96, height: 96, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <IoCloseCircleOutline size={52} color="rgba(255,255,255,0.35)" />
        </div>

        <div className="text-center">
          <p className="font-playfair text-3xl font-bold text-white mb-2">Payment Cancelled</p>
          <p className="font-cormorant text-lg" style={{ color: "rgba(255,255,255,0.55)" }}>
            You cancelled the payment. No charge was made.
          </p>
        </div>

        <div className="w-full rounded-2xl p-4" style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.08)" }}>
          <p className="font-inter text-sm text-white mb-1 font-semibold">Order Saved</p>
          <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            Your order is still saved in our system. You can go back to checkout and choose a different payment method or try again.
          </p>
          {orderId && (
            <p className="font-inter text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
              Order ID: #{orderId.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>

        <div className="w-full flex flex-col gap-3">
          <button onClick={() => navigate("/checkout")} className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-widest press-active flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
            <IoChevronBack size={18} />
            RETURN TO CHECKOUT
          </button>
          {orderId && (
            <button onClick={() => navigate(`/order-tracking/${orderId}`)} className="w-full py-3 rounded-2xl font-inter text-sm press-active flex items-center justify-center gap-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              <IoCart size={16} />
              View My Order
            </button>
          )}
          <button onClick={() => navigate("/")} className="w-full py-3 rounded-2xl font-inter text-sm press-active"
            style={{ background: "transparent", color: "rgba(255,255,255,0.35)" }}>
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
