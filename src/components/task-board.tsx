"use client";

import { useState } from "react";
import { PROGRESS, PROGRESS_LABEL, type Progress, type Task } from "@/lib/tasks";
import { PROGRESS_STYLE } from "./progress-badge";
import { TaskItem } from "./task-item";

type Filter = "all" | Progress;

const RING_RADIUS = 26;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = Object.fromEntries(
    PROGRESS.map((p) => [p, tasks.filter((t) => t.progress === p).length]),
  ) as Record<Progress, number>;
  const pct = tasks.length ? Math.round((counts.completed / tasks.length) * 100) : 0;
  const visible = filter === "all" ? tasks : tasks.filter((t) => t.progress === filter);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: tasks.length },
    ...PROGRESS.map((p) => ({ key: p, label: PROGRESS_LABEL[p], count: counts[p] })),
  ];

  return (
    <section className="mt-6 space-y-6">
      {/* Overview */}
      <div className="animate-fade-up flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 backdrop-blur-sm [animation-delay:120ms] sm:gap-6 sm:p-5">
        <div className="relative size-16 shrink-0">
          <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r={RING_RADIUS} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r={RING_RADIUS}
              fill="none"
              stroke="url(#ring)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - pct / 100)}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums">
            {pct}%
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            {tasks.length === 0
              ? "No tasks yet"
              : `${counts.completed} of ${tasks.length} tasks completed`}
          </p>
          <dl className="mt-2 grid grid-cols-3 gap-2">
            {PROGRESS.map((p) => (
              <div key={p} className="flex min-w-0 flex-col-reverse">
                <dt className="truncate text-[11px] text-muted sm:text-xs sm:tracking-wide sm:uppercase">
                  {PROGRESS_LABEL[p]}
                </dt>
                <dd className="flex items-center gap-1.5 text-lg font-semibold sm:text-xl">
                  <span className={`size-1.5 shrink-0 rounded-full ${PROGRESS_STYLE[p].dot}`} />
                  {counts[p]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Filters: scroll sideways on narrow screens instead of wrapping */}
      <div className="animate-fade-up [animation-delay:180ms]">
        <div
          role="tablist"
          aria-label="Filter tasks"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none] sm:mx-0 sm:px-0 sm:[mask-image:none]"
        >
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-indigo-500/25 via-violet-500/25 to-fuchsia-500/25 text-fg ring-1 ring-violet-400/40 ring-inset"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                {f.label}
                <span
                  className={`min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums ${
                    active ? "bg-white/15 text-fg" : "bg-surface-2 text-muted"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {visible.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {visible.map((task, i) => (
            <TaskItem key={task.id} task={task} index={i} />
          ))}
        </ul>
      ) : (
        <div className="animate-fade-up rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center [animation-delay:240ms]">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-fuchsia-500/20 ring-1 ring-violet-400/20">
            <span className="text-xl">✨</span>
          </div>
          <p className="font-medium text-fg">
            {tasks.length === 0 ? "Your list is empty" : "Nothing here"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {tasks.length === 0
              ? "Add your first task above to get started."
              : `You have no ${PROGRESS_LABEL[filter as Progress].toLowerCase()} tasks.`}
          </p>
        </div>
      )}
    </section>
  );
}
