// Must match the `notification_type` enum in supabase/migrations/007_shared_tasks.sql
export type NotificationType = "task_invite" | "invite_accepted" | "invite_declined" | "task_comment";

export type AppNotification = {
  id: number;
  type: NotificationType;
  actor_name: string | null;
  task_title: string | null;
  shared_task_id: number | null;
  /** Chat: start of the latest message (null if it was deleted). */
  preview: string | null;
  /** Chat: how many messages this notification stands for. */
  comment_count: number;
  read_at: string | null;
  created_at: string;
  /**
   * For invites: the current status of that invite, or null if it no longer
   * exists (the owner removed it or deleted the task).
   */
  invite_status: "invited" | "accepted" | "declined" | null;
};

/** How many notifications the bell shows. */
export const NOTIFICATIONS_LIMIT = 20;
