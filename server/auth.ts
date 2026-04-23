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
export async function getAuthedUser(req: Request): Promise<{ id: string; role: string | null } | null> {
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
    const role = (data.user.app_metadata as Record<string, unknown> | null | undefined)?.role;
    return { id: data.user.id, role: typeof role === "string" ? role : null };
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
