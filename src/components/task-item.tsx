"use client";

import { useOptimistic, useState, useTransition } from "react";
import { deleteTask, updateTask } from "@/app/tasks/actions";
import {
  PROGRESS,
  PROGRESS_LABEL,
  TITLE_MAX_LENGTH,
  type Progress,
  type Task,
} from "@/lib/tasks";
import {
  CheckIcon,
  ChevronDownIcon,
  PencilIcon,
  SpinnerIcon,
  TrashIcon,
  XIcon,
} from "./icons";
import { PROGRESS_STYLE } from "./progress-badge";

const iconButton =
  "grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg active:scale-90 disabled:opacity-40";

export function TaskItem({ task, index }: { task: Task; index: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Show the change instantly; React reverts it if the server action fails.
  const [optimistic, setOptimistic] = useOptimistic(
    { title: task.title, progress: task.progress },
    (current, change: Partial<Pick<Task, "title" | "progress">>) => ({
      ...current,
      ...change,
    }),
  );

  function run(action: () => Promise<{ error?: string }>, onError?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        onError?.();
      }
    });
  }

  function changeProgress(progress: Progress) {
    run(async () => {
      setOptimistic({ progress });
      return updateTask(task.id, { progress });
    });
  }

  function startEditing() {
    setDraft(optimistic.title);
    setConfirmingDelete(false);
    setEditing(true);
  }

  function saveTitle() {
    const title = draft.trim();
    if (!title) return setError("Task title can't be empty.");
    setEditing(false);
    if (title === task.title) return;

    run(
      async () => {
        setOptimistic({ title });
        return updateTask(task.id, { title });
      },
      () => setEditing(true),
    );
  }

  function remove() {
    setConfirmingDelete(false);
    setRemoving(true);
    run(() => deleteTask(task.id), () => setRemoving(false));
  }

  const style = PROGRESS_STYLE[optimistic.progress];
  const isDone = optimistic.progress === "completed";

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className={`animate-fade-up group relative rounded-2xl border border-line bg-surface backdrop-blur-sm transition-all duration-300 hover:border-line-strong hover:bg-surface-2 ${
        removing ? "pointer-events-none scale-[0.98] opacity-0" : ""
      }`}
    >
      <div className="flex items-start gap-3 p-3 sm:gap-4 sm:p-4">
        {/* Round toggle: completed ↔ incomplete */}
        <button
          onClick={() => changeProgress(isDone ? "incomplete" : "completed")}
          disabled={pending || editing}
          aria-label={isDone ? "Mark as incomplete" : "Mark as completed"}
          className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all duration-200 ${style.ring}`}
        >
          {isDone && (
            <CheckIcon key="done" className="animate-pop size-3.5 stroke-[3] text-[#07080c]" />
          )}
          {optimistic.progress === "in_progress" && (
            <span className="size-2.5 rounded-full bg-amber-400" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {editing ? (
            <>
              <label htmlFor={`edit-${task.id}`} className="sr-only">
                Edit task title
              </label>
              <input
                id={`edit-${task.id}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") setEditing(false);
                }}
                maxLength={TITLE_MAX_LENGTH}
                autoFocus
                className="w-full rounded-lg border border-violet-500/60 bg-black/30 px-3 py-1.5 text-base text-fg ring-4 ring-violet-500/10 focus:outline-none"
              />
            </>
          ) : (
            <p
              onDoubleClick={startEditing}
              className={`break-words leading-6 transition-colors duration-300 ${
                isDone ? "text-muted line-through decoration-muted/60" : "text-fg"
              }`}
            >
              {optimistic.title}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="relative">
              <label htmlFor={`progress-${task.id}`} className="sr-only">
                Progress
              </label>
              <select
                id={`progress-${task.id}`}
                value={optimistic.progress}
                onChange={(e) => changeProgress(e.target.value as Progress)}
                disabled={pending}
                className={`cursor-pointer appearance-none rounded-full py-1 pr-7 pl-2.5 text-xs font-medium ring-1 ring-inset transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${style.pill}`}
              >
                {PROGRESS.map((p) => (
                  <option key={p} value={p}>
                    {PROGRESS_LABEL[p]}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                className={`pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 ${style.text}`}
              />
            </div>
            <time
              dateTime={task.created_at}
              className="text-xs text-muted"
              suppressHydrationWarning
            >
              {new Date(task.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}
            </time>
            {pending && <SpinnerIcon className="size-3.5 text-muted" />}
          </div>
        </div>

        {/* Actions: always visible on touch screens, on hover/focus on desktop */}
        <div
          className={`flex shrink-0 items-center gap-0.5 transition-opacity duration-200 ${
            editing || confirmingDelete
              ? ""
              : "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
          }`}
        >
          {editing ? (
            <>
              <button onClick={saveTitle} className={`${iconButton} text-emerald-300`} aria-label="Save">
                <CheckIcon />
              </button>
              <button onClick={() => setEditing(false)} className={iconButton} aria-label="Cancel editing">
                <XIcon />
              </button>
            </>
          ) : confirmingDelete ? (
            <div className="animate-fade-up flex items-center gap-1">
              <button
                onClick={remove}
                className="h-8 rounded-lg bg-red-500/15 px-3 text-xs font-semibold text-red-300 ring-1 ring-inset ring-red-400/30 transition hover:bg-red-500/25"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className={iconButton}
                aria-label="Cancel delete"
              >
                <XIcon />
              </button>
            </div>
          ) : (
            <>
              <button onClick={startEditing} disabled={pending} className={iconButton} aria-label="Edit task">
                <PencilIcon />
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={pending}
                className={`${iconButton} hover:bg-red-500/10 hover:text-red-300`}
                aria-label="Delete task"
              >
                <TrashIcon />
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="animate-fade-up px-4 pb-3 pl-12 text-sm text-danger sm:pl-14">{error}</p>}
    </li>
  );
}
