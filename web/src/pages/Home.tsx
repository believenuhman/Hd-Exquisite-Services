import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoMenu, IoChevronForward, IoSearch } from "react-icons/io5";
import { supabase, Product } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { ProductCard } from "@/components/ProductCard";
import { DrawerMenu } from "@/components/DrawerMenu";
import { AdCarousel } from "@/components/AdCarousel";

const CATEGORIES = ["All", "Whiskey", "Vodka", "Rum", "Wine", "Tequila", "Bourbon"];

export function Home() {
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) { setFetchError(true); setLoading(false); return; }
        if (data) setProducts(data as Product[]);
        setLoading(false);
      })
      .catch(() => { setFetchError(true); setLoading(false); });
  }, []);

  const featured = products.filter((p) => p.is_trending);
  const bestsellers = products.filter((p) => !p.is_trending).slice(0, 8);
  const filtered = activeCategory === "All" ? products : products.filter((p) => p.category?.toLowerCase() === activeCategory.toLowerCase());

  const headerHeight = 56;

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
        <div className="flex flex-col items-center pt-6 pb-4" style={{ background: "linear-gradient(180deg, rgba(13,11,20,1) 0%, rgba(9,9,12,0) 100%)" }}>
          <img src="/logo.png" alt="HD XQUISITE" style={{ width: 260, height: 104, objectFit: "contain" }} />
          <p className="font-cormorant tracking-[5px] text-xs mt-1" style={{ color: "rgba(228,161,43,0.6)" }}>PREMIUM SPIRITS</p>
        </div>

        {/* Search bar directly below logo */}
        <div className="mx-4 mb-4">
          <button onClick={() => navigate("/search")} className="w-full flex items-center gap-3 rounded-2xl px-4 press-active" style={{ background: "#1A1A26", border: "1px solid rgba(228,161,43,0.2)", height: 48 }}>
            <IoSearch size={18} color="rgba(228,161,43,0.6)" />
            <span className="flex-1 text-left font-inter text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Search spirits, wines, cocktails...</span>
          </button>
        </div>

        {/* Ads / Hero carousel (mixed image + video) */}
        <AdCarousel />

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

        {fetchError && !loading && (
          <div className="flex flex-col items-center py-16 gap-3">
            <span style={{ fontSize: 32 }}>⚠️</span>
            <p className="font-inter text-sm text-white">Could not load products</p>
            <button onClick={() => { setFetchError(false); setLoading(true); supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }).then(({ data, error }) => { if (error) { setFetchError(true); } else if (data) { setProducts(data as Product[]); } setLoading(false); }).catch(() => { setFetchError(true); setLoading(false); }); }}
              className="px-6 py-2.5 rounded-xl font-inter text-sm font-semibold press-active"
              style={{ background: "rgba(228,161,43,0.12)", border: "1px solid rgba(228,161,43,0.3)", color: "#E4A12B" }}>
              Retry
            </button>
          </div>
        )}

        {!fetchError && activeCategory === "All" ? (
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
        ) : !fetchError ? (
          <div className="px-4 flex flex-col gap-3">
            <p className="font-inter text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>{filtered.length} products in {activeCategory}</p>
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            {filtered.length === 0 && !loading && (
              <div className="flex flex-col items-center py-16">
                <p className="font-inter text-base" style={{ color: "rgba(255,255,255,0.4)" }}>No products in this category</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
