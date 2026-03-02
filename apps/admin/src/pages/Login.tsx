import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh", background: "#0B0B0F",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  card: {
    background: "rgba(20,20,28,0.95)", border: "1px solid rgba(214,162,74,0.2)",
    borderRadius: 20, padding: "48px 40px", width: "100%", maxWidth: 420,
    boxShadow: "0 0 60px rgba(214,162,74,0.08)",
  },
  title: { fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 900, color: "#fff", textAlign: "center" as const },
  sub: { fontFamily: "Inter,sans-serif", fontSize: 12, color: "#E8B86D", textAlign: "center" as const, letterSpacing: 4, textTransform: "uppercase" as const, marginTop: 6, marginBottom: 40 },
  divider: { width: 40, height: 1, background: "rgba(214,162,74,0.4)", margin: "0 auto 40px" },
  label: { fontFamily: "Inter,sans-serif", fontSize: 11, color: "#E8B86D", letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 6, display: "block" },
  input: {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(214,162,74,0.2)", borderRadius: 10,
    padding: "12px 16px", color: "#fff", fontFamily: "Inter,sans-serif",
    fontSize: 14, marginBottom: 20, outline: "none",
  },
  btn: {
    width: "100%", padding: "14px",
    background: "linear-gradient(90deg,#D6A24A,#F6D27A)",
    border: "none", borderRadius: 12, cursor: "pointer",
    fontFamily: "'Playfair Display',serif", fontSize: 14, fontWeight: 700,
    color: "#000", letterSpacing: 1.5,
  },
  error: { color: "#FF4D4D", fontFamily: "Inter,sans-serif", fontSize: 13, textAlign: "center" as const, marginBottom: 16 },
};

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const err = await signIn(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    navigate("/");
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.title}>HD XQUISITE</div>
        <div style={S.sub}>Admin Panel</div>
        <div style={S.divider} />
        {error && <div style={S.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required />
          <label style={S.label}>Password</label>
          <input style={S.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? "Signing in…" : "SIGN IN"}
          </button>
        </form>
      </div>
    </div>
  );
}
