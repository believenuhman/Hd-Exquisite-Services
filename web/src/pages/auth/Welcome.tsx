import React from "react";
import { useNavigate } from "react-router-dom";
import { IoLogIn, IoPersonAdd, IoPersonCircle } from "react-icons/io5";
import { useAuth } from "@/context/AuthContext";

export function Welcome() {
  const navigate = useNavigate();
  const { continueAsGuest } = useAuth();

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-8 overflow-y-auto"
      style={{ background: "linear-gradient(160deg, #0D0B14 0%, #09090C 50%, #100A0A 100%)", paddingTop: "env(safe-area-inset-top, 20px)", paddingBottom: "env(safe-area-inset-bottom, 20px)" }}
    >
      {/* Logo with glow */}
      <div className="relative flex items-center justify-center mb-8" style={{ width: 200, height: 200 }}>
        {[170, 140, 112].map((size, i) => (
          <div key={i} className="absolute rounded-full border"
            style={{ width: size, height: size, borderColor: i === 0 ? "rgba(228,161,43,0.15)" : i === 1 ? "rgba(201,30,140,0.2)" : "rgba(228,161,43,0.25)", animation: `glowPulse${i + 1} ${3 + i * 0.5}s ease-in-out infinite ${i * 0.5}s` }} />
        ))}
        <img src="/logo.png" alt="HD XQUISITE" style={{ width: 130, height: 130, objectFit: "contain", position: "relative", zIndex: 1 }} className="animate-logo-spring" />
      </div>

      <h1 className="font-playfair text-white font-black text-3xl tracking-[4px] text-center mb-1 animate-fade-up">HD XQUISITE</h1>
      <div className="flex items-center gap-3 mb-1 justify-center animate-fade-up-delay">
        <div style={{ height: 1, width: 32, background: "linear-gradient(to right, transparent, #E4A12B)" }} />
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#E4A12B" }} />
        <div style={{ height: 1, width: 32, background: "linear-gradient(to left, transparent, #E4A12B)" }} />
      </div>
      <p className="font-cormorant tracking-[5px] text-sm mb-2 animate-fade-up-delay" style={{ color: "#E4A12B" }}>LIQUORS</p>
      <p className="font-cormorant text-base mb-10 text-center animate-fade-up-delay2" style={{ color: "rgba(255,255,255,0.45)" }}>
        Premium spirits, delivered to your door
      </p>

      <div className="w-full max-w-xs flex flex-col gap-3 animate-fade-up-delay2">
        <button
          onClick={() => navigate("/auth/login")}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-inter font-bold text-sm tracking-wide press-active"
          style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}
        >
          <IoLogIn size={18} />
          Log In
        </button>

        <button
          onClick={() => navigate("/auth/signup")}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-inter font-bold text-sm tracking-wide press-active"
          style={{ background: "rgba(201,30,140,0.15)", border: "1px solid rgba(201,30,140,0.35)", color: "#C91E8C" }}
        >
          <IoPersonAdd size={18} />
          Create Account
        </button>

        <button
          onClick={() => { continueAsGuest(); navigate("/"); }}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-inter text-sm press-active"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)" }}
        >
          <IoPersonCircle size={18} />
          Continue as Guest
        </button>
      </div>

      <p className="mt-8 font-inter text-center text-xs animate-fade-up-delay3" style={{ color: "rgba(255,255,255,0.3)" }}>
        By continuing, you confirm you are 18+ and agree to our Terms
      </p>
    </div>
  );
}
