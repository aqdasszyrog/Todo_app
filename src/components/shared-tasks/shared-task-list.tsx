"use client";

import { SpinnerIcon } from "@/components/ui/icons";
import { SharedTaskCard } from "./shared-task-card";
import { useSharedTasks } from "./shared-tasks-provider";

export function SharedTaskList({ userId }: { userId: string }) {
  const { tasks, hasMore, loadingMore, loadMoreError, loadMore } = useSharedTasks();

  if (tasks.length === 0) {
    return (
      <div className="animate-fade-up rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
        <p className="font-medium text-fg">No shared tasks yet</p>
        <p className="mt-1 text-sm text-muted">Create one above, or accept an invite from the bell at the top.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {tasks.map((task, i) => (
          <SharedTaskCard key={task.id} task={task} userId={userId} index={i} />
        ))}
      </ul>

      {hasMore && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="flex h-9 items-center gap-2 rounded-xl px-4 text-sm text-muted ring-1 ring-line-strong transition ring-inset hover:bg-surface-2 hover:text-fg disabled:opacity-50"
          >
            {loadingMore && <SpinnerIcon className="size-3.5" />}
            Load more
          </button>
          {loadMoreError && <p className="text-sm text-danger">{loadMoreError}</p>}
        </div>
      )}
    </>
  );
}
