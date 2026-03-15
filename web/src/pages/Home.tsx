import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IoMenu, IoStar, IoChevronForward } from "react-icons/io5";
import { supabase, Product } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { ProductCard, getProductImage } from "@/components/ProductCard";
import { DrawerMenu } from "@/components/DrawerMenu";

const CATEGORIES = ["All", "Whiskey", "Vodka", "Rum", "Wine", "Tequila", "Bourbon"];
const HERO_BOTTLES = [
  { src: "/hennessy.png", name: "Hennessy VS", sub: "Cognac" },
  { src: "/vodka.png", name: "Premium Vodka", sub: "Spirits" },
  { src: "/rum.png", name: "Dark Rum", sub: "Caribbean" },
  { src: "/donjulio.png", name: "Don Julio", sub: "Tequila" },
];

export function Home() {
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [heroIdx, setHeroIdx] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setProducts(data as Product[]); setLoading(false); });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_BOTTLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  const featured = products.filter((p) => p.is_trending);
  const bestsellers = products.filter((p) => !p.is_trending).slice(0, 8);
  const filtered = activeCategory === "All" ? products : products.filter((p) => p.category?.toLowerCase() === activeCategory.toLowerCase());

  const headerHeight = 56;
  const safeTop = 0;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 80 }}>
        {/* Header */}
        <div className="sticky top-0 z-30 flex items-center px-4 gap-3"
          style={{ height: headerHeight, background: "rgba(9,9,12,0.95)", borderBottom: "1px solid rgba(228,161,43,0.08)", backdropFilter: "blur(12px)", paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <button onClick={() => setDrawerOpen(true)} className="flex items-center justify-center rounded-xl press-active"
            style={{ width: 40, height: 40, background: "rgba(228,161,43,0.07)", border: "1px solid rgba(228,161,43,0.12)" }}>
            <IoMenu size={22} color="#E4A12B" />
          </button>

          <div className="flex-1 flex justify-center">
            <img src="/logo.png" alt="HD XQUISITE" style={{ width: 60, height: 40, objectFit: "contain" }} />
          </div>

          <button onClick={() => navigate("/cart")} className="relative flex items-center justify-center rounded-xl press-active"
            style={{ width: 40, height: 40, background: "rgba(228,161,43,0.07)", border: "1px solid rgba(228,161,43,0.12)" }}>
            <span style={{ fontSize: 20 }}>🛒</span>
            {totalItems > 0 && (
              <div className="absolute flex items-center justify-center text-white font-inter font-bold"
                style={{ top: -4, right: -4, minWidth: 16, height: 16, background: "#C91E8C", borderRadius: 8, fontSize: 9, padding: "0 3px" }}>
                {totalItems}
              </div>
            )}
          </button>
        </div>

        {/* Logo Hero */}
        <div className="flex flex-col items-center py-6" style={{ background: "linear-gradient(180deg, rgba(13,11,20,1) 0%, rgba(9,9,12,0) 100%)" }}>
          <img src="/logo.png" alt="HD XQUISITE" style={{ width: 240, height: 96, objectFit: "contain" }} />
        </div>

        {/* Animated Hero Banner */}
        <div className="mx-4 mb-5 rounded-3xl overflow-hidden relative" style={{ height: 180, background: "linear-gradient(135deg, #1C1828, #0D0B14)" }}>
          <div className="absolute inset-0 flex items-center justify-center">
            {HERO_BOTTLES.map((bottle, i) => (
              <div key={i} className="absolute inset-0 flex items-center justify-between px-6 transition-all duration-500"
                style={{ opacity: i === heroIdx ? 1 : 0, transform: i === heroIdx ? "translateX(0)" : "translateX(20px)" }}>
                <div className="flex-1">
                  <p className="font-inter text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#E4A12B" }}>{bottle.sub}</p>
                  <p className="font-playfair text-white font-bold text-2xl mb-3">{bottle.name}</p>
                  <button onClick={() => navigate("/search")} className="flex items-center gap-2 press-active">
                    <span className="font-inter text-sm font-semibold" style={{ color: "#C91E8C" }}>Shop Now</span>
                    <IoChevronForward size={14} color="#C91E8C" />
                  </button>
                </div>
                <img src={bottle.src} alt={bottle.name} style={{ width: 100, height: 150, objectFit: "contain", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.6))" }} />
              </div>
            ))}
          </div>
          {/* Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {HERO_BOTTLES.map((_, i) => (
              <div key={i} style={{ width: i === heroIdx ? 16 : 5, height: 5, borderRadius: 3, background: i === heroIdx ? "#E4A12B" : "rgba(255,255,255,0.25)", transition: "all 0.3s" }} />
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="mx-4 mb-4">
          <div className="flex items-center gap-3 rounded-2xl px-4" style={{ background: "#1A1A26", border: "1px solid rgba(228,161,43,0.2)", height: 48 }}>
            <span style={{ fontSize: 18 }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => navigate("/search")}
              placeholder="Search spirits, wines, cocktails..."
              className="flex-1 bg-transparent font-inter text-white text-sm"
              style={{ color: "white" }}
              readOnly
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 px-4 mb-6 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className="flex-shrink-0 px-4 py-2 rounded-full font-inter text-sm font-medium press-active"
              style={{
                background: activeCategory === cat ? "linear-gradient(135deg, #D4901A, #F5C842)" : "rgba(255,255,255,0.06)",
                color: activeCategory === cat ? "#09090C" : "rgba(255,255,255,0.6)",
                border: activeCategory === cat ? "none" : "1px solid rgba(255,255,255,0.1)",
              }}>
              {cat}
            </button>
          ))}
        </div>

        {activeCategory === "All" ? (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center justify-between px-4 mb-3">
                  <p className="font-playfair text-white font-bold text-lg">Featured</p>
                  <button onClick={() => navigate("/search")} className="press-active">
                    <span className="font-inter text-xs" style={{ color: "#E4A12B" }}>See All</span>
                  </button>
                </div>
                <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar">
                  {featured.map((p) => <ProductCard key={p.id} product={p} horizontal />)}
                </div>
              </section>
            )}

            {/* Best Sellers */}
            {bestsellers.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center justify-between px-4 mb-3">
                  <p className="font-playfair text-white font-bold text-lg">Best Sellers</p>
                  <button onClick={() => navigate("/search")} className="press-active">
                    <span className="font-inter text-xs" style={{ color: "#E4A12B" }}>See All</span>
                  </button>
                </div>
                <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar">
                  {bestsellers.map((p) => <ProductCard key={p.id} product={p} horizontal />)}
                </div>
              </section>
            )}

            {loading && (
              <div className="flex justify-center py-12">
                <div style={{ width: 32, height: 32, border: "2px solid rgba(228,161,43,0.2)", borderTopColor: "#E4A12B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              </div>
            )}
          </>
        ) : (
          <div className="px-4 flex flex-col gap-3">
            <p className="font-inter text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>{filtered.length} products in {activeCategory}</p>
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            {filtered.length === 0 && !loading && (
              <div className="flex flex-col items-center py-16">
                <p className="font-inter text-base" style={{ color: "rgba(255,255,255,0.4)" }}>No products in this category</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
