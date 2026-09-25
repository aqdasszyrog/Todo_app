import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google redirects back to Supabase, which redirects here with a one-time
// `code`. Exchanging it creates the session and sets the auth cookies.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Could not sign you in")}`,
  );
}
