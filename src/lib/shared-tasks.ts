import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import type { Priority, Progress } from "./tasks";

// Must match supabase/migrations/007_shared_tasks.sql and 011_scalable_realtime.sql

/** "owner" for the task's creator; otherwise the member's invite status. */
export type MemberRole = "owner" | "invited" | "accepted";

export type SharedTaskPerson = {
  user_id: string;
  name: string | null;
  email: string | null;
  role: MemberRole;
};

/** A shared_tasks row. */
export type SharedTaskFields = {
  id: number;
  owner_id: string;
  title: string;
  description: string | null;
  progress: Progress;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type SharedTask = SharedTaskFields & {
  /** Owner first, then accepted members, then pending invites. */
  people: SharedTaskPerson[];
};

export const SHARED_TASK_COLUMNS =
  "id, owner_id, title, description, progress, priority, due_date, created_at, updated_at";

/** Shared tasks loaded at a time ("Load more" fetches the next batch). */
export const SHARED_TASKS_PAGE_SIZE = 20;

/** Most people that can be invited when creating a task. */
export const MAX_INVITES = 20;

/**
 * Most people on one task, invited or joined. Every chat message is sent to
 * each of them, so this bounds the work per message. Enforced in
 * invite_to_shared_task() (011_scalable_realtime.sql).
 */
export const MAX_MEMBERS = 50;

export type FoundUser = { id: string; name: string | null; email: string };

export function personLabel(person: { name: string | null; email: string | null }) {
  return person.name ?? person.email ?? "Unknown user";
}

/**
 * One page of the shared tasks the user owns or has joined, newest first,
 * each with its people. Pass `beforeId` for the next page, or `taskId` for
 * just that task. Works with the server or the browser client.
 */
export async function fetchSharedTasks(
  supabase: SupabaseClient<Database>,
  options: { beforeId?: number; taskId?: number } = {},
): Promise<SharedTask[]> {
  const { data, error } = await supabase.rpc("my_shared_tasks", {
    p_before_id: options.beforeId ?? null,
    p_limit: SHARED_TASKS_PAGE_SIZE,
    p_task_id: options.taskId ?? null,
  });
  if (error) throw error;
  // `people` is built by shared_task_people_json() in the same migration.
  return data.map((row) => ({ ...row, people: row.people as SharedTaskPerson[] }));
}

/**
 * Where "Load more" continues from: the last id of a full page, or null when
 * that page was the last. Tracked separately from the list, which can also
 * hold tasks that arrived another way (a notification link, a broadcast).
 */
export function nextCursorOf(page: SharedTask[]) {
  return page.length === SHARED_TASKS_PAGE_SIZE ? page[page.length - 1].id : null;
}

// ------------------------------------------------------------
// Client-side list state, updated by actions and broadcasts
// ------------------------------------------------------------

export type SharedTasksAction =
  /** A task's latest fields. Adds it if it's new and includes its people. */
  | { type: "upsert"; task: SharedTaskFields & { people?: SharedTaskPerson[] } }
  | { type: "remove"; id: number }
  | { type: "people"; id: number; people: SharedTaskPerson[] }
  /** Tasks from a page load; existing ones are refreshed. */
  | { type: "merge"; tasks: SharedTask[] }
  | { type: "reset"; tasks: SharedTask[] };

const newestFirst = (a: SharedTask, b: SharedTask) => b.id - a.id;

export function sharedTasksReducer(tasks: SharedTask[], action: SharedTasksAction): SharedTask[] {
  switch (action.type) {
    case "upsert": {
      const { task } = action;
      const existing = tasks.find((t) => t.id === task.id);
      if (!existing) {
        // An edit to a task we don't show (e.g. not loaded yet) has no
        // people, so there's nothing to render; skip it.
        if (!task.people) return tasks;
        return [...tasks, { ...task, people: task.people }].sort(newestFirst);
      }
      // Broadcasts and action results can arrive in either order; never let
      // an older version overwrite a newer one.
      if (Date.parse(task.updated_at) < Date.parse(existing.updated_at)) return tasks;
      return tasks.map((t) => (t.id === task.id ? { ...t, ...task, people: task.people ?? t.people } : t));
    }
    case "remove":
      return tasks.filter((t) => t.id !== action.id);
    case "people":
      return tasks.map((t) => (t.id === action.id ? { ...t, people: action.people } : t));
    case "merge": {
      const byId = new Map(tasks.map((t) => [t.id, t]));
      for (const task of action.tasks) byId.set(task.id, task);
      return [...byId.values()].sort(newestFirst);
    }
    case "reset":
      return [...action.tasks].sort(newestFirst);
  }
}
