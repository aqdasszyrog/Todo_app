import { createClient } from "@/lib/supabase/server";

// Shared plumbing for Server Actions (src/actions/*).

export type ActionResult = { error?: string };

export const SIGNED_OUT: ActionResult = { error: "You're signed out. Please log in again." };

// Server Actions can be called with a direct POST request, so every action
// checks the session itself and validates its input. RLS in Postgres is the
// final guard on which rows a query can touch.
export async function getAuthedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ? { supabase, userId: data.claims.sub } : null;
}
