// Must match supabase/migrations/010_shared_task_comments.sql

export const COMMENT_MAX_LENGTH = 2000;

/** Messages loaded at a time ("Load earlier" fetches the next batch). */
export const COMMENTS_PAGE_SIZE = 50;

export type TaskComment = {
  id: number;
  /** Null when the author's account was deleted. */
  author_id: string | null;
  author_name: string | null;
  body: string;
  created_at: string;
};

/**
 * Oldest first, no duplicates: the same message can arrive from our own
 * send, from the broadcast, and from a page load.
 */
export function mergeComments(current: TaskComment[], incoming: TaskComment[]) {
  const byId = new Map(current.map((c) => [c.id, c]));
  for (const comment of incoming) byId.set(comment.id, comment);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
