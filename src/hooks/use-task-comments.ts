import { useCallback, useEffect, useMemo, useState } from "react";
import { COMMENTS_PAGE_SIZE, type TaskComment } from "@/lib/comments";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeChannel } from "./use-realtime-channel";

// The chat is read from the browser rather than through Server Components:
// messages arrive over Realtime and are merged into local state, so a new
// message doesn't re-render the whole page. Reads go through
// shared_task_comments_page(), which returns nothing unless the caller owns
// the task or has accepted the invite. Writes still go through Server Actions.

/** Oldest first, no duplicates (a message can arrive via our own send and Realtime). */
function merge(current: TaskComment[], incoming: TaskComment[]) {
  const byId = new Map(current.map((c) => [c.id, c]));
  for (const comment of incoming) byId.set(comment.id, comment);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export function useTaskComments(taskId: number) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (beforeId: number | null) => {
      const { data, error } = await supabase.rpc("shared_task_comments_page", {
        p_task_id: taskId,
        p_before_id: beforeId,
        p_limit: COMMENTS_PAGE_SIZE,
      });
      if (error) throw error;
      return data as TaskComment[];
    },
    [supabase, taskId],
  );

  /** Fetches the latest page and merges it in: initial load and after Realtime events. */
  const syncLatest = useCallback(async () => {
    try {
      const page = await fetchPage(null);
      setComments((current) => merge(current, page));
      setError(null);
      return page;
    } catch (err) {
      console.error("Loading chat failed", err);
      setError("Couldn't load messages.");
      return null;
    }
  }, [fetchPage]);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    fetchPage(null)
      .then((page) => {
        if (cancelled) return;
        setComments((current) => merge(current, page));
        setHasMore(page.length === COMMENTS_PAGE_SIZE);
      })
      .catch((err) => {
        console.error("Loading chat failed", err);
        if (!cancelled) setError("Couldn't load messages.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  async function loadEarlier() {
    if (!comments.length || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(comments[0].id);
      setComments((current) => merge(current, page));
      setHasMore(page.length === COMMENTS_PAGE_SIZE);
    } catch (err) {
      console.error("Loading earlier messages failed", err);
      setError("Couldn't load earlier messages.");
    } finally {
      setLoadingMore(false);
    }
  }

  /** Adds a message we just sent, before its Realtime echo arrives. */
  const addLocal = useCallback((comment: TaskComment) => {
    setComments((current) => merge(current, [comment]));
  }, []);

  const removeLocal = useCallback((id: number) => {
    setComments((current) => current.filter((c) => c.id !== id));
  }, []);

  useRealtimeChannel(
    `task_comments:${taskId}`,
    (channel) =>
      channel
        // Payloads have no author name, so fetch the latest page instead
        // (RLS already ensured we may see this task's messages).
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "shared_task_comments", filter: `task_id=eq.${taskId}` },
          () => void syncLatest(),
        )
        // Delete events can't be filtered and only carry the id.
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "shared_task_comments" }, (payload) =>
          removeLocal(payload.old.id as number),
        ),
    () => void syncLatest(),
  );

  return { comments, loading, error, hasMore, loadingMore, loadEarlier, addLocal, removeLocal };
}
