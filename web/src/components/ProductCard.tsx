import React from "react";
import { useNavigate } from "react-router-dom";
import { IoStar, IoAdd } from "react-icons/io5";
import { Product } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { useAppSettings } from "@/context/AppSettingsContext";

const BOTTLE_IMAGES: Record<string, string> = {
  whiskey: "/hennessy.png",
  bourbon: "/johnniewalker.png",
  vodka: "/vodka.png",
  rum: "/rum.png",
  wine: "/wine.png",
  tequila: "/donjulio.png",
};

export function getProductImage(product: Product): string {
  if (product.image_url) return product.image_url;
  const cat = product.category?.toLowerCase() ?? "";
  return BOTTLE_IMAGES[cat] ?? "/hennessy.png";
}

interface Props {
  product: Product;
  horizontal?: boolean;
}

export function ProductCard({ product, horizontal = false }: Props) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { settings } = useAppSettings();
  const currSym = settings?.currency_symbol ?? "$";
  const img = getProductImage(product);
  const outOfStock = product.stock_qty <= 0;

  if (horizontal) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/product/${product.id}`)}
        onKeyDown={(e) => { if (e.key === "Enter") navigate(`/product/${product.id}`); }}
        className="flex-shrink-0 press-active cursor-pointer"
        style={{ width: 160 }}
      >
        <div
          className="rounded-2xl overflow-hidden card-shadow"
          style={{
            background: "linear-gradient(145deg, #1C1828, #121212)",
            border: "1px solid rgba(228,161,43,0.1)",
          }}
        >
          <div className="flex items-center justify-center relative" style={{ height: 140, background: "rgba(228,161,43,0.04)" }}>
            <img src={img} alt={product.name} style={{ width: 80, height: 120, objectFit: "contain" }} />
            {outOfStock && (
              <div className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-white font-inter font-semibold" style={{ background: "rgba(220,53,69,0.85)", fontSize: 8 }}>
                OUT
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="font-inter font-semibold text-white text-left truncate" style={{ fontSize: 12 }}>{product.name}</p>
            <div className="flex items-center gap-1 mt-1">
              <IoStar size={10} color="#E4A12B" />
              <span className="font-inter text-white" style={{ fontSize: 10 }}>{product.rating?.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="font-inter font-bold" style={{ fontSize: 14, color: "#E4A12B" }}>{currSym}{product.price?.toFixed(2)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); if (!outOfStock) addToCart(product); }}
                disabled={outOfStock}
                className="flex items-center justify-center rounded-full press-active"
                style={{ width: 26, height: 26, background: outOfStock ? "rgba(255,255,255,0.08)" : "#C91E8C" }}
              >
                <IoAdd size={16} color="white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/product/${product.id}`)}
      onKeyDown={(e) => { if (e.key === "Enter") navigate(`/product/${product.id}`); }}
      className="press-active w-full cursor-pointer"
    >
      <div
        className="flex items-center gap-3 rounded-2xl p-3 card-shadow"
        style={{
          background: "linear-gradient(145deg, #1C1828, #121212)",
          border: "1px solid rgba(228,161,43,0.1)",
        }}
      >
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 64, height: 72, background: "rgba(228,161,43,0.04)" }}>
          <img src={img} alt={product.name} style={{ width: 40, height: 60, objectFit: "contain" }} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="font-inter font-semibold text-white truncate" style={{ fontSize: 14 }}>{product.name}</p>
          <p className="font-inter text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{product.category}</p>
          <div className="flex items-center gap-1 mt-1">
            {[1,2,3,4,5].map((s) => (
              <IoStar key={s} size={10} color={s <= Math.round(product.rating || 0) ? "#E4A12B" : "rgba(228,161,43,0.2)"} />
            ))}
            <span className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>({product.rating?.toFixed(1)})</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="font-inter font-bold" style={{ fontSize: 15, color: "#E4A12B" }}>{currSym}{product.price?.toFixed(2)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); if (!outOfStock) addToCart(product); }}
            disabled={outOfStock}
            className="flex items-center justify-center rounded-full press-active"
            style={{ width: 32, height: 32, background: outOfStock ? "rgba(255,255,255,0.08)" : "#C91E8C" }}
          >
            <IoAdd size={18} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}
