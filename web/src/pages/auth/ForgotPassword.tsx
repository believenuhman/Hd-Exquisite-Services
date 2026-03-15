import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronBack, IoMail, IoCheckmarkCircle } from "react-icons/io5";
import { supabase } from "@/lib/supabase";
import { GoldButton } from "@/components/GoldButton";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!email.trim()) return setError("Please enter your email.");
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  return (
    <div className="fixed inset-0 flex flex-col px-6 overflow-y-auto no-scrollbar" style={{ background: "linear-gradient(160deg, #0D0B14 0%, #09090C 50%, #100A0A 100%)", paddingTop: "env(safe-area-inset-top, 20px)", paddingBottom: "env(safe-area-inset-bottom, 20px)" }}>
      <div className="max-w-lg mx-auto w-full pt-4 pb-10">
        <button onClick={() => navigate(-1)} className="flex items-center justify-center rounded-full press-active mb-8"
          style={{ width: 40, height: 40, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.15)" }}>
          <IoChevronBack size={22} color="#E4A12B" />
        </button>

        {!sent ? (
          <>
            <h1 className="font-playfair text-white font-bold text-3xl mb-2">Reset Password</h1>
            <p className="font-cormorant text-base mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>Enter your email to receive a reset link</p>
            {error && <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.3)" }}><span className="font-inter text-sm" style={{ color: "#DC3545" }}>{error}</span></div>}
            <div className="mb-6">
              <label className="font-inter text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: "#E4A12B" }}>Email</label>
              <div className="flex items-center gap-3 rounded-2xl px-4" style={{ background: "rgba(20,20,28,0.8)", border: "1px solid rgba(214,162,74,0.18)", height: 52 }}>
                <IoMail size={18} color="#E4A12B" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="flex-1 bg-transparent font-cormorant text-base text-white" style={{ fontSize: 16 }} />
              </div>
            </div>
            <GoldButton label="Send Reset Link" onClick={handleReset} loading={loading} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center mt-20 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "rgba(40,167,69,0.15)", border: "1px solid rgba(40,167,69,0.3)" }}>
              <IoCheckmarkCircle size={40} color="#28A745" />
            </div>
            <h2 className="font-playfair text-white font-bold text-2xl mb-3">Email Sent!</h2>
            <p className="font-cormorant text-base mb-8" style={{ color: "rgba(255,255,255,0.55)" }}>Check your inbox for the password reset link.</p>
            <GoldButton label="Back to Login" onClick={() => navigate("/auth/login")} />
          </div>
        )}
      </div>
    </div>
  );
}
