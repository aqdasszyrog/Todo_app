// Must match the `task_progress` enum in supabase/migrations/003_task_progress.sql
export const PROGRESS = ["incomplete", "in_progress", "completed"] as const;

export type Progress = (typeof PROGRESS)[number];

export const PROGRESS_LABEL: Record<Progress, string> = {
  incomplete: "Incomplete",
  in_progress: "In progress",
  completed: "Completed",
};

export const TITLE_MAX_LENGTH = 500;

export type Task = {
  id: number;
  title: string;
  progress: Progress;
  created_at: string;
  updated_at: string;
};

export function isProgress(value: unknown): value is Progress {
  return PROGRESS.includes(value as Progress);
}
