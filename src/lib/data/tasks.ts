import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type Sort, type TaskFilters } from "@/lib/task-filters";
import { TASK_COLUMNS, type TaskSummary } from "@/lib/tasks";
import { logError } from "@/lib/log";

// Every sort ends with `id` so rows with equal values keep a stable order
// and never jump between pages.
const ORDER_BY: Record<Sort, { column: string; ascending: boolean; nullsFirst?: boolean }[]> = {
  newest: [{ column: "created_at", ascending: false }],
  oldest: [{ column: "created_at", ascending: true }],
  due: [
    { column: "due_date", ascending: true, nullsFirst: false },
    { column: "created_at", ascending: false },
  ],
  priority: [
    { column: "priority", ascending: false },
    { column: "created_at", ascending: false },
  ],
};

// ilike treats % and _ as wildcards; escape them so they match literally.
function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** One page of the user's tasks matching the filters, plus the total match count. */
export async function getTasksPage(filters: TaskFilters) {
  const supabase = await createClient();
  const from = (filters.page - 1) * PAGE_SIZE;

  // RLS limits this to the logged-in user's rows.
  let query = supabase.from("user_tasks").select(TASK_COLUMNS, { count: "exact" });

  if (filters.q) query = query.ilike("title", `%${escapeLike(filters.q)}%`);
  if (filters.status !== "all") query = query.eq("progress", filters.status);
  if (filters.priority !== "all") query = query.eq("priority", filters.priority);

  for (const { column, ascending, nullsFirst } of ORDER_BY[filters.sort]) {
    query = query.order(column, { ascending, nullsFirst });
  }

  const { data, count, error } = await query
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) logError("getTasksPage failed", error);
  return { tasks: data ?? [], total: count ?? 0, error: !!error };
}

/** Task counts per progress state across all of the user's tasks. */
export async function getTaskSummary(): Promise<TaskSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("task_summary");

  if (error) {
    logError("getTaskSummary failed", error);
    return null;
  }
  return data as TaskSummary;
}
