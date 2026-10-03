import type { Priority, Progress } from "./tasks";

// Must match supabase/migrations/007_shared_tasks.sql

/** "owner" for the task's creator; otherwise the member's invite status. */
export type MemberRole = "owner" | "invited" | "accepted";

export type SharedTaskPerson = {
  user_id: string;
  name: string | null;
  email: string | null;
  role: MemberRole;
};

export type SharedTask = {
  id: number;
  owner_id: string;
  title: string;
  description: string | null;
  progress: Progress;
  priority: Priority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  /** Owner first, then accepted members, then pending invites. */
  people: SharedTaskPerson[];
};

export const SHARED_TASK_COLUMNS =
  "id, owner_id, title, description, progress, priority, due_date, created_at, updated_at";

/** Most people that can be invited when creating a task. */
export const MAX_INVITES = 20;

export type FoundUser = { id: string; name: string | null; email: string };

export function personLabel(person: { name: string | null; email: string | null }) {
  return person.name ?? person.email ?? "Unknown user";
}
