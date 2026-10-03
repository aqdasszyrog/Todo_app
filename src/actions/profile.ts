"use server";

import { revalidatePath } from "next/cache";
import { NAME_MAX_LENGTH } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error?: string };

// Digits plus the usual separators, optionally starting with "+".
const PHONE_PATTERN = /^\+?[0-9 ()\-.]+$/;

// Like the task actions, this checks the session and validates input itself;
// RLS makes sure only the caller's own profile row can be updated.
export async function updateProfile(input: { name: string; phone: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { error: "You're signed out. Please log in again." };

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { error: "Name can't be empty." };
  if (name.length > NAME_MAX_LENGTH) return { error: `Keep your name under ${NAME_MAX_LENGTH} characters.` };

  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  if (phone) {
    const digits = phone.replace(/\D/g, "").length;
    if (!PHONE_PATTERN.test(phone) || digits < 7 || phone.length > 20) {
      return { error: "Enter a valid phone number, e.g. +44 7700 900123." };
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ name, phone: phone || null })
    .eq("id", claims.claims.sub)
    .select("id");

  if (error) {
    console.error("updateProfile failed:", error);
    return { error: "Couldn't save your profile. Try again." };
  }
  // RLS turns a blocked update into "0 rows changed" rather than an error,
  // so without this check the form would say "Saved" when nothing was.
  if (!data?.length) {
    console.error("updateProfile matched no rows for user", claims.claims.sub);
    return { error: "Couldn't save your profile. Try again." };
  }

  // The header shows the name on every page, so refresh the whole layout.
  revalidatePath("/", "layout");
  return {};
}
