import type { Metadata } from "next";
import { CreateSharedTaskForm } from "@/components/shared-tasks/create-shared-task-form";
import { SharedTaskList } from "@/components/shared-tasks/shared-task-list";
import { SharedTasksProvider } from "@/components/shared-tasks/shared-tasks-provider";
import { getCurrentUser } from "@/lib/data/current-user";
import { getSharedTasks } from "@/lib/data/shared-tasks";

export const metadata: Metadata = {
  title: "Shared tasks · Todo",
};

export default async function SharedTasksPage({ searchParams }: PageProps<"/shared">) {
  // ?task=12 opens that task's dialog (e.g. from a notification).
  const linkedTaskId = Number((await searchParams).task) || null;

  const [{ userId }, { tasks, nextCursor, error }] = await Promise.all([
    getCurrentUser(),
    getSharedTasks(linkedTaskId),
  ]);

  return (
    <SharedTasksProvider initialTasks={tasks} initialCursor={nextCursor}>
      <div className="animate-fade-up mb-6 sm:mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Shared tasks</h1>
        <p className="mt-2 text-muted">
          Work on tasks together. Only the people on a task can see it.
        </p>
      </div>

      <div className="animate-fade-up [animation-delay:60ms]">
        <CreateSharedTaskForm />
      </div>

      <section className="mt-8">
        {error ? (
          <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">
            Couldn&apos;t load your shared tasks. Refresh the page to try again.
          </p>
        ) : (
          <SharedTaskList userId={userId} />
        )}
      </section>
    </SharedTasksProvider>
  );
}
