import React from "react";
import { useNavigate } from "react-router-dom";
import { IoTrash, IoAdd, IoRemove } from "react-icons/io5";
import { useCart } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";
import { getProductImage } from "@/components/ProductCard";

export function Cart() {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, subtotal, clearCart, totalItems } = useCart();
  const { settings } = useAppSettings();
  const currSym = settings?.currency_symbol ?? "$";

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", background: "rgba(9,9,12,0.98)", borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
        <p className="font-playfair text-white font-bold text-2xl">My Cart</p>
        {items.length > 0 && (
          <button onClick={clearCart} className="press-active p-2">
            <IoTrash size={20} color="rgba(220,53,69,0.7)" />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <div className="rounded-full flex items-center justify-center" style={{ width: 80, height: 80, background: "rgba(228,161,43,0.06)", border: "1px solid rgba(228,161,43,0.12)" }}>
            <span style={{ fontSize: 36 }}>🛒</span>
          </div>
          <p className="font-inter text-base font-semibold text-white">Your cart is empty</p>
          <p className="font-cormorant text-base text-center" style={{ color: "rgba(255,255,255,0.45)" }}>Add some premium spirits to get started</p>
          <button onClick={() => navigate("/search")} className="mt-2 px-8 py-3 rounded-2xl font-inter font-bold text-sm press-active"
            style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
            Browse Products
          </button>
        </div>
      ) : (
        <>
          {/* Items */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 flex flex-col gap-3" style={{ paddingBottom: 8 }}>
            {items.map(({ product, quantity }) => {
              const img = getProductImage(product);
              return (
                <div key={product.id} className="flex items-center gap-3 rounded-2xl p-3"
                  style={{ background: "linear-gradient(145deg, #1C1828, #121212)", border: "1px solid rgba(228,161,43,0.1)" }}>
                  <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 64, height: 72, background: "rgba(228,161,43,0.04)" }}>
                    <img src={img} alt={product.name} style={{ width: 38, height: 58, objectFit: "contain" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-inter font-semibold text-white text-sm truncate">{product.name}</p>
                    <p className="font-inter text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{product.category}</p>
                    <p className="font-inter font-bold text-sm mt-1" style={{ color: "#E4A12B" }}>{currSym}{(product.price * quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => removeFromCart(product.id)} className="press-active">
                      <IoTrash size={16} color="rgba(220,53,69,0.6)" />
                    </button>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(product.id, quantity - 1)} className="flex items-center justify-center rounded-full press-active"
                        style={{ width: 26, height: 26, background: "rgba(228,161,43,0.1)", border: "1px solid rgba(228,161,43,0.2)" }}>
                        <IoRemove size={12} color="#E4A12B" />
                      </button>
                      <span className="font-inter font-bold text-white w-5 text-center" style={{ fontSize: 13 }}>{quantity}</span>
                      <button onClick={() => updateQuantity(product.id, quantity + 1)} className="flex items-center justify-center rounded-full press-active"
                        style={{ width: 26, height: 26, background: "rgba(228,161,43,0.1)", border: "1px solid rgba(228,161,43,0.2)" }}>
                        <IoAdd size={12} color="#E4A12B" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="flex-shrink-0 px-4 pb-4 pt-2" style={{ borderTop: "1px solid rgba(228,161,43,0.1)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
              <span className="font-inter font-bold text-white">{currSym}{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Delivery</span>
              <span className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Calculated at checkout</span>
            </div>
            <button onClick={() => navigate("/checkout")} className="w-full py-4 rounded-2xl font-inter font-bold text-sm tracking-wide press-active"
              style={{ background: "linear-gradient(135deg, #D4901A, #F5C842)", color: "#09090C" }}>
              Checkout → {currSym}{subtotal.toFixed(2)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
