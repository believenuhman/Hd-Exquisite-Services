import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoLockClosed, IoCheckmarkCircle, IoEye, IoEyeOff } from "react-icons/io5";
import { useAuth } from "@/context/AuthContext";
import { GoldButton } from "@/components/GoldButton";

export function ResetPassword() {
  const navigate = useNavigate();
  const { changePassword, signOut } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!password) return setError("Please enter a new password.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setError(null);
    setLoading(true);
    const { error: err } = await changePassword(password);
    setLoading(false);
    if (err) return setError(err);
    setDone(true);
  };

  const handleContinue = async () => {
    await signOut();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div
      className="fixed inset-0 flex flex-col px-6 overflow-y-auto no-scrollbar"
      style={{
        background: "linear-gradient(160deg, #0D0B14 0%, #09090C 50%, #100A0A 100%)",
        paddingTop: "env(safe-area-inset-top, 20px)",
        paddingBottom: "env(safe-area-inset-bottom, 20px)",
      }}
    >
      <div className="max-w-lg mx-auto w-full pt-4 pb-10">
        {!done ? (
          <>
            <div className="mb-8 flex items-center justify-center w-16 h-16 rounded-full" style={{ background: "rgba(228,161,43,0.1)", border: "1px solid rgba(228,161,43,0.2)" }}>
              <IoLockClosed size={28} color="#E4A12B" />
            </div>
            <h1 className="font-playfair text-white font-bold text-3xl mb-2">Set New Password</h1>
            <p className="font-cormorant text-base mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
              Choose a strong password to secure your account.
            </p>

            {error && (
              <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.3)" }}>
                <span className="font-inter text-sm" style={{ color: "#DC3545" }}>{error}</span>
              </div>
            )}

            <div className="mb-4">
              <label className="font-inter text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: "#E4A12B" }}>New Password</label>
              <div className="flex items-center gap-3 rounded-2xl px-4" style={{ background: "rgba(20,20,28,0.8)", border: "1px solid rgba(214,162,74,0.18)", height: 52 }}>
                <IoLockClosed size={18} color="#E4A12B" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="flex-1 bg-transparent font-cormorant text-base text-white"
                  style={{ fontSize: 16 }}
                />
                <button onClick={() => setShowPassword((v) => !v)} style={{ color: "rgba(255,255,255,0.4)" }}>
                  {showPassword ? <IoEyeOff size={18} /> : <IoEye size={18} />}
                </button>
              </div>
            </div>

            <div className="mb-8">
              <label className="font-inter text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: "#E4A12B" }}>Confirm Password</label>
              <div className="flex items-center gap-3 rounded-2xl px-4" style={{ background: "rgba(20,20,28,0.8)", border: "1px solid rgba(214,162,74,0.18)", height: 52 }}>
                <IoLockClosed size={18} color="#E4A12B" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="flex-1 bg-transparent font-cormorant text-base text-white"
                  style={{ fontSize: 16 }}
                />
              </div>
            </div>

            <GoldButton label="Update Password" onClick={handleSubmit} loading={loading} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center mt-20 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "rgba(40,167,69,0.15)", border: "1px solid rgba(40,167,69,0.3)" }}>
              <IoCheckmarkCircle size={40} color="#28A745" />
            </div>
            <h2 className="font-playfair text-white font-bold text-2xl mb-3">Password Updated!</h2>
            <p className="font-cormorant text-base mb-8" style={{ color: "rgba(255,255,255,0.55)" }}>
              Your password has been changed. Please sign in with your new credentials.
            </p>
            <GoldButton label="Sign In" onClick={handleContinue} />
          </div>
        )}
      </div>
    </div>
  );
}
