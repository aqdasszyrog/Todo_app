import { PROGRESS, PROGRESS_LABEL, type TaskSummary } from "@/lib/tasks";
import { PROGRESS_STYLE } from "./task-styles";

const RING_RADIUS = 26;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

// Progress ring and per-status counts across all of the user's tasks,
// regardless of the current search, filters or page.
export function TaskOverview({ summary }: { summary: TaskSummary }) {
  const total = PROGRESS.reduce((sum, p) => sum + summary[p], 0);
  const pct = total ? Math.round((summary.completed / total) * 100) : 0;

  return (
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
          {total === 0 ? "No tasks yet" : `${summary.completed} of ${total} tasks completed`}
        </p>
        <dl className="mt-2 grid grid-cols-3 gap-2">
          {PROGRESS.map((p) => (
            <div key={p} className="flex min-w-0 flex-col-reverse">
              <dt className="truncate text-[11px] text-muted sm:text-xs sm:tracking-wide sm:uppercase">
                {PROGRESS_LABEL[p]}
              </dt>
              <dd className="flex items-center gap-1.5 text-lg font-semibold sm:text-xl">
                <span className={`size-1.5 shrink-0 rounded-full ${PROGRESS_STYLE[p].dot}`} />
                {summary[p]}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
