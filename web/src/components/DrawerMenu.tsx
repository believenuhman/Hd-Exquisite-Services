import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoHome, IoGrid, IoCart, IoReceipt, IoPerson, IoClose, IoLogOut, IoLogIn, IoSettings, IoHelpCircle, IoPhonePortrait } from "react-icons/io5";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { path: "/", label: "Home", Icon: IoHome },
  { path: "/search", label: "Categories", Icon: IoGrid },
  { path: "/cart", label: "My Cart", Icon: IoCart },
  { path: "/orders", label: "My Orders", Icon: IoReceipt },
  { path: "/profile", label: "Profile", Icon: IoPerson },
];

const BOTTOM_ITEMS = [
  { path: "/demo", label: "App Preview", Icon: IoPhonePortrait },
  { path: "/settings", label: "Settings", Icon: IoSettings },
  { path: "/contact-support", label: "Contact Support", Icon: IoHelpCircle },
];

export function DrawerMenu({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { user, isGuest, signOut } = useAuth();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleNav = (path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onClose();
    setTimeout(() => navigate(path), 10);
  };

  const isSignedIn = !!user;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ pointerEvents: open ? "auto" : "none" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 280,
          height: "100%",
          background: "linear-gradient(160deg, #1C1828 0%, #121212 100%)",
          borderRight: "1px solid rgba(228,161,43,0.12)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)",
          paddingTop: "env(safe-area-inset-top, 20px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" style={{ width: 44, height: 44, objectFit: "contain" }} />
            <div>
              <p className="font-playfair text-white font-bold text-sm tracking-widest">HD XQUISITE</p>
              <p className="font-cormorant text-xs tracking-wider" style={{ color: "#E4A12B" }}>LIQUORS</p>
            </div>
          </div>
          <button onClick={onClose} className="press-active" style={{ padding: 6 }}>
            <IoClose size={22} color="rgba(255,255,255,0.6)" />
          </button>
        </div>

        {/* User info */}
        <div className="mx-5 mb-6 p-4 rounded-2xl" style={{ background: "rgba(228,161,43,0.06)", border: "1px solid rgba(228,161,43,0.12)" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-full flex items-center justify-center" style={{ width: 42, height: 42, background: "linear-gradient(135deg, #D4901A, #F5C842)" }}>
              <IoPerson size={20} color="#09090C" />
            </div>
            <div>
              <p className="font-inter text-white font-semibold text-sm">{isSignedIn ? (user?.user_metadata?.full_name || "Member") : "Guest"}</p>
              <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{isSignedIn ? user?.email : "Not signed in"}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(228,161,43,0.1)", marginBottom: 8 }} />

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2">
          {NAV_ITEMS.map(({ path, label, Icon }) => {
            const isCart = path === "/cart";
            return (
              <button
                key={path}
                onClick={(e) => handleNav(path, e)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl mb-1 press-active"
                style={{ transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(228,161,43,0.07)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icon size={20} color="#E4A12B" />
                <span className="font-inter text-white text-sm font-medium flex-1 text-left">{label}</span>
                {isCart && totalItems > 0 && (
                  <div className="flex items-center justify-center text-white font-inter font-bold" style={{ minWidth: 20, height: 20, background: "#C91E8C", borderRadius: 10, fontSize: 10, padding: "0 5px" }}>
                    {totalItems}
                  </div>
                )}
              </button>
            );
          })}

          <div style={{ height: 1, background: "rgba(228,161,43,0.08)", margin: "8px 0" }} />

          {BOTTOM_ITEMS.map(({ path, label, Icon }) => (
            <button
              key={path}
              onClick={(e) => handleNav(path, e)}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl mb-1 press-active"
              style={{ transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Icon size={18} color="rgba(255,255,255,0.5)" />
              <span className="font-inter text-sm font-medium flex-1 text-left" style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Bottom action */}
        <div className="px-5 pb-6 pt-2" style={{ borderTop: "1px solid rgba(228,161,43,0.1)" }}>
          {isSignedIn ? (
            <button
              onClick={async () => { await signOut(); onClose(); navigate("/auth/welcome"); }}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl press-active"
              style={{ background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.2)" }}
            >
              <IoLogOut size={18} color="#DC3545" />
              <span className="font-inter text-sm font-medium" style={{ color: "#DC3545" }}>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); setTimeout(() => navigate("/auth/welcome"), 10); }}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl press-active gold-gradient"
            >
              <IoLogIn size={18} color="#09090C" />
              <span className="font-inter text-sm font-bold" style={{ color: "#09090C" }}>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
