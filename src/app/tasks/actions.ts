"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isProgress, TITLE_MAX_LENGTH, type Progress } from "@/lib/tasks";

type ActionResult = { error?: string };

// Server Actions can be called with a direct POST request, so every action
// checks the session itself and validates its input. RLS in Postgres is the
// final guard: queries only ever touch the logged-in user's rows.
async function getAuthedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ? supabase : null;
}

function validateTitle(title: unknown): string | { error: string } {
  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "Task title can't be empty." };
  }
  if (title.trim().length > TITLE_MAX_LENGTH) {
    return { error: `Keep it under ${TITLE_MAX_LENGTH} characters.` };
  }
  return title.trim();
}

export async function addTask(input: { title: string }): Promise<ActionResult> {
  const supabase = await getAuthedClient();
  if (!supabase) return { error: "You're signed out. Please log in again." };

  const title = validateTitle(input.title);
  if (typeof title !== "string") return title;

  // user_id defaults to auth.uid() in the database, so we don't send it.
  const { error } = await supabase.from("user_tasks").insert({ title });
  if (error) return { error: "Couldn't add the task. Try again." };

  revalidatePath("/");
  return {};
}

export async function updateTask(
  id: number,
  input: { title?: string; progress?: Progress },
): Promise<ActionResult> {
  const supabase = await getAuthedClient();
  if (!supabase) return { error: "You're signed out. Please log in again." };

  const changes: { title?: string; progress?: Progress } = {};

  if (input.title !== undefined) {
    const title = validateTitle(input.title);
    if (typeof title !== "string") return title;
    changes.title = title;
  }
  if (input.progress !== undefined) {
    if (!isProgress(input.progress)) return { error: "Invalid progress value." };
    changes.progress = input.progress;
  }
  if (Object.keys(changes).length === 0) return {};

  const { data, error } = await supabase
    .from("user_tasks")
    .update(changes)
    .eq("id", id)
    .select("id");

  if (error) return { error: "Couldn't save changes. Try again." };
  // RLS hides other users' rows, so a foreign id simply matches nothing.
  if (!data?.length) return { error: "Task not found." };

  revalidatePath("/");
  return {};
}

export async function deleteTask(id: number): Promise<ActionResult> {
  const supabase = await getAuthedClient();
  if (!supabase) return { error: "You're signed out. Please log in again." };

  const { data, error } = await supabase
    .from("user_tasks")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { error: "Couldn't delete the task. Try again." };
  if (!data?.length) return { error: "Task not found." };

  revalidatePath("/");
  return {};
}
