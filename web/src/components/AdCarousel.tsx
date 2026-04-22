import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IoChevronForward } from "react-icons/io5";
import { supabase } from "@/lib/supabase";

export type Ad = {
  id: string;
  title: string | null;
  subtitle: string | null;
  media_type: "image" | "video";
  media_url: string;
  thumbnail_url: string | null;
  cta: string | null;
  link: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
};

type DefaultSlide = {
  id: string;
  title: string;
  subtitle: string;
  media_type: "image";
  media_url: string;
  thumbnail_url: null;
  cta: string;
  link: string;
};

const DEFAULT_SLIDES: DefaultSlide[] = [
  { id: "d1", title: "Hennessy VS", subtitle: "Cognac", media_type: "image", media_url: "/hennessy.png", thumbnail_url: null, cta: "Shop Now", link: "/search" },
  { id: "d2", title: "Premium Vodka", subtitle: "Spirits", media_type: "image", media_url: "/vodka.png", thumbnail_url: null, cta: "Shop Now", link: "/search" },
  { id: "d3", title: "Dark Rum", subtitle: "Caribbean", media_type: "image", media_url: "/rum.png", thumbnail_url: null, cta: "Shop Now", link: "/search" },
  { id: "d4", title: "Don Julio", subtitle: "Tequila", media_type: "image", media_url: "/donjulio.png", thumbnail_url: null, cta: "Shop Now", link: "/search" },
];

const IMAGE_DURATION_MS = 4500;
const VIDEO_MAX_DURATION_MS = 12000;
const SWIPE_THRESHOLD = 40;

type Slide = Ad | DefaultSlide;

function isDefaultSlide(s: Slide): s is DefaultSlide {
  return s.id.startsWith("d") && (s as DefaultSlide).media_url.startsWith("/");
}

export function AdCarousel() {
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const advanceTimerRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch ads from Supabase
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("ads")
      .select("*")
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setAds([]);
          return;
        }
        setAds(data as Ad[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const slides: Slide[] = (() => {
    if (ads === null) return DEFAULT_SLIDES; // still loading — show defaults to avoid empty card
    const usable = ads.filter((a) => !brokenIds.has(a.id));
    return usable.length > 0 ? usable : DEFAULT_SLIDES;
  })();

  // Reset index if it overflows after data changes
  useEffect(() => {
    if (activeIdx >= slides.length) setActiveIdx(0);
  }, [slides.length, activeIdx]);

  const goToNext = useCallback(() => {
    setActiveIdx((i) => (i + 1) % Math.max(slides.length, 1));
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setActiveIdx((i) => (i - 1 + slides.length) % Math.max(slides.length, 1));
  }, [slides.length]);

  // Auto-advance
  useEffect(() => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (slides.length <= 1) return;

    const current = slides[activeIdx];
    const isVideo = current.media_type === "video";

    if (isVideo) {
      // For videos, advance after metadata loads OR fallback timer
      const fallback = window.setTimeout(goToNext, VIDEO_MAX_DURATION_MS);
      advanceTimerRef.current = fallback;
    } else {
      advanceTimerRef.current = window.setTimeout(goToNext, IMAGE_DURATION_MS);
    }

    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    };
  }, [activeIdx, slides, goToNext]);

  const handleVideoLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v || !isFinite(v.duration) || v.duration <= 0) return;
    const ms = Math.min(v.duration * 1000, VIDEO_MAX_DURATION_MS);
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = window.setTimeout(goToNext, ms);
  };

  const handleMediaError = (slide: Slide) => {
    if (isDefaultSlide(slide)) return; // don't blacklist defaults
    setBrokenIds((prev) => {
      const next = new Set(prev);
      next.add(slide.id);
      return next;
    });
  };

  const handleSlideClick = (slide: Slide) => {
    const link = slide.link;
    if (!link) return;
    if (link.startsWith("http://") || link.startsWith("https://")) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      navigate(link);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0) goToNext();
    else goToPrev();
  };

  const current = slides[activeIdx] ?? slides[0];

  return (
    <div
      className="mx-4 mb-5 rounded-3xl overflow-hidden relative select-none"
      style={{
        height: 175,
        background: "linear-gradient(135deg, #1C1828, #0D0B14)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {slides.map((slide, i) => {
        const isActive = i === activeIdx;
        const isVideo = slide.media_type === "video";
        const isDefault = isDefaultSlide(slide);

        return (
          <div
            key={slide.id}
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              opacity: isActive ? 1 : 0,
              pointerEvents: isActive ? "auto" : "none",
            }}
          >
            {/* Background media (full bleed) for non-default ads */}
            {!isDefault && (
              <>
                {isVideo ? (
                  <video
                    ref={isActive ? videoRef : undefined}
                    src={slide.media_url}
                    poster={slide.thumbnail_url ?? undefined}
                    autoPlay={isActive}
                    muted
                    loop={false}
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={isActive ? handleVideoLoadedMetadata : undefined}
                    onError={() => handleMediaError(slide)}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <img
                    src={slide.media_url}
                    alt={slide.title ?? "Ad"}
                    onError={() => handleMediaError(slide)}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
                {/* Readability gradient over media */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(90deg, rgba(9,9,12,0.85) 0%, rgba(9,9,12,0.55) 45%, rgba(9,9,12,0.15) 100%)",
                  }}
                />
              </>
            )}

            {/* Text + product image layout (matches original hero) */}
            <button
              onClick={() => handleSlideClick(slide)}
              disabled={!slide.link}
              className="absolute inset-0 flex items-center justify-between px-6 text-left"
              style={{ cursor: slide.link ? "pointer" : "default" }}
            >
              <div className="flex-1 min-w-0 pr-3 relative z-10">
                {slide.subtitle && (
                  <p
                    className="font-inter text-xs font-semibold uppercase tracking-widest mb-1 truncate"
                    style={{
                      color: "#E4A12B",
                      textShadow: isDefault ? "none" : "0 1px 6px rgba(0,0,0,0.7)",
                    }}
                  >
                    {slide.subtitle}
                  </p>
                )}
                {slide.title && (
                  <p
                    className="font-playfair text-white font-bold text-2xl mb-3 line-clamp-2"
                    style={{
                      textShadow: isDefault ? "none" : "0 1px 8px rgba(0,0,0,0.8)",
                    }}
                  >
                    {slide.title}
                  </p>
                )}
                {slide.cta && slide.link && (
                  <span className="inline-flex items-center gap-2 press-active">
                    <span
                      className="font-inter text-sm font-semibold"
                      style={{ color: "#C91E8C" }}
                    >
                      {slide.cta}
                    </span>
                    <IoChevronForward size={14} color="#C91E8C" />
                  </span>
                )}
              </div>

              {/* Product-style PNG on the right (only for default slides) */}
              {isDefault && (
                <img
                  src={slide.media_url}
                  alt={slide.title}
                  style={{
                    width: 95,
                    height: 145,
                    objectFit: "contain",
                    filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.6))",
                  }}
                />
              )}
            </button>
          </div>
        );
      })}

      {/* Pagination dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === activeIdx ? 16 : 5,
                height: 5,
                borderRadius: 3,
                background: i === activeIdx ? "#E4A12B" : "rgba(255,255,255,0.35)",
                transition: "all 0.3s",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
