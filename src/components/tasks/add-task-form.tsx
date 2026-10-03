"use client";

import { useState, useTransition } from "react";
import { addTask } from "@/actions/tasks";
import { PlusIcon, SpinnerIcon } from "@/components/ui/icons";
import { PillSelect } from "@/components/ui/pill-select";
import {
  DEFAULT_PRIORITY,
  PRIORITY,
  PRIORITY_LABEL,
  TITLE_MAX_LENGTH,
  type Priority,
} from "@/lib/tasks";
import { DueDatePicker } from "./due-date-picker";
import { PRIORITY_STYLE } from "./task-styles";

const PRIORITY_OPTIONS = PRIORITY.map((p) => ({ value: p, label: `${PRIORITY_LABEL[p]} priority` }));

export function AddTaskForm() {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(DEFAULT_PRIORITY);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      const result = await addTask({ title, priority, dueDate });
      if (result.error) {
        setError(result.error);
      } else {
        setTitle("");
        setPriority(DEFAULT_PRIORITY);
        setDueDate(null);
        setError(null);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Gradient border that lights up on focus */}
      <div className="rounded-2xl bg-line p-px transition-colors duration-300 focus-within:bg-gradient-to-r focus-within:from-indigo-500 focus-within:via-violet-500 focus-within:to-fuchsia-500">
        <div className="rounded-[15px] bg-[#0d0e14] p-1.5">
          <div className="flex items-center gap-2 pl-2.5">
            <PlusIcon className="size-5 shrink-0 text-muted" />
            <label htmlFor="new-task" className="sr-only">
              New task
            </label>
            <input
              id="new-task"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a new task…"
              maxLength={TITLE_MAX_LENGTH}
              autoComplete="off"
              className="h-11 min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending || !title.trim()}
              className="group relative flex h-11 shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-[length:200%_100%] px-4 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:bg-right hover:shadow-violet-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:scale-100"
              aria-label="Add task"
            >
              {pending ? <SpinnerIcon /> : <PlusIcon className="size-4 stroke-[2.5]" />}
              <span className="hidden sm:inline">Add task</span>
            </button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-line px-2.5 pt-2.5 pb-1">
            <PillSelect
              id="new-task-priority"
              label="Priority"
              value={priority}
              options={PRIORITY_OPTIONS}
              onChange={setPriority}
              disabled={pending}
              pillClassName={PRIORITY_STYLE[priority].pill}
              chevronClassName={PRIORITY_STYLE[priority].text}
            />
            <DueDatePicker
              id="new-task-due"
              value={dueDate}
              onChange={setDueDate}
              disabled={pending}
            />
          </div>
        </div>
      </div>
      {error && <p className="animate-fade-up mt-2 px-1 text-sm text-danger">{error}</p>}
    </form>
  );
}
