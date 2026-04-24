import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  IoArrowBack, IoCalendarOutline, IoTimeOutline, IoLocationOutline,
  IoNavigate, IoCalendar, IoStar,
} from "react-icons/io5";
import { supabase } from "@/lib/supabase";
import { type EventRow, formatEventDate, formatTimeRange } from "./Events";

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event,   setEvent]   = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    supabase.from("events").select("*").eq("id", id).maybeSingle()
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else if (!data || (data as EventRow).is_active === false) {
          setError("This event is no longer available.");
        } else {
          setEvent(data as EventRow);
        }
      })
      .catch((e: unknown) => setError((e as Error)?.message ?? "Failed to load event."))
      .finally(() => setLoading(false));
  }, [id]);

  const directionsUrl = (() => {
    if (!event) return null;
    const q = event.location_address?.trim() || event.location_name?.trim();
    if (!q) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  })();

  // Build a Google Calendar "Add event" URL the user can save in one tap.
  const calendarUrl = (() => {
    if (!event) return null;
    // YYYYMMDD with optional THHMMSS format expected by Google Calendar.
    const dateNoDashes = event.event_date.replace(/-/g, "");
    const start = event.start_time
      ? `${dateNoDashes}T${event.start_time.replace(/:/g, "").slice(0, 6)}`
      : dateNoDashes;
    const end = event.end_time
      ? `${dateNoDashes}T${event.end_time.replace(/:/g, "").slice(0, 6)}`
      : event.start_time
        ? `${dateNoDashes}T${event.start_time.replace(/:/g, "").slice(0, 6)}`
        : dateNoDashes;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text:    event.title,
      dates:   `${start}/${end}`,
      details: event.description ?? "",
      location: [event.location_name, event.location_address].filter(Boolean).join(", "),
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  })();

  return (
    <div style={{ minHeight: "100vh", background: "#09090C", color: "#fff", paddingBottom: 60 }}>
      {/* Back button overlay */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: "absolute", top: 16, left: 16, zIndex: 10,
          width: 40, height: 40, borderRadius: 999,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}
        aria-label="Back"
      >
        <IoArrowBack size={20} />
      </button>

      {loading && <div style={{ padding: 60, textAlign: "center", color: "#8C8C95" }}>Loading…</div>}

      {error && !loading && (
        <div style={{ padding: 80, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Event unavailable</div>
          <div style={{ fontSize: 13, color: "#8C8C95", maxWidth: 280, margin: "0 auto", lineHeight: 1.6 }}>{error}</div>
          <button onClick={() => navigate("/events")} style={{
            marginTop: 24, padding: "10px 18px", borderRadius: 999,
            background: "linear-gradient(135deg, #D4901A, #F5C842)",
            color: "#0A0A0F", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>Back to events</button>
        </div>
      )}

      {event && !loading && !error && <EventBody event={event} directionsUrl={directionsUrl} calendarUrl={calendarUrl} />}
    </div>
  );
}

function EventBody({
  event, directionsUrl, calendarUrl,
}: {
  event: EventRow;
  directionsUrl: string | null;
  calendarUrl: string | null;
}) {
  const d = formatEventDate(event.event_date);
  return (
    <>
      {/* Hero image */}
      {event.image_url ? (
        <div style={{ width: "100%", aspectRatio: "4/3", background: "#15151B", overflow: "hidden" }}>
          <img src={event.image_url} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      ) : (
        <div style={{ width: "100%", aspectRatio: "4/3", background: "linear-gradient(135deg, #2a1a0a, #150a14)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(228,161,43,0.5)" }}>
          <IoCalendarOutline size={64} />
        </div>
      )}

      <div style={{ padding: "20px 20px 0" }}>
        {event.is_featured && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 999,
            background: "rgba(228,161,43,0.16)", color: "#E4A12B",
            border: "1px solid rgba(228,161,43,0.4)",
            fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
            marginBottom: 12,
          }}>
            <IoStar size={11} /> Featured Event
          </div>
        )}

        <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }}>
          {event.title}
        </h1>

        {/* Meta row */}
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <MetaRow icon={<IoCalendarOutline size={18} />} label={`${d.weekday}, ${d.month} ${d.day} ${d.year}`} />
          <MetaRow icon={<IoTimeOutline size={18} />} label={formatTimeRange(event.start_time, event.end_time)} />
          {(event.location_name || event.location_address) && (
            <MetaRow
              icon={<IoLocationOutline size={18} />}
              label={
                <span>
                  {event.location_name && <span style={{ fontWeight: 600, color: "#fff" }}>{event.location_name}</span>}
                  {event.location_name && event.location_address && <br />}
                  {event.location_address && <span style={{ color: "#A8A8B0" }}>{event.location_address}</span>}
                </span>
              }
            />
          )}
        </div>

        {/* CTA buttons */}
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 18px", borderRadius: 12,
                background: "linear-gradient(135deg, #D4901A, #F5C842)",
                color: "#0A0A0F", fontWeight: 700, fontSize: 14,
                textDecoration: "none",
              }}
              className="press-active"
            >
              <IoNavigate size={16} /> Get Directions
            </a>
          )}
          {calendarUrl && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(228,161,43,0.4)",
                color: "#E4A12B", fontWeight: 600, fontSize: 13,
                textDecoration: "none",
              }}
              className="press-active"
            >
              <IoCalendar size={15} /> Add to Calendar
            </a>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 11, color: "#8C8C95", letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
              About this event
            </div>
            <div style={{ fontSize: 14, color: "#D8D8DE", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {event.description}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MetaRow({ icon, label }: { icon: React.ReactNode; label: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "rgba(228,161,43,0.10)",
        border: "1px solid rgba(228,161,43,0.25)",
        color: "#E4A12B",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 14, color: "#D8D8DE", lineHeight: 1.45, paddingTop: 7 }}>
        {label}
      </div>
    </div>
  );
}
