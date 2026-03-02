import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: "⊞" },
  { to: "/products", label: "Products", icon: "🍾" },
  { to: "/orders", label: "Orders", icon: "📦" },
  { to: "/zones", label: "Delivery Zones", icon: "📍" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

const S: Record<string, React.CSSProperties> = {
  root: { display: "flex", minHeight: "100vh", background: "#0B0B0F" },
  sidebar: {
    width: 240, background: "rgba(14,14,22,0.95)", borderRight: "1px solid rgba(214,162,74,0.12)",
    display: "flex", flexDirection: "column", padding: "24px 0",
  },
  logo: {
    padding: "0 24px 32px",
    borderBottom: "1px solid rgba(214,162,74,0.1)",
    marginBottom: 16,
  },
  logoTitle: { fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 1 },
  logoSub: { fontFamily: "Inter,sans-serif", fontSize: 11, color: "#E8B86D", letterSpacing: 3, textTransform: "uppercase" as const, marginTop: 3 },
  nav: { flex: 1 },
  navLink: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "11px 24px", textDecoration: "none",
    fontFamily: "Inter,sans-serif", fontSize: 14, color: "rgba(185,185,195,0.7)",
    transition: "all 0.2s",
  },
  navLinkActive: {
    color: "#E8B86D", background: "rgba(214,162,74,0.08)",
    borderLeft: "3px solid #E8B86D",
  },
  content: { flex: 1, overflow: "auto", padding: 32 },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 32,
  },
  pageTitle: { fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#fff" },
  signoutBtn: {
    background: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.3)",
    color: "#FF4D4D", borderRadius: 8, padding: "8px 16px",
    fontFamily: "Inter,sans-serif", fontSize: 13, cursor: "pointer",
  },
};

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div style={S.root}>
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoTitle}>HD XQUISITE</div>
          <div style={S.logoSub}>Admin Panel</div>
        </div>
        <nav style={S.nav}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              style={({ isActive }) => ({ ...S.navLink, ...(isActive ? S.navLinkActive : {}) })}
            >
              <span style={{ fontSize: 18 }}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(214,162,74,0.1)" }}>
          <div style={{ fontSize: 12, color: "rgba(185,185,195,0.5)", marginBottom: 8, fontFamily: "Inter,sans-serif" }}>{user?.email}</div>
          <button style={S.signoutBtn} onClick={handleSignOut}>Sign Out</button>
        </div>
      </aside>
      <main style={S.content}>
        <Outlet />
      </main>
    </div>
  );
}
