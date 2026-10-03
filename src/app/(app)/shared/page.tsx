import type { Metadata } from "next";
import { CreateSharedTaskForm } from "@/components/shared-tasks/create-shared-task-form";
import { RealtimeSharedTasks } from "@/components/shared-tasks/realtime-shared-tasks";
import { SharedTaskCard } from "@/components/shared-tasks/shared-task-card";
import { getCurrentUser } from "@/lib/data/current-user";
import { getSharedTasks } from "@/lib/data/shared-tasks";

export const metadata: Metadata = {
  title: "Shared tasks · Todo",
};

export default async function SharedTasksPage() {
  const { userId } = await getCurrentUser();
  const { tasks, error } = await getSharedTasks(userId);

  return (
    <>
      <RealtimeSharedTasks userId={userId} taskIds={tasks.map((t) => t.id)} />

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
        ) : tasks.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {tasks.map((task, i) => (
              <SharedTaskCard key={task.id} task={task} userId={userId} index={i} />
            ))}
          </ul>
        ) : (
          <div className="animate-fade-up rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
            <p className="font-medium text-fg">No shared tasks yet</p>
            <p className="mt-1 text-sm text-muted">
              Create one above, or accept an invite from the bell at the top.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
