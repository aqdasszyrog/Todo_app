"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient, SIGNED_OUT, type ActionResult } from "@/lib/actions";
import { DEFAULT_PRIORITY, type Priority, type TaskChangesInput } from "@/lib/tasks";
import {
  isInvalid,
  validateDueDate,
  validatePriority,
  validateTaskChanges,
  validateTitle,
} from "@/lib/validation";
import { logError } from "@/lib/log";

export async function addTask(input: {
  title: string;
  priority?: Priority;
  dueDate?: string | null;
}): Promise<ActionResult> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;
  const { supabase } = session;

  const title = validateTitle(input.title);
  if (isInvalid(title)) return title;

  const priority = validatePriority(input.priority ?? DEFAULT_PRIORITY);
  if (isInvalid(priority)) return priority;

  const dueDate = validateDueDate(input.dueDate);
  if (isInvalid(dueDate)) return dueDate;

  // user_id defaults to auth.uid() in the database, so we don't send it.
  const { error } = await supabase
    .from("user_tasks")
    .insert({ title, priority, due_date: dueDate });
  if (error) {
    logError("addTask failed", error);
    return { error: "Couldn't add the task. Try again." };
  }

  revalidatePath("/");
  return {};
}

export async function updateTask(id: number, input: TaskChangesInput): Promise<ActionResult> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;
  const { supabase } = session;

  const changes = validateTaskChanges(input);
  if (isInvalid(changes)) return changes;
  if (Object.keys(changes).length === 0) return {};

  const { data, error } = await supabase
    .from("user_tasks")
    .update(changes)
    .eq("id", id)
    .select("id");

  if (error) {
    logError("updateTask failed", error);
    return { error: "Couldn't save changes. Try again." };
  }
  // RLS hides other users' rows, so a foreign id simply matches nothing.
  if (!data?.length) return { error: "Task not found." };

  revalidatePath("/");
  return {};
}

export async function deleteTask(id: number): Promise<ActionResult> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;
  const { supabase } = session;

  const { data, error } = await supabase
    .from("user_tasks")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    logError("deleteTask failed", error);
    return { error: "Couldn't delete the task. Try again." };
  }
  if (!data?.length) return { error: "Task not found." };

  revalidatePath("/");
  return {};
}
