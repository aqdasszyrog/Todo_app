"use client";

import { useEffect, useRef } from "react";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

// Keeps the task list in sync across tabs and devices signed in to the same
// account. On any change it re-renders the page's Server Components, so the
// list, counts and subtitle all come from one fresh query.
export function RealtimeTasks({ userId, taskIds }: { userId: string; taskIds: number[] }) {
  const taskIdsRef = useRef(new Set(taskIds));

  useEffect(() => {
    taskIdsRef.current = new Set(taskIds);
  }, [taskIds]);

  useRealtimeRefresh(`user_tasks:${userId}`, (channel, refresh) =>
    channel
      .on(
        "postgres_changes",
        // The filter saves Realtime work; RLS enforces it anyway.
        { event: "*", schema: "public", table: "user_tasks", filter: `user_id=eq.${userId}` },
        refresh,
      )
      // Delete events can't be filtered and reach every user with only the
      // row id, so ignore ids that aren't on our list.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "user_tasks" }, (payload) => {
        if (taskIdsRef.current.has(payload.old.id)) refresh();
      }),
  );

  return null;
}
