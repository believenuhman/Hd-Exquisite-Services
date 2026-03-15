import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronBack, IoMail, IoLockClosed, IoEye, IoEyeOff, IoAlertCircle } from "react-icons/io5";
import { useAuth } from "@/context/AuthContext";
import { GoldButton } from "@/components/GoldButton";

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim()) return setError("Please enter your email.");
    if (!password) return setError("Please enter your password.");
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err.includes("Invalid") ? "Invalid email or password." : err);
    else navigate("/");
  };

  return (
    <div className="fixed inset-0 overflow-y-auto no-scrollbar" style={{ background: "linear-gradient(160deg, #0D0B14 0%, #09090C 50%, #100A0A 100%)", paddingTop: "env(safe-area-inset-top, 20px)", paddingBottom: "env(safe-area-inset-bottom, 20px)" }}>
      <div className="px-6 pt-4 pb-10 max-w-lg mx-auto">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center justify-center rounded-full press-active mb-5"
          style={{ width: 40, height: 40, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.15)" }}>
          <IoChevronBack size={22} color="#E4A12B" />
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Logo" style={{ width: 90, height: 90, objectFit: "contain" }} />
        </div>

        <h1 className="font-playfair text-white font-bold text-3xl text-center mb-2">Welcome Back</h1>
        <p className="font-cormorant text-base text-center mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>Sign in to your account</p>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.3)" }}>
            <IoAlertCircle size={16} color="#DC3545" />
            <span className="font-inter text-sm" style={{ color: "#DC3545" }}>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div>
            <label className="font-inter text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: "#E4A12B" }}>Email</label>
            <div className="flex items-center gap-3 rounded-2xl px-4" style={{ background: "rgba(20,20,28,0.8)", border: "1px solid rgba(214,162,74,0.18)", height: 52 }}>
              <IoMail size={18} color="#E4A12B" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && passwordRef.current?.focus()}
                placeholder="your@email.com"
                className="flex-1 bg-transparent font-cormorant text-base text-white"
                style={{ fontSize: 16 }}
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="font-inter text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: "#E4A12B" }}>Password</label>
            <div className="flex items-center gap-3 rounded-2xl px-4" style={{ background: "rgba(20,20,28,0.8)", border: "1px solid rgba(214,162,74,0.18)", height: 52 }}>
              <IoLockClosed size={18} color="#E4A12B" />
              <input
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                className="flex-1 bg-transparent font-cormorant text-base text-white"
                style={{ fontSize: 16 }}
                autoComplete="current-password"
              />
              <button onClick={() => setShowPassword((p) => !p)} className="press-active">
                {showPassword ? <IoEyeOff size={18} color="rgba(185,185,195,0.5)" /> : <IoEye size={18} color="rgba(185,185,195,0.5)" />}
              </button>
            </div>
          </div>

          <button onClick={() => navigate("/auth/forgot-password")} className="self-end press-active">
            <span className="font-cormorant text-sm font-semibold" style={{ color: "#C91E8C" }}>Forgot Password?</span>
          </button>

          <GoldButton label="Log In" onClick={handleLogin} loading={loading} />
        </div>

        <div className="flex justify-center items-center gap-1 mt-7">
          <span className="font-cormorant text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>Don't have an account?</span>
          <button onClick={() => navigate("/auth/signup")} className="press-active">
            <span className="font-cormorant text-sm font-bold" style={{ color: "#E4A12B" }}> Sign Up</span>
          </button>
        </div>
      </div>
    </div>
  );
}
