import React, { useEffect, useState } from "react";
import { IoSearch, IoClose } from "react-icons/io5";
import { supabase, Product } from "@/lib/supabase";
import { ProductCard } from "@/components/ProductCard";

const CATEGORIES = ["All", "Whiskey", "Vodka", "Rum", "Wine", "Tequila", "Bourbon"];
const SORTS = ["Default", "Price ↑", "Price ↓", "Rating"];

export function Search() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Default");

  const loadProducts = () => {
    setFetchError(false);
    setLoading(true);
    supabase.from("products").select("*").eq("is_active", true)
      .then(({ data, error }) => {
        if (error) { setFetchError(true); setLoading(false); return; }
        if (data) setProducts(data as Product[]);
        setLoading(false);
      })
      .catch(() => { setFetchError(true); setLoading(false); });
  };

  useEffect(() => { loadProducts(); }, []);

  const filtered = products
    .filter((p) => {
      const matchCat = category === "All" || p.category?.toLowerCase() === category.toLowerCase();
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sort === "Price ↑") return a.price - b.price;
      if (sort === "Price ↓") return b.price - a.price;
      if (sort === "Rating") return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#09090C" }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", background: "rgba(9,9,12,0.98)", borderBottom: "1px solid rgba(228,161,43,0.08)" }}>
        <p className="font-playfair text-white font-bold text-2xl mb-3">Search</p>

        {/* Search input */}
        <div className="flex items-center gap-3 rounded-2xl px-4 mb-3" style={{ background: "#1A1A26", border: "1px solid rgba(228,161,43,0.2)", height: 48 }}>
          <IoSearch size={18} color="rgba(228,161,43,0.6)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search spirits, wines, cocktails..."
            className="flex-1 bg-transparent font-inter text-sm text-white"
            autoFocus
          />
          {search ? (
            <button onClick={() => setSearch("")} className="press-active"><IoClose size={18} color="rgba(255,255,255,0.4)" /></button>
          ) : null}
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)} className="flex-shrink-0 px-3.5 py-1.5 rounded-full font-inter text-sm press-active"
              style={{
                background: category === cat ? "linear-gradient(135deg, #D4901A, #F5C842)" : "rgba(255,255,255,0.06)",
                color: category === cat ? "#09090C" : "rgba(255,255,255,0.6)",
                fontWeight: category === cat ? 700 : 400,
              }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {SORTS.map((s) => (
            <button key={s} onClick={() => setSort(s)} className="flex-shrink-0 px-3 py-1.5 rounded-full font-inter press-active"
              style={{ background: sort === s ? "rgba(201,30,140,0.15)" : "transparent", border: `1px solid ${sort === s ? "rgba(201,30,140,0.4)" : "rgba(255,255,255,0.1)"}`, color: sort === s ? "#C91E8C" : "rgba(255,255,255,0.45)", fontSize: 12 }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3" style={{ paddingBottom: 80 }}>
        {loading ? (
          <div className="flex justify-center py-16">
            <div style={{ width: 32, height: 32, border: "2px solid rgba(228,161,43,0.2)", borderTopColor: "#E4A12B", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <span style={{ fontSize: 32 }}>⚠️</span>
            <p className="font-inter text-sm text-white">Could not load products</p>
            <button onClick={loadProducts} className="px-6 py-2.5 rounded-xl font-inter text-sm font-semibold press-active"
              style={{ background: "rgba(228,161,43,0.12)", border: "1px solid rgba(228,161,43,0.3)", color: "#E4A12B" }}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <p className="font-inter text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>{filtered.length} product{filtered.length !== 1 ? "s" : ""} found</p>
            <div className="flex flex-col gap-3">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center py-20">
                <span style={{ fontSize: 40 }}>🍷</span>
                <p className="font-inter text-base mt-3" style={{ color: "rgba(255,255,255,0.4)" }}>No products found</p>
                <p className="font-inter text-sm mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Try a different search or category</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
