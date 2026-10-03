"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient, SIGNED_OUT, type ActionResult } from "@/lib/actions";
import type { TaskComment } from "@/lib/comments";
import { logError } from "@/lib/log";
import { isInvalid, validateCommentBody } from "@/lib/validation";

// Who may read, post and delete is enforced by RLS on shared_task_comments
// (010_shared_task_comments.sql); these actions validate input and turn
// database errors into messages.

const RLS_VIOLATION = "42501";

export async function postComment(
  taskId: number,
  body: string,
): Promise<ActionResult & { comment?: Omit<TaskComment, "author_name"> }> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;

  const value = validateCommentBody(body);
  if (isInvalid(value)) return value;

  // author_id defaults to auth.uid(), and RLS rejects the insert unless the
  // user owns the task or has accepted the invite.
  const { data, error } = await session.supabase
    .from("shared_task_comments")
    .insert({ task_id: taskId, body: value })
    .select("id, author_id, body, created_at")
    .single();

  if (error) {
    if (error.code === RLS_VIOLATION) return { error: "You're no longer a member of this task." };
    logError("postComment failed", error);
    return { error: "Couldn't send your message. Try again." };
  }
  return { comment: data };
}

export async function deleteComment(commentId: number): Promise<ActionResult> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;

  // RLS: authors can delete their own messages, task owners can delete any.
  const { data, error } = await session.supabase
    .from("shared_task_comments")
    .delete()
    .eq("id", commentId)
    .select("id");

  if (error) {
    logError("deleteComment failed", error);
    return { error: "Couldn't delete the message. Try again." };
  }
  if (!data?.length) return { error: "You can't delete this message." };
  return {};
}

/** Marks this task's chat notifications as read, e.g. when its chat is opened. */
export async function markTaskChatRead(taskId: number): Promise<ActionResult> {
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;

  const { data, error } = await session.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.userId)
    .eq("shared_task_id", taskId)
    .eq("type", "task_comment")
    .is("read_at", null)
    .select("id");

  if (error) {
    logError("markTaskChatRead failed", error);
    return { error: "Couldn't update notifications." };
  }
  // Only refresh the bell if something actually changed.
  if (data.length) revalidatePath("/", "layout");
  return {};
}
