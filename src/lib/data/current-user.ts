import { cache } from "react";
import { redirect } from "next/navigation";
import { logError } from "@/lib/log";
import type { Profile } from "@/lib/profile";
import { checkAccount } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";

// PostgREST's code for `.single()` matching no rows.
const NO_ROWS = "PGRST116";

/** Where to send a session whose account no longer exists. See that route. */
export const SESSION_ENDED_PATH = "/auth/session-ended";

const PROFILE_COLUMNS = "name, email, phone, created_at";

// The (app) layout and its pages both need the profile; cache() makes them
// share one query per request instead of each fetching it.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/login");
  const userId = claims.claims.sub;

  const loadProfile = () =>
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .single()
      .overrideTypes<Profile, { merge: false }>();

  // RLS limits this to the logged-in user's own row.
  let { data: profile, error } = await loadProfile();

  // getClaims() only checks the token's signature, so a token issued before
  // the account was deleted keeps passing until it expires. A missing profile
  // is the sign of that, so ask the Auth server whether the account exists.
  if (error?.code === NO_ROWS) {
    const account = await checkAccount(supabase);
    if (account === "gone") redirect(SESSION_ENDED_PATH);

    if (account === "exists") {
      // The account exists but its profile row was deleted: rebuild it.
      const { error: ensureError } = await supabase.rpc("ensure_profile");
      if (ensureError) logError("ensure_profile failed", ensureError);
      ({ data: profile, error } = await loadProfile());
    }
  }

  if (error) logError("getCurrentUser profile failed", error);
  return { userId, profile };
});
