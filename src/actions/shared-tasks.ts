"use server";

import { getAuthedClient, SIGNED_OUT, type ActionResult } from "@/lib/actions";
import {
  fetchSharedTasks,
  MAX_INVITES,
  MAX_MEMBERS,
  SHARED_TASK_COLUMNS,
  type FoundUser,
  type SharedTask,
  type SharedTaskFields,
  type SharedTaskPerson,
} from "@/lib/shared-tasks";
import { DEFAULT_PRIORITY, type Priority, type TaskChangesInput } from "@/lib/tasks";
import {
  isInvalid,
  validateDueDate,
  validateEmail,
  validatePriority,
  validateTaskChanges,
  validateTitle,
} from "@/lib/validation";
import { logError } from "@/lib/log";

// These actions don't revalidate /shared. Each returns what changed so the
// caller's list updates at once, and the database broadcasts the same change
// to everyone else on the task (011_scalable_realtime.sql). Re-rendering the
// page for every member on every change is what this avoids.

// Postgres error codes raised by the functions in 007_shared_tasks.sql.
const NOT_ALLOWED = "42501";
const NOT_FOUND = "P0002";

const INVITE_MESSAGE: Record<string, string> = {
  not_found: "No user found with that email.",
  self: "That's you. You're already the owner.",
  already_member: "They're already a member of this task.",
  already_invited: "They've already been invited.",
  full: `A task can have up to ${MAX_MEMBERS} people.`,
};

/** Checks that an email belongs to a user, for the invite field. */
export async function findUserByEmail(email: string): Promise<ActionResult & { user?: FoundUser }> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;

  const value = validateEmail(email);
  if (isInvalid(value)) return value;

  const { data, error } = await session.supabase.rpc("find_user_by_email", { p_email: value });
  if (error) {
    logError("find_user_by_email failed", error);
    return { error: "Couldn't check that email. Try again." };
  }

  const user = data[0];
  if (!user) return { error: INVITE_MESSAGE.not_found };
  if (user.id === session.userId) return { error: INVITE_MESSAGE.self };
  return { user };
}

export async function createSharedTask(input: {
  title: string;
  priority?: Priority;
  dueDate?: string | null;
  emails: string[];
}): Promise<ActionResult & { task?: SharedTask }> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;

  const title = validateTitle(input.title);
  if (isInvalid(title)) return title;

  const priority = validatePriority(input.priority ?? DEFAULT_PRIORITY);
  if (isInvalid(priority)) return priority;

  const dueDate = validateDueDate(input.dueDate);
  if (isInvalid(dueDate)) return dueDate;

  if (!Array.isArray(input.emails) || input.emails.length === 0) {
    return { error: "Add at least one person to share this task with." };
  }
  const emails = new Set<string>();
  for (const raw of input.emails) {
    const email = validateEmail(raw);
    if (isInvalid(email)) return email;
    emails.add(email);
  }
  if (emails.size > MAX_INVITES) return { error: `You can invite up to ${MAX_INVITES} people.` };

  // One transaction: if any email isn't a user, nothing is created.
  const { data: taskId, error } = await session.supabase.rpc("create_shared_task", {
    p_title: title,
    p_priority: priority,
    p_due_date: dueDate,
    p_emails: [...emails],
  });

  if (error) {
    if (error.code === NOT_FOUND) return { error: "One of those emails doesn't belong to a user." };
    logError("create_shared_task failed", error);
    return { error: "Couldn't create the shared task. Try again." };
  }

  return { task: await loadTask(session.supabase, taskId) };
}

export async function inviteToSharedTask(
  taskId: number,
  email: string,
): Promise<ActionResult & { people?: SharedTaskPerson[] }> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;

  const value = validateEmail(email);
  if (isInvalid(value)) return value;

  const { data, error } = await session.supabase.rpc("invite_to_shared_task", {
    p_task_id: taskId,
    p_email: value,
  });

  if (error) {
    if (error.code === NOT_ALLOWED) return { error: "Only the owner can invite people." };
    logError("invite_to_shared_task failed", error);
    return { error: "Couldn't send the invite. Try again." };
  }
  if (data !== "invited") return { error: INVITE_MESSAGE[data] ?? "Couldn't send the invite." };

  return { people: (await loadTask(session.supabase, taskId))?.people };
}

export async function updateSharedTask(
  taskId: number,
  input: TaskChangesInput,
): Promise<ActionResult & { task?: SharedTaskFields }> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;

  const changes = validateTaskChanges(input);
  if (isInvalid(changes)) return changes;
  if (Object.keys(changes).length === 0) return {};

  // A database trigger rejects changes other than progress from non-owners.
  const { data, error } = await session.supabase
    .from("shared_tasks")
    .update(changes)
    .eq("id", taskId)
    .select(SHARED_TASK_COLUMNS);

  if (error) {
    if (error.code === NOT_ALLOWED) return { error: "Only the owner can change that." };
    logError("updateSharedTask failed", error);
    return { error: "Couldn't save changes. Try again." };
  }
  if (!data.length) return { error: "Task not found." };

  return { task: data[0] };
}

export async function deleteSharedTask(taskId: number): Promise<ActionResult> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;

  // RLS only lets the owner delete, so anyone else matches no rows.
  const { data, error } = await session.supabase
    .from("shared_tasks")
    .delete()
    .eq("id", taskId)
    .select("id");

  if (error) {
    logError("deleteSharedTask failed", error);
    return { error: "Couldn't delete the task. Try again." };
  }
  if (!data.length) return { error: "Only the owner can delete this task." };
  return {};
}

/** Owner removing someone, or a member leaving (memberId = their own id). */
export async function removeSharedTaskMember(taskId: number, memberId: string): Promise<ActionResult> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;

  const { data, error } = await session.supabase
    .from("shared_task_members")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", memberId)
    .select("user_id");

  if (error) {
    logError("removeSharedTaskMember failed", error);
    return { error: "Couldn't update the members. Try again." };
  }
  if (!data.length) return { error: "That person isn't on this task anymore." };
  return {};
}

/** The task as the list shows it. Undefined if it can't be read back. */
async function loadTask(
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthedClient>>>["supabase"],
  taskId: number,
) {
  try {
    return (await fetchSharedTasks(supabase, { taskId }))[0];
  } catch (error) {
    // The change itself succeeded; the broadcast will still bring it in.
    logError("loading shared task after change failed", error);
    return undefined;
  }
}
