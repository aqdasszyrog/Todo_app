import { useCallback, useEffect, useMemo, useState } from "react";
import { COMMENTS_PAGE_SIZE, mergeComments, type TaskComment } from "@/lib/comments";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeEvent } from "./use-realtime";

// The chat is read from the browser rather than through Server Components:
// new messages arrive as `comment` broadcasts that already carry the
// author's name, and are merged into local state with no query at all.
// Pages of history go through shared_task_comments_page(), which returns
// nothing unless the caller owns the task or has accepted the invite.
// Writes go through Server Actions.

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
      return data;
    },
    [supabase, taskId],
  );

  // Initial load. The user's channel is already open (it lives in the
  // layout), so nothing sent from here on is missed.
  useEffect(() => {
    let cancelled = false;
    fetchPage(null)
      .then((page) => {
        if (cancelled) return;
        setComments((current) => mergeComments(current, page));
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
      setComments((current) => mergeComments(current, page));
      setHasMore(page.length === COMMENTS_PAGE_SIZE);
    } catch (err) {
      console.error("Loading earlier messages failed", err);
      setError("Couldn't load earlier messages.");
    } finally {
      setLoadingMore(false);
    }
  }

  /** Adds a message we just sent, before its broadcast arrives. */
  const addLocal = useCallback((comment: TaskComment) => {
    setComments((current) => mergeComments(current, [comment]));
  }, []);

  const removeLocal = useCallback((id: number) => {
    setComments((current) => current.filter((c) => c.id !== id));
  }, []);

  useRealtimeEvent("comment", ({ comment }) => {
    if (comment.task_id === taskId) addLocal(comment);
  });
  useRealtimeEvent("comment_deleted", ({ task_id, id }) => {
    if (task_id === taskId) removeLocal(id);
  });
  // After a dropped connection, catch up on the latest page.
  useRealtimeEvent("resync", () => {
    fetchPage(null)
      .then((page) => setComments((current) => mergeComments(current, page)))
      .catch((err) => console.error("Reloading chat failed", err));
  });

  return { comments, loading, error, hasMore, loadingMore, loadEarlier, addLocal, removeLocal };
}
