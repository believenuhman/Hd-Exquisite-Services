import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAgeGate } from "@/context/AgeGateContext";
import { useAuth } from "@/context/AuthContext";
import { SplashScreen } from "@/components/SplashScreen";
import { BottomNav } from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { AgeGate } from "@/pages/AgeGate";
import { Welcome } from "@/pages/auth/Welcome";
import { Login } from "@/pages/auth/Login";
import { Signup } from "@/pages/auth/Signup";
import { ForgotPassword } from "@/pages/auth/ForgotPassword";
import { ResetPassword } from "@/pages/auth/ResetPassword";
import { Home } from "@/pages/Home";
import { Search } from "@/pages/Search";
import { Events } from "@/pages/Events";
import { EventDetail } from "@/pages/EventDetail";
import { Cart } from "@/pages/Cart";
import { Checkout } from "@/pages/Checkout";
import { Profile } from "@/pages/Profile";
import { Orders } from "@/pages/Orders";
import { ProductDetail } from "@/pages/ProductDetail";
import { OrderTracking } from "@/pages/OrderTracking";
import { Settings } from "@/pages/Settings";
import { ContactSupport } from "@/pages/ContactSupport";
import { Membership } from "@/pages/Membership";
import { PaymentSuccess } from "@/pages/PaymentSuccess";
import { PaymentFailed } from "@/pages/PaymentFailed";
import { PaymentCancelled } from "@/pages/PaymentCancelled";
import { AdminGuard } from "@/pages/admin/AdminGuard";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { InventoryPage } from "@/pages/admin/InventoryPage";

/** Redirect that preserves the current search-params (query string). */
function QueryRedirect({ to }: { to: string }) {
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  return <Navigate to={qs ? `${to}?${qs}` : to} replace />;
}

const TAB_PATHS = ["/", "/search", "/cart", "/profile", "/orders", "/events"];
const NO_NAV_PREFIXES = ["/checkout", "/product/", "/order-tracking/", "/auth/", "/payment", "/settings", "/contact-support", "/membership", "/admin", "/events/"];

function AppInner() {
  const { verified } = useAgeGate();
  const { loading, user, isGuest, isRecoveryMode } = useAuth();
  const [splash, setSplash] = useState(true);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isNoNavRoute = NO_NAV_PREFIXES.some((p) => location.pathname.startsWith(p));
  const showBottomNav = !isNoNavRoute && (TAB_PATHS.includes(location.pathname) || location.pathname.startsWith("/orders") || location.pathname === "/events");

  // Admin pages need full viewport width; the customer app is capped at 480px
  // by main.tsx. Toggle the parent container's max-width on route change so
  // /admin/* gets the full screen on tablet/desktop without breaking the
  // customer mobile-first layout.
  useEffect(() => {
    const container = document.getElementById("app-shell");
    if (container) container.style.maxWidth = isAdminRoute ? "100%" : "480px";
  }, [isAdminRoute]);

  // Admin routes bypass the splash, age gate, and customer auth redirect —
  // AdminGuard handles its own auth/role gating. This keeps the admin URL
  // accessible directly and avoids forcing the merchant through the consumer
  // age verification or splash on every visit.
  if (isAdminRoute) {
    if (loading) {
      return (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#0A0A0F" }}>
          <div style={{ width: 32, height: 32, border: "2px solid rgba(228,161,43,0.2)", borderTopColor: "#E4A12B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      );
    }
    return (
      <Routes>
        <Route path="/admin"            element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/admin/inventory"  element={<AdminGuard><InventoryPage /></AdminGuard>} />
        <Route path="/admin/low-stock"  element={<AdminGuard><InventoryPage initialLowStockOnly /></AdminGuard>} />
        <Route path="/admin/completed"  element={<AdminGuard><AdminDashboard defaultStatus="delivered" lockStatus title="Completed Orders" /></AdminGuard>} />
        <Route path="/admin/*"          element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  if (splash) return <SplashScreen onDone={() => setSplash(false)} />;
  if (!verified) return <AgeGate />;
  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#09090C" }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(228,161,43,0.2)", borderTopColor: "#E4A12B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );
  // Payment result pages are always accessible (user may return from PayPal without a fresh session)
  const isPaymentResultRoute = location.pathname.startsWith("/payment-success") ||
    location.pathname.startsWith("/payment-failed") ||
    location.pathname.startsWith("/payment-cancelled") ||
    location.pathname.startsWith("/payment/");

  // Recovery sessions must be handled on the dedicated reset-password page only.
  if (isRecoveryMode && location.pathname !== "/auth/reset-password") {
    return <Navigate to="/auth/reset-password" replace />;
  }

  if (!user && !isGuest && !isPaymentResultRoute &&
      location.pathname !== "/auth/welcome" &&
      !location.pathname.startsWith("/auth")) {
    return <Navigate to="/auth/welcome" replace />;
  }

  return (
    <div className="relative w-full h-full" style={{ background: "#09090C" }}>
      <Routes>
        <Route path="/auth/welcome" element={<Welcome />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/order-tracking/:id" element={<OrderTracking />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/contact-support" element={<ContactSupport />} />
        <Route path="/membership" element={<Membership />} />

        {/* Payment result screens — PayPal redirects here after approval/cancel */}
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
        <Route path="/payment-cancelled" element={<PaymentCancelled />} />

        {/* Legacy slash versions — redirect to canonical hyphen routes, preserving query params */}
        <Route path="/payment/success" element={<QueryRedirect to="/payment-success" />} />
        <Route path="/payment/failed" element={<QueryRedirect to="/payment-failed" />} />
        <Route path="/payment/cancelled" element={<QueryRedirect to="/payment-cancelled" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
