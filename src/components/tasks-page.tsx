import type { Task } from "@/lib/tasks";
import { AddTaskForm } from "./add-task-form";
import { AppHeader } from "./app-header";
import { RealtimeTasks } from "./realtime-tasks";
import { TaskBoard } from "./task-board";

type Props = { userId: string; displayName: string; tasks: Task[]; loadFailed?: boolean };

export function TasksPage({ userId, displayName, tasks, loadFailed }: Props) {
  const firstName = displayName.split(" ")[0];
  const inProgress = tasks.filter((t) => t.progress === "in_progress").length;
  const open = tasks.filter((t) => t.progress !== "completed").length;

  const subtitle =
    tasks.length === 0
      ? "Let's plan something great today."
      : open === 0
        ? "Everything's done. Nice work!"
        : `${open} open task${open === 1 ? "" : "s"}${inProgress ? `, ${inProgress} in progress` : ""}.`;

  return (
    <div className="flex flex-1 flex-col">
      <RealtimeTasks userId={userId} taskIds={tasks.map((t) => t.id)} />
      <AppHeader displayName={displayName} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-16 sm:pt-14">
        <div className="animate-fade-up mb-6 sm:mb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Hello,{" "}
            <span className="animate-shimmer bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-indigo-400 bg-[length:200%_auto] bg-clip-text text-transparent">
              {firstName}
            </span>
          </h1>
          <p className="mt-2 text-muted">{subtitle}</p>
        </div>

        <div className="animate-fade-up [animation-delay:60ms]">
          <AddTaskForm />
        </div>

        {loadFailed ? (
          <p className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">
            Couldn&apos;t load your tasks. Refresh the page to try again.
          </p>
        ) : (
          <TaskBoard tasks={tasks} />
        )}
      </main>
    </div>
  );
}
