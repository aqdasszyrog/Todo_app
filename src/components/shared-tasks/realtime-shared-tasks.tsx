"use client";

import { useEffect, useRef } from "react";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

// Shows other members' changes (progress, new members, removals) live.
// RLS means we only receive events for shared tasks we can see.
export function RealtimeSharedTasks({ userId, taskIds }: { userId: string; taskIds: number[] }) {
  const taskIdsRef = useRef(new Set(taskIds));

  useEffect(() => {
    taskIdsRef.current = new Set(taskIds);
  }, [taskIds]);

  useRealtimeRefresh(`shared_tasks:${userId}`, (channel, refresh) => {
    // Deletes only carry the primary key and reach every subscriber, so only
    // react to ones for tasks on screen.
    const onDelete = (payload: { old: { id?: number; task_id?: number } }) => {
      const id = payload.old.id ?? payload.old.task_id;
      if (id !== undefined && taskIdsRef.current.has(id)) refresh();
    };

    return channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shared_tasks" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shared_tasks" }, refresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "shared_tasks" }, onDelete)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "shared_task_members" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shared_task_members" }, refresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "shared_task_members" }, onDelete);
  });

  return null;
}
