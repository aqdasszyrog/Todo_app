import type { DueStatus } from "@/lib/dates";
import type { Priority, Progress } from "@/lib/tasks";

// Colours per progress state, shared by pills, dots and the status toggle.
export const PROGRESS_STYLE: Record<
  Progress,
  { pill: string; dot: string; text: string; ring: string }
> = {
  incomplete: {
    pill: "bg-slate-400/10 text-slate-300 ring-slate-400/20",
    dot: "bg-slate-400",
    text: "text-slate-300",
    ring: "border-slate-500 hover:border-slate-300",
  },
  in_progress: {
    pill: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
    dot: "bg-amber-400",
    text: "text-amber-300",
    ring: "border-amber-400 hover:border-amber-300",
  },
  completed: {
    pill: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    ring: "border-emerald-400 bg-emerald-400",
  },
};

export const PRIORITY_STYLE: Record<Priority, { pill: string; text: string }> = {
  high: { pill: "bg-rose-400/10 text-rose-300 ring-rose-400/25", text: "text-rose-300" },
  medium: { pill: "bg-sky-400/10 text-sky-300 ring-sky-400/25", text: "text-sky-300" },
  low: { pill: "bg-slate-400/10 text-slate-400 ring-slate-400/20", text: "text-slate-400" },
};

export const DUE_STYLE: Record<DueStatus | "none", string> = {
  overdue: "bg-red-500/10 text-red-300 ring-red-400/30",
  today: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  upcoming: "bg-surface-2 text-fg/80 ring-line-strong",
  none: "text-muted ring-line hover:text-fg hover:ring-line-strong",
};
