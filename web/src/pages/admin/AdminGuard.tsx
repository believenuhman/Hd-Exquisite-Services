import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api";

// Frontend guard for the admin dashboard. The real authorization is enforced
// server-side by requireAdmin() on every /api/admin/* route — this component
// just decides what UI to render. Three states:
//   1. No user signed in           → bounce to /auth/login
//   2. Signed in, role check loading → spinner
//   3. Signed in, NOT admin        → friendly access-denied screen
//   4. Signed in AND admin         → render children
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth/login", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await authedFetch("/api/admin/me");
        const d = await r.json() as { isAdmin?: boolean };
        if (cancelled) return;
        setState(d.isAdmin ? "ok" : "denied");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, navigate]);

  if (authLoading || state === "checking") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0A0A0F", color: "#fff",
      }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(228,161,43,0.2)", borderTopColor: "#E4A12B", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div style={{
        minHeight: "100vh", background: "#0A0A0F", color: "#fff",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 24, textAlign: "center", gap: 12,
      }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#E4A12B" }}>Access Denied</div>
        <div style={{ color: "#A8A8B0", maxWidth: 420, lineHeight: 1.5 }}>
          Your account does not have admin access to the merchant panel.
          Ask the system owner to grant your user the admin role in Supabase.
        </div>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: 8, padding: "10px 18px", borderRadius: 8,
            background: "#E4A12B", color: "#0A0A0F", border: "none",
            fontWeight: 600, cursor: "pointer",
          }}
        >
          Return to App
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
