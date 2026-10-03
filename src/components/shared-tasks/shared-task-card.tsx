"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  deleteSharedTask,
  removeSharedTaskMember,
  updateSharedTask,
} from "@/actions/shared-tasks";
import { DueDatePicker } from "@/components/tasks/due-date-picker";
import { TaskDetailsDialog } from "@/components/tasks/task-details-dialog";
import { PRIORITY_STYLE, PROGRESS_STYLE } from "@/components/tasks/task-styles";
import { Avatar } from "@/components/ui/avatar";
import { ChevronDownIcon, SpinnerIcon, TrashIcon, UsersIcon } from "@/components/ui/icons";
import { PillSelect } from "@/components/ui/pill-select";
import { personLabel, type SharedTask } from "@/lib/shared-tasks";
import {
  PRIORITY,
  PRIORITY_LABEL,
  PROGRESS,
  PROGRESS_LABEL,
  type Task,
  type TaskChangesInput,
} from "@/lib/tasks";
import { SharedTaskMembers } from "./shared-task-members";

type Editable = Pick<Task, "progress" | "priority" | "due_date">;

const PROGRESS_OPTIONS = PROGRESS.map((p) => ({ value: p, label: PROGRESS_LABEL[p] }));
const PRIORITY_OPTIONS = PRIORITY.map((p) => ({ value: p, label: `${PRIORITY_LABEL[p]} priority` }));

const OWNER_ONLY = "Only the owner can change this";

export function SharedTaskCard({ task, userId, index }: { task: SharedTask; userId: string; index: number }) {
  const isOwner = task.owner_id === userId;
  const owner = task.people.find((p) => p.role === "owner");
  const joined = task.people.filter((p) => p.role !== "invited");
  const invitedCount = task.people.length - joined.length;

  const [showMembers, setShowMembers] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Show changes instantly; React reverts them if the action fails.
  const [optimistic, setOptimistic] = useOptimistic(
    { progress: task.progress, priority: task.priority, due_date: task.due_date } satisfies Editable,
    (current, change: Partial<Editable>) => ({ ...current, ...change }),
  );

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  function change(fields: Partial<Editable>) {
    run(async () => {
      setOptimistic(fields);
      const { due_date, ...rest } = fields;
      return updateSharedTask(task.id, due_date === undefined ? rest : { ...rest, dueDate: due_date });
    });
  }

  async function saveDetails(changes: TaskChangesInput) {
    const result = await updateSharedTask(task.id, changes);
    return result.error ?? null;
  }

  function confirmDestructive() {
    setConfirming(false);
    run(() => (isOwner ? deleteSharedTask(task.id) : removeSharedTaskMember(task.id, userId)));
  }

  const isDone = optimistic.progress === "completed";
  const ownerLine = isOwner ? "You own this task" : `Shared by ${owner ? personLabel(owner) : "someone"}`;
  const progressStyle = PROGRESS_STYLE[optimistic.progress];

  return (
    <li
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="animate-fade-up rounded-2xl border border-line bg-surface backdrop-blur-sm transition hover:border-line-strong"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="min-w-0 flex-1 rounded-md text-left focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
          >
            <span
              className={`block break-words leading-6 ${isDone ? "text-muted line-through decoration-muted/60" : "text-fg"}`}
            >
              {task.title}
            </span>
            {task.description && (
              <span className="mt-0.5 line-clamp-1 block text-sm text-muted">{task.description}</span>
            )}
            <span className="mt-0.5 block text-xs text-muted">{ownerLine}</span>
          </button>

          {/* Stacked avatars of everyone who has joined */}
          <div className="flex shrink-0 -space-x-2" aria-label={`${joined.length} people on this task`}>
            {joined.slice(0, 4).map((p) => (
              <Avatar key={p.user_id} name={personLabel(p)} size="sm" />
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <PillSelect
            id={`shared-progress-${task.id}`}
            label="Progress"
            value={optimistic.progress}
            options={PROGRESS_OPTIONS}
            onChange={(progress) => change({ progress })}
            disabled={pending}
            pillClassName={progressStyle.pill}
            chevronClassName={progressStyle.text}
          />
          <span title={isOwner ? undefined : OWNER_ONLY}>
            <PillSelect
              id={`shared-priority-${task.id}`}
              label="Priority"
              value={optimistic.priority}
              options={PRIORITY_OPTIONS}
              onChange={(priority) => change({ priority })}
              disabled={pending || !isOwner}
              pillClassName={PRIORITY_STYLE[optimistic.priority].pill}
              chevronClassName={PRIORITY_STYLE[optimistic.priority].text}
            />
          </span>
          {(isOwner || optimistic.due_date) && (
            <span title={isOwner ? undefined : OWNER_ONLY}>
              <DueDatePicker
                id={`shared-due-${task.id}`}
                value={optimistic.due_date}
                onChange={(due_date) => change({ due_date })}
                disabled={pending || !isOwner}
                muted={isDone}
              />
            </span>
          )}
          {pending && <SpinnerIcon className="size-3.5 text-muted" />}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setShowMembers((v) => !v)}
            aria-expanded={showMembers}
            aria-controls={`members-${task.id}`}
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <UsersIcon />
            {joined.length} {joined.length === 1 ? "person" : "people"}
            {invitedCount > 0 && <span className="text-xs">· {invitedCount} invited</span>}
            <ChevronDownIcon className={`size-3.5 transition ${showMembers ? "rotate-180" : ""}`} />
          </button>

          {confirming ? (
            <div className="animate-fade-up flex items-center gap-1">
              <button
                type="button"
                onClick={confirmDestructive}
                className="h-8 rounded-lg bg-red-500/15 px-3 text-xs font-semibold text-red-300 ring-1 ring-red-400/30 ring-inset transition hover:bg-red-500/25"
              >
                {isOwner ? "Delete for everyone" : "Leave task"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-8 rounded-lg px-3 text-xs text-muted hover:bg-surface-2 hover:text-fg"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
            >
              {isOwner && <TrashIcon className="size-3.5" />}
              {isOwner ? "Delete" : "Leave"}
            </button>
          )}
        </div>

        {showMembers && (
          <div id={`members-${task.id}`} className="animate-fade-up mt-3">
            <SharedTaskMembers taskId={task.id} people={task.people} userId={userId} isOwner={isOwner} />
          </div>
        )}

        {error && <p className="animate-fade-up mt-2 text-sm text-danger">{error}</p>}
      </div>

      {detailsOpen && (
        <TaskDetailsDialog
          task={{ ...task, ...optimistic }}
          canEditDetails={isOwner}
          subtitle={ownerLine}
          onSave={saveDetails}
          onClose={() => setDetailsOpen(false)}
        />
      )}
    </li>
  );
}
