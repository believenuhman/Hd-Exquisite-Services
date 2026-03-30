import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoChevronBack, IoStar, IoAdd, IoRemove, IoCart } from "react-icons/io5";
import { supabase, Product } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";
import { getProductImage } from "@/components/ProductCard";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, items, updateQuantity } = useCart();
  const { settings } = useAppSettings();
  const currSym = settings?.currency_symbol ?? "$";
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!id) return;
    supabase.from("products").select("*").eq("id", id).single()
      .then(({ data }) => { if (data) setProduct(data as Product); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#09090C" }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(228,161,43,0.2)", borderTopColor: "#E4A12B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!product) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#09090C" }}>
      <p className="font-inter text-white">Product not found</p>
    </div>
  );

  const img = getProductImage(product);
  const outOfStock = product.stock_qty <= 0;
  const cartItem = items.find((i) => i.product.id === product.id);
  const stars = Math.round(product.rating || 0);

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) addToCart(product);
  };

  const handleBuyNow = () => {
    for (let i = 0; i < qty; i++) addToCart(product);
    navigate("/checkout");
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto no-scrollbar" style={{ background: "#09090C", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {/* Hero image */}
      <div className="relative flex-shrink-0" style={{ height: 340, background: "linear-gradient(145deg, #1C1828, #0D0B14)" }}>
        {/* Back */}
        <button onClick={() => navigate(-1)} className="absolute flex items-center justify-center rounded-full press-active z-10"
          style={{ top: "calc(env(safe-area-inset-top, 16px) + 16px)", left: 16, width: 40, height: 40, background: "rgba(9,9,12,0.7)", border: "1px solid rgba(228,161,43,0.2)", backdropFilter: "blur(8px)" }}>
          <IoChevronBack size={22} color="#E4A12B" />
        </button>

        {/* Category badge */}
        <div className="absolute rounded-full px-3 py-1" style={{ top: "calc(env(safe-area-inset-top, 16px) + 16px)", right: 16, background: "rgba(201,30,140,0.15)", border: "1px solid rgba(201,30,140,0.3)" }}>
          <span className="font-inter text-xs font-semibold" style={{ color: "#C91E8C" }}>{product.category}</span>
        </div>

        <div className="flex items-center justify-center h-full">
          <img src={img} alt={product.name} style={{ width: 160, height: 260, objectFit: "contain", filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.7))" }} />
        </div>

        {outOfStock && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full"
            style={{ background: "rgba(220,53,69,0.85)" }}>
            <span className="font-inter text-sm font-bold text-white">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 rounded-t-3xl px-5 pt-6 pb-6 -mt-4 relative z-10" style={{ background: "linear-gradient(180deg, #121212 0%, #09090C 100%)", minHeight: 400 }}>
        {/* Stars */}
        <div className="flex items-center gap-1 mb-3">
          {[1,2,3,4,5].map((s) => <IoStar key={s} size={14} color={s <= stars ? "#E4A12B" : "rgba(228,161,43,0.2)"} />)}
          <span className="font-inter text-sm ml-1" style={{ color: "rgba(255,255,255,0.5)" }}>({product.rating?.toFixed(1)}) · {product.stock_qty > 0 ? `${product.stock_qty} in stock` : "Out of stock"}</span>
        </div>

        <h1 className="font-playfair text-white font-bold text-3xl mb-2 leading-tight">{product.name}</h1>

        <p className="font-cormorant text-base leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.55)", maxHeight: 130, overflow: "hidden" }}>
          {product.description || "A premium spirit crafted with exceptional quality and care, delivering an unparalleled experience for the discerning palate."}
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(228,161,43,0.1)", marginBottom: 20 }} />

        {/* Price + Qty */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-inter text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Price</p>
            <p className="font-inter font-bold text-3xl" style={{ color: "#E4A12B" }}>{currSym}{product.price?.toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex items-center justify-center rounded-full press-active"
              style={{ width: 36, height: 36, background: "rgba(228,161,43,0.1)", border: "1px solid rgba(228,161,43,0.2)" }}>
              <IoRemove size={16} color="#E4A12B" />
            </button>
            <span className="font-inter font-bold text-white text-xl w-8 text-center">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} disabled={outOfStock} className="flex items-center justify-center rounded-full press-active"
              style={{ width: 36, height: 36, background: outOfStock ? "rgba(255,255,255,0.05)" : "rgba(228,161,43,0.1)", border: "1px solid rgba(228,161,43,0.2)" }}>
              <IoAdd size={16} color={outOfStock ? "rgba(255,255,255,0.2)" : "#E4A12B"} />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button onClick={handleAddToCart} disabled={outOfStock} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-inter font-bold text-sm press-active"
            style={{ background: "transparent", border: "1.5px solid rgba(228,161,43,0.4)", color: outOfStock ? "rgba(228,161,43,0.3)" : "#E4A12B" }}>
            <IoCart size={18} />
            Add to Cart
          </button>
          <button onClick={handleBuyNow} disabled={outOfStock} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-inter font-bold text-sm press-active"
            style={{ background: outOfStock ? "rgba(228,161,43,0.15)" : "linear-gradient(135deg, #D4901A, #F5C842)", color: outOfStock ? "rgba(0,0,0,0.3)" : "#09090C" }}>
            Buy Now
          </button>
        </div>

        {cartItem && (
          <p className="mt-3 text-center font-inter text-xs" style={{ color: "rgba(228,161,43,0.7)" }}>
            ✓ {cartItem.quantity} in cart
          </p>
        )}
      </div>
    </div>
  );
}
