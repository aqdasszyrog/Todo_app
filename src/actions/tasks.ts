"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_PRIORITY,
  isDueDate,
  isPriority,
  isProgress,
  TITLE_MAX_LENGTH,
  type Priority,
  type Progress,
} from "@/lib/tasks";

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

// Empty means "no due date"; anything else must be a real YYYY-MM-DD date.
function validateDueDate(dueDate: unknown): string | null | { error: string } {
  if (dueDate === null || dueDate === "") return null;
  return isDueDate(dueDate) ? dueDate : { error: "Pick a valid due date." };
}

type TaskChanges = { title?: string; progress?: Progress; priority?: Priority; due_date?: string | null };

export async function addTask(input: {
  title: string;
  priority?: Priority;
  dueDate?: string | null;
}): Promise<ActionResult> {
  const supabase = await getAuthedClient();
  if (!supabase) return { error: "You're signed out. Please log in again." };

  const title = validateTitle(input.title);
  if (typeof title !== "string") return title;

  const priority = input.priority ?? DEFAULT_PRIORITY;
  if (!isPriority(priority)) return { error: "Invalid priority." };

  const dueDate = validateDueDate(input.dueDate ?? null);
  if (dueDate !== null && typeof dueDate !== "string") return dueDate;

  // user_id defaults to auth.uid() in the database, so we don't send it.
  const { error } = await supabase
    .from("user_tasks")
    .insert({ title, priority, due_date: dueDate });
  if (error) return { error: "Couldn't add the task. Try again." };

  revalidatePath("/");
  return {};
}

export async function updateTask(
  id: number,
  input: { title?: string; progress?: Progress; priority?: Priority; dueDate?: string | null },
): Promise<ActionResult> {
  const supabase = await getAuthedClient();
  if (!supabase) return { error: "You're signed out. Please log in again." };

  const changes: TaskChanges = {};

  if (input.title !== undefined) {
    const title = validateTitle(input.title);
    if (typeof title !== "string") return title;
    changes.title = title;
  }
  if (input.progress !== undefined) {
    if (!isProgress(input.progress)) return { error: "Invalid progress value." };
    changes.progress = input.progress;
  }
  if (input.priority !== undefined) {
    if (!isPriority(input.priority)) return { error: "Invalid priority." };
    changes.priority = input.priority;
  }
  if (input.dueDate !== undefined) {
    const dueDate = validateDueDate(input.dueDate);
    if (dueDate !== null && typeof dueDate !== "string") return dueDate;
    changes.due_date = dueDate;
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
