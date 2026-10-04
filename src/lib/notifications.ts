import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

// Must match the `notification_type` enum in supabase/migrations/007_shared_tasks.sql
export type NotificationType = "task_invite" | "invite_accepted" | "invite_declined" | "task_comment";

export type MemberStatus = "invited" | "accepted" | "declined";

/** A notification as stored (and as broadcast by 011_scalable_realtime.sql). */
export type NotificationRow = {
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
};

export type AppNotification = NotificationRow & {
  /**
   * For invites: the current status of that invite, or null if it no longer
   * exists (the owner removed it or deleted the task).
   */
  invite_status: MemberStatus | null;
};

/** How many notifications the bell shows. */
export const NOTIFICATIONS_LIMIT = 20;

const NOTIFICATION_COLUMNS =
  "id, type, actor_name, task_title, shared_task_id, preview, comment_count, read_at, created_at";

export type NotificationsState = {
  /** Newest first, at most NOTIFICATIONS_LIMIT. */
  items: NotificationRow[];
  unreadCount: number;
  /** Invite status per shared task id, for task_invite notifications. */
  inviteStatus: Record<number, MemberStatus | null>;
};

/** The `notifications` broadcast: rows to add or replace, ids to drop, and the new unread total. */
export type NotificationChanges = {
  upserts: NotificationRow[];
  deletes: number[];
  unread_count: number;
};

/** The user's latest notifications, unread count and invite statuses. RLS limits all three to the user. */
export async function loadNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<NotificationsState> {
  const [list, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(NOTIFICATIONS_LIMIT),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  if (list.error) throw list.error;
  if (unread.error) throw unread.error;

  // Invites need their current status so the bell knows whether to show
  // Accept/Decline, "Accepted", or "no longer available".
  const inviteTaskIds = list.data
    .filter((n) => n.type === "task_invite" && n.shared_task_id !== null)
    .map((n) => n.shared_task_id as number);

  const inviteStatus: NotificationsState["inviteStatus"] = {};
  if (inviteTaskIds.length) {
    const { data, error } = await supabase
      .from("shared_task_members")
      .select("task_id, status")
      .eq("user_id", userId)
      .in("task_id", inviteTaskIds);
    if (error) throw error;
    for (const m of data) inviteStatus[m.task_id] = m.status;
  }

  return { items: list.data, unreadCount: unread.count ?? 0, inviteStatus };
}

function newestFirst(a: NotificationRow, b: NotificationRow) {
  return Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id;
}

export function applyNotificationChanges(
  state: NotificationsState,
  changes: NotificationChanges,
): NotificationsState {
  const byId = new Map(state.items.map((n) => [n.id, n]));
  for (const id of changes.deletes) byId.delete(id);
  for (const row of changes.upserts) byId.set(row.id, row);

  return {
    ...state,
    items: [...byId.values()].sort(newestFirst).slice(0, NOTIFICATIONS_LIMIT),
    unreadCount: changes.unread_count,
  };
}

export function setInviteStatus(
  state: NotificationsState,
  taskId: number,
  status: MemberStatus | null,
): NotificationsState {
  return { ...state, inviteStatus: { ...state.inviteStatus, [taskId]: status } };
}

/** What opening the bell does locally, before the server confirms. */
export function markAllRead(state: NotificationsState, now: string): NotificationsState {
  return {
    ...state,
    items: state.items.map((n) => (n.read_at ? n : { ...n, read_at: now })),
    unreadCount: 0,
  };
}

export function withInviteStatus(state: NotificationsState): AppNotification[] {
  return state.items.map((n) => ({
    ...n,
    invite_status: n.shared_task_id !== null ? (state.inviteStatus[n.shared_task_id] ?? null) : null,
  }));
}
