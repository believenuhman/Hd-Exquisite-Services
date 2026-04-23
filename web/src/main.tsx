import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AgeGateProvider } from "@/context/AgeGateContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { AppSettingsProvider } from "@/context/AppSettingsContext";
import { MembershipProvider } from "@/context/MembershipContext";
import App from "./App";
import "./index.css";

const MAX_WIDTH = 480;

const rootEl = document.getElementById("root")!;
rootEl.style.cssText = `
  display: flex;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #09090C;
`;

const appContainer = document.createElement("div");
appContainer.style.cssText = `
  width: 100%;
  max-width: ${MAX_WIDTH}px;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #09090C;
`;
rootEl.appendChild(appContainer);

ReactDOM.createRoot(appContainer).render(
  <React.StrictMode>
    <BrowserRouter>
      <AgeGateProvider>
        <AuthProvider>
          <AppSettingsProvider>
            <MembershipProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </MembershipProvider>
          </AppSettingsProvider>
        </AuthProvider>
      </AgeGateProvider>
    </BrowserRouter>
  </React.StrictMode>
);
