import { hasActiveFilters, type TaskFilters as Filters } from "@/lib/task-filters";
import type { Task, TaskSummary } from "@/lib/tasks";
import { AddTaskForm } from "./add-task-form";
import { RealtimeTasks } from "./realtime-tasks";
import { TaskFilters } from "./task-filters";
import { TaskList } from "./task-list";
import { TaskOverview } from "./task-overview";
import { TaskPagination } from "./task-pagination";

type Props = {
  userId: string;
  displayName: string;
  filters: Filters;
  /** The current page of tasks matching the filters. */
  tasks: Task[];
  /** How many tasks match the filters in total, across all pages. */
  total: number;
  /** Counts across all tasks; null if they couldn't be loaded. */
  summary: TaskSummary | null;
  loadFailed?: boolean;
};

function subtitleFor(summary: TaskSummary | null) {
  if (!summary) return "Here's what's on your list.";
  const all = summary.incomplete + summary.in_progress + summary.completed;
  const open = summary.incomplete + summary.in_progress;
  if (all === 0) return "Let's plan something great today.";
  if (open === 0) return "Everything's done. Nice work!";
  const inProgress = summary.in_progress ? `, ${summary.in_progress} in progress` : "";
  return `${open} open task${open === 1 ? "" : "s"}${inProgress}.`;
}

export function TasksDashboard({ userId, displayName, filters, tasks, total, summary, loadFailed }: Props) {
  const firstName = displayName.split(" ")[0];

  return (
    <>
      <RealtimeTasks userId={userId} taskIds={tasks.map((t) => t.id)} />

      <div className="animate-fade-up mb-6 sm:mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Hello,{" "}
          <span className="animate-shimmer bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-indigo-400 bg-[length:200%_auto] bg-clip-text text-transparent">
            {firstName}
          </span>
        </h1>
        <p className="mt-2 text-muted">{subtitleFor(summary)}</p>
      </div>

      <div className="animate-fade-up [animation-delay:60ms]">
        <AddTaskForm />
      </div>

      <section className="mt-6 space-y-6">
        {summary && <TaskOverview summary={summary} />}
        <TaskFilters filters={filters} summary={summary} />

        {loadFailed ? (
          <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">
            Couldn&apos;t load your tasks. Refresh the page to try again.
          </p>
        ) : (
          <>
            <TaskList tasks={tasks} filtered={hasActiveFilters(filters)} />
            <TaskPagination filters={filters} total={total} />
          </>
        )}
      </section>
    </>
  );
}
