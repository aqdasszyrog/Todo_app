"use server";

import { getAuthedClient, SIGNED_OUT, type ActionResult } from "@/lib/actions";
import { logError } from "@/lib/log";

export async function respondToInvite(taskId: number, accept: boolean): Promise<ActionResult> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;

  const { error } = await session.supabase.rpc("respond_to_invite", {
    p_task_id: taskId,
    p_accept: accept === true,
  });

  if (error) {
    if (error.code === "P0002") return { error: "This invitation is no longer available." };
    logError("respond_to_invite failed", error);
    return { error: "Couldn't respond to the invite. Try again." };
  }

  // No revalidation: the bell and the /shared list are updated by the
  // `membership` and `notifications` broadcasts this change triggers.
  return {};
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;

  const { error } = await session.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.userId)
    .is("read_at", null);

  if (error) {
    logError("markNotificationsRead failed", error);
    return { error: "Couldn't update notifications." };
  }
  return {};
}
