"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Several events can arrive together (e.g. our own action's revalidation plus
// its Realtime echo), so wait briefly and refresh once.
const REFRESH_DELAY_MS = 150;

// Keeps the task list in sync across tabs and devices signed in to the same
// account. On any change it re-renders the page's Server Components, so the
// list, counts and subtitle all come from one fresh query.
export function RealtimeTasks({ userId, taskIds }: { userId: string; taskIds: number[] }) {
  const router = useRouter();
  const taskIdsRef = useRef(new Set(taskIds));

  useEffect(() => {
    taskIdsRef.current = new Set(taskIds);
  }, [taskIds]);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hasSubscribed = false;

    function scheduleRefresh() {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
    }

    const channel = supabase
      .channel(`user_tasks:${userId}`)
      .on(
        "postgres_changes",
        // The filter saves Realtime work; RLS enforces it anyway.
        { event: "*", schema: "public", table: "user_tasks", filter: `user_id=eq.${userId}` },
        scheduleRefresh,
      )
      // Delete events can't be filtered and reach every user with only the
      // row id, so ignore ids that aren't on our list.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "user_tasks" }, (payload) => {
        if (taskIdsRef.current.has(payload.old.id)) scheduleRefresh();
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        // After a reconnect (sleep, network drop) we may have missed events.
        if (hasSubscribed) scheduleRefresh();
        hasSubscribed = true;
      });

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
