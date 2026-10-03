// Must match the `task_progress` enum in supabase/migrations/003_task_progress.sql
export const PROGRESS = ["incomplete", "in_progress", "completed"] as const;

export type Progress = (typeof PROGRESS)[number];

export const PROGRESS_LABEL: Record<Progress, string> = {
  incomplete: "Incomplete",
  in_progress: "In progress",
  completed: "Completed",
};

// Must match the `task_priority` enum in supabase/migrations/006_task_priority_due_date.sql
export const PRIORITY = ["high", "medium", "low"] as const;

export type Priority = (typeof PRIORITY)[number];

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const DEFAULT_PRIORITY: Priority = "medium";

export const TITLE_MAX_LENGTH = 500;

export type Task = {
  id: number;
  title: string;
  progress: Progress;
  priority: Priority;
  /** Calendar date as "YYYY-MM-DD", or null when there's no deadline. */
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskSummary = Record<Progress, number>;

export const TASK_COLUMNS = "id, title, progress, priority, due_date, created_at, updated_at";

export function isProgress(value: unknown): value is Progress {
  return PROGRESS.includes(value as Progress);
}

export function isPriority(value: unknown): value is Priority {
  return PRIORITY.includes(value as Priority);
}

/** True for a real calendar date written as "YYYY-MM-DD". */
export function isDueDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  // Rejects dates like 2026-02-31, which Date would roll over to March.
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
