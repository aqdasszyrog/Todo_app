import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";
import type { Database } from "./database.types";

// Supabase client that uses the secret key and so bypasses RLS. Server-only,
// and only for writes no user is allowed to make themselves: today that's
// the plan and billing columns, which change when Stripe says so.
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing environment variable SUPABASE_SECRET_KEY. See .env.example.");

  return createClient<Database>(SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
