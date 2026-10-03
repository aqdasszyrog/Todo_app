import { createClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_LIMIT, type AppNotification } from "@/lib/notifications";
import { logError } from "@/lib/log";

/** The user's latest notifications plus their unread count. RLS limits both to the user. */
export async function getNotifications(userId: string) {
  const supabase = await createClient();

  const [list, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, actor_name, task_title, shared_task_id, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(NOTIFICATIONS_LIMIT)
      .overrideTypes<Omit<AppNotification, "invite_status">[], { merge: false }>(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);

  if (list.error || unread.error) {
    logError("getNotifications failed", list.error ?? unread.error);
    return { notifications: [] as AppNotification[], unreadCount: 0 };
  }

  // Invites need their current status so the bell knows whether to show
  // Accept/Decline, "Accepted", or "no longer available".
  const inviteTaskIds = list.data
    .filter((n) => n.type === "task_invite" && n.shared_task_id !== null)
    .map((n) => n.shared_task_id as number);

  const statusByTask = new Map<number, AppNotification["invite_status"]>();
  if (inviteTaskIds.length) {
    const { data: memberships } = await supabase
      .from("shared_task_members")
      .select("task_id, status")
      .eq("user_id", userId)
      .in("task_id", inviteTaskIds);
    for (const m of memberships ?? []) statusByTask.set(m.task_id, m.status);
  }

  const notifications: AppNotification[] = list.data.map((n) => ({
    ...n,
    invite_status: n.shared_task_id ? (statusByTask.get(n.shared_task_id) ?? null) : null,
  }));

  return { notifications, unreadCount: unread.count ?? 0 };
}
