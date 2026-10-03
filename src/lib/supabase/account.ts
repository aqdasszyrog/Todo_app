import { isAuthApiError, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Asks the Auth server (not just the token's signature) whether the session's
 * account still exists. Only a definite rejection counts as "gone"; network
 * or server errors return "unknown" so a hiccup never signs anyone out.
 */
export async function checkAccount(supabase: SupabaseClient): Promise<"exists" | "gone" | "unknown"> {
  const { error } = await supabase.auth.getUser();
  if (!error) return "exists";
  if (isAuthApiError(error) && [401, 403, 404].includes(error.status)) return "gone";
  return "unknown";
}
