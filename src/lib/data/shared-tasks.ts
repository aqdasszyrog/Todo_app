import { createClient } from "@/lib/supabase/server";
import { fetchSharedTasks, nextCursorOf, type SharedTask } from "@/lib/shared-tasks";
import { logError } from "@/lib/log";

/**
 * The first page of shared tasks the user owns or has accepted. Pending
 * invites are excluded: those only appear in the notification bell.
 *
 * `linkedTaskId` (from ?task=…, e.g. a notification link) is included even
 * when it's older than the first page, so its dialog can open.
 */
export async function getSharedTasks(linkedTaskId: number | null) {
  const supabase = await createClient();

  try {
    const [page, linked] = await Promise.all([
      fetchSharedTasks(supabase),
      linkedTaskId ? fetchSharedTasks(supabase, { taskId: linkedTaskId }) : Promise.resolve([]),
    ]);
    const extra = linked.filter((task) => !page.some((t) => t.id === task.id));
    return { tasks: [...page, ...extra], nextCursor: nextCursorOf(page), error: false };
  } catch (error) {
    logError("getSharedTasks failed", error);
    return { tasks: [] as SharedTask[], nextCursor: null, error: true };
  }
}
