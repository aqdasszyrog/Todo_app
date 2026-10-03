import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/profile";

// The (app) layout and its pages both need the profile; cache() makes them
// share one query per request instead of each fetching it.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims!.claims.sub;

  // RLS limits this to the logged-in user's own row.
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, phone, created_at")
    .eq("id", userId)
    .single()
    .overrideTypes<Profile, { merge: false }>();

  return { userId, profile };
});
