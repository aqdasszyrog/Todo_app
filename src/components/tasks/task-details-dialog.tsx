"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SpinnerIcon, XIcon } from "@/components/ui/icons";
import { PillSelect } from "@/components/ui/pill-select";
import {
  DESCRIPTION_MAX_LENGTH,
  PRIORITY,
  PRIORITY_LABEL,
  PROGRESS,
  PROGRESS_LABEL,
  TITLE_MAX_LENGTH,
  type Task,
  type TaskChangesInput,
} from "@/lib/tasks";
import { DueDatePicker } from "./due-date-picker";
import { PRIORITY_STYLE, PROGRESS_STYLE } from "./task-styles";

/** The fields this dialog shows; personal and shared tasks both have them. */
export type TaskDetails = Pick<Task, "id" | "title" | "description" | "progress" | "priority" | "due_date">;

type Props = {
  task: TaskDetails;
  /** False for shared-task members: everything but progress is read-only. */
  canEditDetails: boolean;
  /** Small line under the title, e.g. "Shared by Alice". */
  subtitle?: React.ReactNode;
  /** Saves the changed fields; resolves to an error message, or null on success. */
  onSave: (changes: TaskChangesInput) => Promise<string | null>;
  onClose: () => void;
};

const PROGRESS_OPTIONS = PROGRESS.map((p) => ({ value: p, label: PROGRESS_LABEL[p] }));
const PRIORITY_OPTIONS = PRIORITY.map((p) => ({ value: p, label: `${PRIORITY_LABEL[p]} priority` }));

const fieldClass =
  "w-full rounded-xl border border-line bg-black/20 px-3.5 text-fg placeholder:text-muted transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 focus:outline-none read-only:cursor-default read-only:focus:border-line read-only:focus:ring-0";

// Mount it only while open: the form starts from the task's current values
// each time, and closing discards unsaved edits.
export function TaskDetailsDialog({ task, canEditDetails, subtitle, onSave, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [progress, setProgress] = useState(task.progress);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // showModal() gives us the backdrop, focus trapping and Escape for free.
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Only send what actually changed.
  const changes: TaskChangesInput = {};
  if (canEditDetails) {
    if (title.trim() !== task.title) changes.title = title;
    if (description.trim() !== (task.description ?? "")) changes.description = description;
    if (priority !== task.priority) changes.priority = priority;
    if (dueDate !== task.due_date) changes.dueDate = dueDate;
  }
  if (progress !== task.progress) changes.progress = progress;
  const dirty = Object.keys(changes).length > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dirty) return onClose();
    if (!title.trim()) return setError("Task title can't be empty.");

    setError(null);
    startTransition(async () => {
      const result = await onSave(changes);
      if (result) setError(result);
      else onClose();
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // A click on the dialog element itself (not its content) is the backdrop.
      onClick={(e) => e.target === dialogRef.current && onClose()}
      aria-labelledby={`task-${task.id}-title-label`}
      className="animate-fade-up m-auto w-[min(36rem,calc(100vw-2rem))] max-h-[min(44rem,calc(100dvh-2rem))] overflow-hidden rounded-2xl border border-line-strong bg-[#0d0e14] p-0 text-fg shadow-2xl shadow-black/60 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[inherit] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={`task-${task.id}-title-label`} className="text-base font-semibold">
              Task details
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <XIcon />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-5">
          <div>
            <label htmlFor={`task-${task.id}-title`} className="mb-1.5 block text-sm font-medium">
              Title
            </label>
            <input
              id={`task-${task.id}-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={!canEditDetails}
              maxLength={TITLE_MAX_LENGTH}
              required
              autoComplete="off"
              className={`${fieldClass} h-11 text-base`}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor={`task-${task.id}-description`} className="text-sm font-medium">
                Description
              </label>
              {canEditDetails && (
                <span className="text-xs text-muted tabular-nums">
                  {description.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              )}
            </div>
            <textarea
              id={`task-${task.id}-description`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              readOnly={!canEditDetails}
              maxLength={DESCRIPTION_MAX_LENGTH}
              rows={6}
              placeholder={canEditDetails ? "Add more detail, notes or links…" : "No description."}
              className={`${fieldClass} resize-y py-2.5 text-sm leading-6`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PillSelect
              id={`task-${task.id}-progress`}
              label="Progress"
              value={progress}
              options={PROGRESS_OPTIONS}
              onChange={setProgress}
              disabled={pending}
              pillClassName={PROGRESS_STYLE[progress].pill}
              chevronClassName={PROGRESS_STYLE[progress].text}
            />
            <PillSelect
              id={`task-${task.id}-priority`}
              label="Priority"
              value={priority}
              options={PRIORITY_OPTIONS}
              onChange={setPriority}
              disabled={pending || !canEditDetails}
              pillClassName={PRIORITY_STYLE[priority].pill}
              chevronClassName={PRIORITY_STYLE[priority].text}
            />
            {(canEditDetails || dueDate) && (
              <DueDatePicker
                id={`task-${task.id}-due`}
                value={dueDate}
                onChange={setDueDate}
                disabled={pending || !canEditDetails}
                muted={progress === "completed"}
              />
            )}
          </div>

          {!canEditDetails && (
            <p className="text-xs text-muted">Only the owner can change the title, description, priority and due date.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          {error && <p className="mr-auto text-sm text-danger">{error}</p>}
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl px-4 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !dirty}
            className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {pending && <SpinnerIcon />}
            Save changes
          </button>
        </div>
      </form>
    </dialog>
  );
}
