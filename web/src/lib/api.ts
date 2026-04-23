// Lightweight `fetch` helper that automatically attaches the current Supabase
// access token as `Authorization: Bearer …`. The server uses this header to
// derive the authenticated user — never the request body — so any endpoint
// that gates pricing, membership state, or coupon attribution must be called
// through this helper for guests AND signed-in users alike.
import { supabase } from "@/lib/supabase";

export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  } catch {
    // Anonymous users — proceed without an Authorization header.
  }
  return fetch(input, { ...init, headers });
}
