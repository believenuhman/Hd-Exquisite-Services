import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoHome, IoSearch, IoCart, IoPerson, IoReceipt } from "react-icons/io5";
import { useCart } from "@/context/CartContext";

const TABS = [
  { path: "/", label: "Home", Icon: IoHome },
  { path: "/search", label: "Search", Icon: IoSearch },
  { path: "/cart", label: "Cart", Icon: IoCart },
  { path: "/orders", label: "Orders", Icon: IoReceipt },
  { path: "/profile", label: "Profile", Icon: IoPerson },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems } = useCart();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex justify-center z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        className="w-full max-w-lg flex items-center"
        style={{
          background: "rgba(13,11,20,0.97)",
          borderTop: "1px solid rgba(228,161,43,0.12)",
          backdropFilter: "blur(20px)",
          height: 64,
        }}
      >
        {TABS.map(({ path, label, Icon }) => {
          const active = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          const isCart = path === "/cart";
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 press-active"
              style={{ height: "100%" }}
            >
              <div className="relative">
                <Icon
                  size={22}
                  color={active ? "#E4A12B" : "rgba(255,255,255,0.38)"}
                />
                {isCart && totalItems > 0 && (
                  <div
                    className="absolute flex items-center justify-center text-white font-inter font-bold"
                    style={{
                      top: -6, right: -8,
                      minWidth: 16, height: 16,
                      background: "#C91E8C",
                      borderRadius: 8,
                      fontSize: 9,
                      padding: "0 3px",
                    }}
                  >
                    {totalItems > 99 ? "99+" : totalItems}
                  </div>
                )}
              </div>
              <span
                className="font-inter text-center"
                style={{ fontSize: 9, color: active ? "#E4A12B" : "rgba(255,255,255,0.38)", letterSpacing: 0.3 }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
