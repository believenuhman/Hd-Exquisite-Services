import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoCalendarOutline, IoLocationOutline, IoTimeOutline, IoStar, IoArrowForward, IoSparklesOutline } from "react-icons/io5";
import { supabase } from "@/lib/supabase";

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;          // ISO date, e.g. "2026-05-12"
  start_time: string | null;   // "HH:MM:SS"
  end_time: string | null;
  location_name: string | null;
  location_address: string | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  order_index: number;
  created_at: string;
};

// Today's date in the browser's local timezone, formatted as YYYY-MM-DD so we
// can compare it against the date column without TZ drift surprises.
function todayISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatEventDate(iso: string): { weekday: string; day: string; month: string; year: string } {
  // Parse YYYY-MM-DD as a local date (avoid UTC midnight shifting it back a day).
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
    day:     String(date.getDate()),
    month:   date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    year:    String(date.getFullYear()),
  };
}

export function formatTimeRange(start: string | null, end: string | null): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start)       return fmt(start);
  if (end)         return `Until ${fmt(end)}`;
  return "All day";
}

async function fetchUpcomingEvents(): Promise<EventRow[]> {
  const today = todayISODate();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_active", true)
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false })
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export function Events() {
  const navigate = useNavigate();
  const [events,  setEvents]  = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [migrationMissing, setMigrationMissing] = useState(false);

  const reload = () => {
    setError(null);
    fetchUpcomingEvents()
      .then((data) => { setEvents(data); setMigrationMissing(false); })
      .catch((e: unknown) => {
        const msg = (e as { message?: string })?.message ?? "Failed to load events.";
        // PostgREST error for missing relation reads as something like
        // 'relation "public.events" does not exist'. We surface a friendly
        // "migration not applied" panel instead of a scary error.
        if (/does not exist|schema cache|not find/i.test(msg)) {
          setMigrationMissing(true);
          setEvents([]);
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // Live updates: any insert/update/delete on the events table re-fetches.
    // Requires the events table to be in the supabase_realtime publication
    // (the migration adds it). If realtime isn't available the page still
    // works — it just won't auto-refresh.
    const channel = supabase
      .channel("public:events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const featured = useMemo(() => events.find((e) => e.is_featured) ?? null, [events]);
  const rest     = useMemo(() => featured ? events.filter((e) => e.id !== featured.id) : events, [events, featured]);

  return (
    <div style={{ minHeight: "100vh", background: "#09090C", color: "#fff", paddingBottom: 96 }}>
      {/* Header */}
      <div style={{
        padding: "20px 20px 12px",
        borderBottom: "1px solid rgba(228,161,43,0.12)",
        background: "linear-gradient(180deg, rgba(228,161,43,0.06), transparent)",
      }}>
        <div style={{ fontSize: 11, color: "#8C8C95", letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 600 }}>
          HD Xquisite Liquors
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, fontFamily: "'Playfair Display', Georgia, serif" }}>
          Upcoming Events
        </div>
        <div style={{ fontSize: 13, color: "#A8A8B0", marginTop: 4 }}>
          Pop-ups, tastings, and on-site bars
        </div>
      </div>

      {loading && (
        <div style={{ padding: 60, textAlign: "center", color: "#8C8C95" }}>
          Loading events…
        </div>
      )}

      {migrationMissing && !loading && (
        <div style={{ margin: "20px", padding: 16, borderRadius: 12, background: "rgba(228,161,43,0.08)", border: "1px solid rgba(228,161,43,0.3)", color: "#E4A12B", fontSize: 13, lineHeight: 1.55 }}>
          <strong>Events not yet enabled.</strong> Apply{" "}
          <code style={{ background: "rgba(0,0,0,0.3)", padding: "1px 6px", borderRadius: 4 }}>supabase-events-migration.sql</code>{" "}
          in your Supabase SQL editor to switch this page on.
        </div>
      )}

      {error && !loading && (
        <div style={{ margin: "20px", padding: 14, borderRadius: 10, background: "rgba(220,53,69,0.1)", border: "1px solid rgba(220,53,69,0.3)", color: "#FF6B7A", fontSize: 13 }}>
          {error}
        </div>
      )}

      {!loading && !migrationMissing && !error && events.length === 0 && (
        <div style={{ padding: "80px 32px", textAlign: "center" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 18px",
            background: "rgba(228,161,43,0.10)",
            border: "1px solid rgba(228,161,43,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#E4A12B",
          }}>
            <IoSparklesOutline size={32} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
            No events scheduled yet
          </div>
          <div style={{ fontSize: 13, color: "#8C8C95", lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
            Check back soon — we'll announce our next pop-up, tasting, and
            on-site bar appearances right here.
          </div>
        </div>
      )}

      {/* Featured event */}
      {featured && (
        <div style={{ padding: "16px 20px 4px" }}>
          <div style={{ fontSize: 10, color: "#E4A12B", letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 700, marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IoStar size={12} /> Featured
          </div>
          <FeaturedCard event={featured} onOpen={() => navigate(`/events/${featured.id}`)} />
        </div>
      )}

      {/* Standard event list */}
      {rest.length > 0 && (
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {featured && (
            <div style={{ fontSize: 10, color: "#8C8C95", letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 600, marginBottom: 2 }}>
              More events
            </div>
          )}
          {rest.map((ev) => <EventCard key={ev.id} event={ev} onOpen={() => navigate(`/events/${ev.id}`)} />)}
        </div>
      )}
    </div>
  );
}

function FeaturedCard({ event, onOpen }: { event: EventRow; onOpen: () => void }) {
  const d = formatEventDate(event.event_date);
  return (
    <button
      onClick={onOpen}
      style={{
        display: "block", width: "100%", textAlign: "left",
        background: "linear-gradient(135deg, rgba(228,161,43,0.18), rgba(201,30,140,0.10))",
        border: "1px solid rgba(228,161,43,0.45)",
        borderRadius: 18, overflow: "hidden", cursor: "pointer",
        boxShadow: "0 12px 30px rgba(228,161,43,0.10)",
        padding: 0,
      }}
      className="press-active"
    >
      {event.image_url ? (
        <div style={{ width: "100%", aspectRatio: "16/9", background: "#15151B", overflow: "hidden" }}>
          <img src={event.image_url} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      ) : (
        <div style={{ width: "100%", aspectRatio: "16/9", background: "linear-gradient(135deg, #2a1a0a, #150a14)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(228,161,43,0.6)" }}>
          <IoCalendarOutline size={48} />
        </div>
      )}
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{
            flexShrink: 0, width: 60, padding: "8px 0", textAlign: "center",
            background: "rgba(0,0,0,0.4)", borderRadius: 10,
            border: "1px solid rgba(228,161,43,0.3)",
          }}>
            <div style={{ fontSize: 9, color: "#E4A12B", letterSpacing: 1.2, fontWeight: 700 }}>{d.month}</div>
            <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: "#fff", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{d.day}</div>
            <div style={{ fontSize: 9, color: "#8C8C95", marginTop: 2 }}>{d.weekday}</div>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, color: "#fff" }}>
              {event.title}
            </div>
            {event.location_name && (
              <div style={{ fontSize: 12, color: "#D8D8DE", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <IoLocationOutline size={13} /> {event.location_name}
              </div>
            )}
            {(event.start_time || event.end_time) && (
              <div style={{ fontSize: 12, color: "#A8A8B0", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <IoTimeOutline size={13} /> {formatTimeRange(event.start_time, event.end_time)}
              </div>
            )}
          </div>
        </div>
        <div style={{
          marginTop: 14,
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 999,
          background: "linear-gradient(135deg, #D4901A, #F5C842)",
          color: "#0A0A0F", fontWeight: 700, fontSize: 13,
        }}>
          View Details <IoArrowForward size={14} />
        </div>
      </div>
    </button>
  );
}

function EventCard({ event, onOpen }: { event: EventRow; onOpen: () => void }) {
  const d = formatEventDate(event.event_date);
  return (
    <button
      onClick={onOpen}
      style={{
        display: "flex", gap: 12, width: "100%", textAlign: "left",
        padding: 12, borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
      }}
      className="press-active"
    >
      {/* Date pill */}
      <div style={{
        flexShrink: 0, width: 56, padding: "8px 0", textAlign: "center",
        background: "rgba(228,161,43,0.10)", borderRadius: 10,
        border: "1px solid rgba(228,161,43,0.25)",
        alignSelf: "flex-start",
      }}>
        <div style={{ fontSize: 9, color: "#E4A12B", letterSpacing: 1.2, fontWeight: 700 }}>{d.month}</div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: "#fff", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{d.day}</div>
        <div style={{ fontSize: 9, color: "#8C8C95", marginTop: 2 }}>{d.weekday}</div>
      </div>

      {/* Thumbnail */}
      {event.image_url ? (
        <div style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", background: "#15151B", flexShrink: 0 }}>
          <img src={event.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : null}

      {/* Body */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
          {event.title}
        </div>
        {event.location_name && (
          <div style={{ fontSize: 11, color: "#A8A8B0", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <IoLocationOutline size={12} /> {event.location_name}
          </div>
        )}
        {(event.start_time || event.end_time) && (
          <div style={{ fontSize: 11, color: "#8C8C95", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <IoTimeOutline size={12} /> {formatTimeRange(event.start_time, event.end_time)}
          </div>
        )}
      </div>

      <IoArrowForward size={18} color="#E4A12B" style={{ alignSelf: "center", flexShrink: 0 }} />
    </button>
  );
}
