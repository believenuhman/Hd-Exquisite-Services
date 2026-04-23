import type { Request } from "express";
import { getSupabaseAdmin } from "./payment";

// Resolve the authenticated user id from a Supabase access token in the
// `Authorization: Bearer <jwt>` header. Returns null for guests / invalid tokens.
//
// CRITICAL: never trust a user_id that the client puts in the request body.
// Anything that grants discounts, attribution, or membership state MUST go
// through this function so the identity comes from a verified JWT.
export async function getAuthedUserId(req: Request): Promise<string | null> {
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
    return data.user.id;
  } catch (err) {
    console.warn("[auth] getAuthedUserId failed:", err);
    return null;
  }
}
