import { NextResponse, type NextRequest } from "next/server";
import { checkAccount } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";

// Pages redirect here when the session's account no longer exists (see
// getCurrentUser). Signing out has to happen in a Route Handler, because
// Server Components can't change cookies.
//
// It's a GET so a redirect can reach it, which means anyone could link to it.
// So it only signs out after the Auth server confirms the session is invalid;
// for a valid session it does nothing and goes back to the app.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if ((await checkAccount(supabase)) !== "gone") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // "local" clears this browser's session cookies without needing the
  // (deleted) account to exist on the server.
  await supabase.auth.signOut({ scope: "local" });

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "Your account no longer exists. Please sign in again.");
  return NextResponse.redirect(loginUrl);
}
