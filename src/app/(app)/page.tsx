import { redirect } from "next/navigation";
import { TasksDashboard } from "@/components/tasks/tasks-dashboard";
import { getCurrentUser } from "@/lib/data/current-user";
import { getTaskSummary, getTasksPage } from "@/lib/data/tasks";
import { displayNameOf } from "@/lib/profile";
import { PAGE_SIZE, parseTaskFilters, tasksHref } from "@/lib/task-filters";

export default async function Home({ searchParams }: PageProps<"/">) {
  const filters = parseTaskFilters(await searchParams);

  const [{ userId, profile }, page, summary] = await Promise.all([
    getCurrentUser(),
    getTasksPage(filters),
    getTaskSummary(),
  ]);

  // e.g. deleting the last task on the last page, or an old bookmarked URL.
  const pageCount = Math.max(1, Math.ceil(page.total / PAGE_SIZE));
  if (!page.error && filters.page > pageCount) {
    redirect(tasksHref({ ...filters, page: pageCount }));
  }

  return (
    <TasksDashboard
      userId={userId}
      displayName={displayNameOf(profile)}
      filters={filters}
      tasks={page.tasks}
      total={page.total}
      summary={summary}
      loadFailed={page.error}
    />
  );
}
