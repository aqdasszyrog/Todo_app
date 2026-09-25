import type { Progress } from "@/lib/tasks";

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
