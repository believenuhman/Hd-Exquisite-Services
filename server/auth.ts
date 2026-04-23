import type { Request } from "express";
import { getSupabaseAdmin } from "./payment";

// Resolve the authenticated user id from a Supabase access token in the
// `Authorization: Bearer <jwt>` header. Returns null for guests / invalid tokens.
//
// CRITICAL: never trust a user_id that the client puts in the request body.
// Anything that grants discounts, attribution, or membership state MUST go
// through this function so the identity comes from a verified JWT.
export async function getAuthedUserId(req: Request): Promise<string | null> {
  const user = await getAuthedUser(req);
  return user?.id ?? null;
}

// Resolve the full Supabase user object (including `app_metadata`) from the
// `Authorization: Bearer <jwt>` header. Returns null for guests / invalid
// tokens. Use this when you need to inspect role claims (admin gating, etc).
export async function getAuthedUser(req: Request): Promise<{
  id: string;
  role: string | null;
  location: string | null;
} | null> {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return null;
  const token = m[1].trim();
  if (!token) return null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    const meta = (data.user.app_metadata as Record<string, unknown> | null | undefined) ?? {};
    const role     = typeof meta.role     === "string" ? meta.role     : null;
    const location = typeof meta.location === "string" ? meta.location : null;
    return { id: data.user.id, role, location };
  } catch (err) {
    console.warn("[auth] getAuthedUser failed:", err);
    return null;
  }
}

// Authorization check: returns the admin user id if the caller's JWT carries
// `app_metadata.role = 'admin'`. Returns null otherwise. Authorization roles
// MUST live in `app_metadata` (set by service role or the Supabase dashboard)
// — not `user_metadata`, which any signed-in user can write.
export async function requireAdmin(req: Request): Promise<string | null> {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "admin") return null;
  return user.id;
}

// Admin context — accepts EITHER a super admin OR a location admin.
// Super admin: { role: 'admin', locationSlug: null } — full access.
// Location admin: { role: 'location_admin', locationSlug: 'bridgetown'|'st_george' }
//   — restricted to data scoped to their own location.
//
// Use this for endpoints that should be available to both kinds of admin
// (orders list, inventory, etc) and apply scoping in the route handler.
export type AdminContext = {
  userId: string;
  role: "admin" | "location_admin";
  locationSlug: string | null;
};

export async function getAdminContext(req: Request): Promise<AdminContext | null> {
  const user = await getAuthedUser(req);
  if (!user) return null;
  if (user.role === "admin") {
    return { userId: user.id, role: "admin", locationSlug: null };
  }
  if (user.role === "location_admin" && user.location && /^[a-z0-9_]+$/.test(user.location)) {
    return { userId: user.id, role: "location_admin", locationSlug: user.location };
  }
  return null;
}
