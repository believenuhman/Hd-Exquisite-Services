import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAgeGate } from "@/context/AgeGateContext";
import { useAuth } from "@/context/AuthContext";
import { SplashScreen } from "@/components/SplashScreen";
import { BottomNav } from "@/components/BottomNav";

import { AgeGate } from "@/pages/AgeGate";
import { Welcome } from "@/pages/auth/Welcome";
import { Login } from "@/pages/auth/Login";
import { Signup } from "@/pages/auth/Signup";
import { ForgotPassword } from "@/pages/auth/ForgotPassword";
import { Home } from "@/pages/Home";
import { Search } from "@/pages/Search";
import { Cart } from "@/pages/Cart";
import { Checkout } from "@/pages/Checkout";
import { Profile } from "@/pages/Profile";
import { Orders } from "@/pages/Orders";
import { ProductDetail } from "@/pages/ProductDetail";
import { OrderTracking } from "@/pages/OrderTracking";
import { Settings } from "@/pages/Settings";
import { ContactSupport } from "@/pages/ContactSupport";
import { PaymentMock } from "@/pages/PaymentMock";
import { PaymentSuccess } from "@/pages/PaymentSuccess";
import { PaymentFailed } from "@/pages/PaymentFailed";
import { PaymentCancelled } from "@/pages/PaymentCancelled";

const TAB_PATHS = ["/", "/search", "/cart", "/profile", "/orders"];

function AppInner() {
  const { verified } = useAgeGate();
  const { loading, user, isGuest } = useAuth();
  const [splash, setSplash] = useState(true);
  const location = useLocation();
  const showBottomNav = TAB_PATHS.includes(location.pathname) || location.pathname.startsWith("/orders");

  if (splash) return <SplashScreen onDone={() => setSplash(false)} />;
  if (!verified) return <AgeGate />;
  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#09090C" }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(228,161,43,0.2)", borderTopColor: "#E4A12B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );
  if (!user && !isGuest && location.pathname !== "/auth/welcome" && !location.pathname.startsWith("/auth")) {
    return <Navigate to="/auth/welcome" replace />;
  }

  return (
    <div className="relative w-full h-full" style={{ background: "#09090C" }}>
      <Routes>
        <Route path="/auth/welcome" element={<Welcome />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/order-tracking/:id" element={<OrderTracking />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/contact-support" element={<ContactSupport />} />

        {/* Payment result screens — hyphen versions (Stripe redirects here) */}
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
        <Route path="/payment-cancelled" element={<PaymentCancelled />} />

        {/* Legacy slash versions — redirect to canonical hyphen routes */}
        <Route path="/payment/success" element={<Navigate to="/payment-success" replace />} />
        <Route path="/payment/failed" element={<Navigate to="/payment-failed" replace />} />
        <Route path="/payment/cancelled" element={<Navigate to="/payment-cancelled" replace />} />

        <Route path="/payment/mock/:orderId" element={<PaymentMock />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
