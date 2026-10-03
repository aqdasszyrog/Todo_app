"use client";

import { useOptimistic, useState, useTransition } from "react";
import { deleteTask, updateTask } from "@/actions/tasks";
import { CheckIcon, PencilIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { PillSelect } from "@/components/ui/pill-select";
import {
  PRIORITY,
  PRIORITY_LABEL,
  PROGRESS,
  PROGRESS_LABEL,
  type Task,
  type TaskChangesInput,
} from "@/lib/tasks";
import { DueDatePicker } from "./due-date-picker";
import { TaskDetailsDialog } from "./task-details-dialog";
import { PRIORITY_STYLE, PROGRESS_STYLE } from "./task-styles";

type EditableFields = Pick<Task, "progress" | "priority" | "due_date">;

const PROGRESS_OPTIONS = PROGRESS.map((p) => ({ value: p, label: PROGRESS_LABEL[p] }));
const PRIORITY_OPTIONS = PRIORITY.map((p) => ({ value: p, label: `${PRIORITY_LABEL[p]} priority` }));

const iconButton =
  "grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg active:scale-90 disabled:opacity-40";

export function TaskItem({ task, index }: { task: Task; index: number }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Show the change instantly; React reverts it if the server action fails.
  const [optimistic, setOptimistic] = useOptimistic(
    {
      progress: task.progress,
      priority: task.priority,
      due_date: task.due_date,
    } satisfies EditableFields,
    (current, change: Partial<EditableFields>) => ({ ...current, ...change }),
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

  function change(fields: Partial<EditableFields>) {
    run(async () => {
      setOptimistic(fields);
      const { due_date, ...rest } = fields;
      return updateTask(task.id, due_date === undefined ? rest : { ...rest, dueDate: due_date });
    });
  }

  // The dialog shows its own pending state and closes once the save lands.
  async function saveDetails(changes: TaskChangesInput) {
    const result = await updateTask(task.id, changes);
    return result.error ?? null;
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
          onClick={() => change({ progress: isDone ? "incomplete" : "completed" })}
          disabled={pending}
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
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="block w-full rounded-md text-left focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
          >
            <span
              className={`block break-words leading-6 transition-colors duration-300 ${
                isDone ? "text-muted line-through decoration-muted/60" : "text-fg"
              }`}
            >
              {task.title}
            </span>
            {task.description && (
              <span className="mt-0.5 line-clamp-1 block text-sm text-muted">{task.description}</span>
            )}
          </button>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <PillSelect
              id={`progress-${task.id}`}
              label="Progress"
              value={optimistic.progress}
              options={PROGRESS_OPTIONS}
              onChange={(progress) => change({ progress })}
              disabled={pending}
              pillClassName={style.pill}
              chevronClassName={style.text}
            />
            <PillSelect
              id={`priority-${task.id}`}
              label="Priority"
              value={optimistic.priority}
              options={PRIORITY_OPTIONS}
              onChange={(priority) => change({ priority })}
              disabled={pending}
              pillClassName={PRIORITY_STYLE[optimistic.priority].pill}
              chevronClassName={PRIORITY_STYLE[optimistic.priority].text}
            />
            <DueDatePicker
              id={`due-${task.id}`}
              value={optimistic.due_date}
              onChange={(due_date) => change({ due_date })}
              disabled={pending}
              muted={isDone}
            />
            <time
              dateTime={task.created_at}
              className="text-xs text-muted"
              suppressHydrationWarning
            >
              Added{" "}
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
            confirmingDelete
              ? ""
              : "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
          }`}
        >
          {confirmingDelete ? (
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
              <button
                onClick={() => setDetailsOpen(true)}
                className={iconButton}
                aria-label="Open task details"
                title="Details"
              >
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

      {detailsOpen && (
        <TaskDetailsDialog
          task={{ ...task, ...optimistic }}
          canEditDetails
          onSave={saveDetails}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </li>
  );
}
