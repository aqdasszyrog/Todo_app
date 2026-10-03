import { createClient } from "@/lib/supabase/server";
import {
  SHARED_TASK_COLUMNS,
  type MemberRole,
  type SharedTask,
  type SharedTaskPerson,
} from "@/lib/shared-tasks";
import { logError } from "@/lib/log";

const ROLE_ORDER: Record<MemberRole, number> = { owner: 0, accepted: 1, invited: 2 };

/**
 * Shared tasks the user owns or has accepted, each with its people.
 * Pending invites are excluded: those only appear in the notification bell.
 */
export async function getSharedTasks(userId: string) {
  const supabase = await createClient();

  const { data: memberships, error: membershipError } = await supabase
    .from("shared_task_members")
    .select("task_id")
    .eq("user_id", userId)
    .eq("status", "accepted");

  if (membershipError) {
    logError("getSharedTasks memberships failed", membershipError);
    return { tasks: [] as SharedTask[], error: true };
  }

  const joinedIds = memberships.map((m) => m.task_id as number);
  let query = supabase.from("shared_tasks").select(SHARED_TASK_COLUMNS);
  // RLS would also return tasks we're only invited to, so ask for exactly
  // the ones we own or have joined.
  query = joinedIds.length
    ? query.or(`owner_id.eq.${userId},id.in.(${joinedIds.join(",")})`)
    : query.eq("owner_id", userId);

  const { data: rows, error } = await query
    .order("created_at", { ascending: false })
    .overrideTypes<Omit<SharedTask, "people">[], { merge: false }>();

  if (error) {
    logError("getSharedTasks failed", error);
    return { tasks: [] as SharedTask[], error: true };
  }
  if (rows.length === 0) return { tasks: [] as SharedTask[], error: false };

  const { data: people, error: peopleError } = await supabase.rpc("shared_task_people", {
    p_task_ids: rows.map((t) => t.id),
  });
  if (peopleError) logError("shared_task_people failed", peopleError);

  const byTask = new Map<number, SharedTaskPerson[]>();
  for (const { task_id, ...person } of (people ?? []) as (SharedTaskPerson & { task_id: number })[]) {
    byTask.set(task_id, [...(byTask.get(task_id) ?? []), person]);
  }

  const tasks = rows.map((task) => ({
    ...task,
    people: (byTask.get(task.id) ?? []).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]),
  }));
  return { tasks, error: false };
}
