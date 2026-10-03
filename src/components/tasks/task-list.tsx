import Link from "next/link";
import type { Task } from "@/lib/tasks";
import { TaskItem } from "./task-item";

type Props = {
  tasks: Task[];
  /** True when search or filters are narrowing the list. */
  filtered: boolean;
};

export function TaskList({ tasks, filtered }: Props) {
  if (tasks.length > 0) {
    return (
      <ul className="flex flex-col gap-2">
        {tasks.map((task, i) => (
          <TaskItem key={task.id} task={task} index={i} />
        ))}
      </ul>
    );
  }

  return (
    <div className="animate-fade-up rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center [animation-delay:240ms]">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-fuchsia-500/20 ring-1 ring-violet-400/20">
        <span className="text-xl">{filtered ? "🔍" : "✨"}</span>
      </div>
      <p className="font-medium text-fg">{filtered ? "No matching tasks" : "Your list is empty"}</p>
      <p className="mt-1 text-sm text-muted">
        {filtered ? (
          <>
            Try a different search or{" "}
            <Link href="/" className="text-violet-300 underline underline-offset-2">
              clear the filters
            </Link>
            .
          </>
        ) : (
          "Add your first task above to get started."
        )}
      </p>
    </div>
  );
}
