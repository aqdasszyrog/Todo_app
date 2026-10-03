"use client";

import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

// Updates the bell as soon as someone invites us, answers our invite, or
// sends a chat message. New chat messages often update an existing unread
// notification rather than inserting one, so listen for both.
export function RealtimeNotifications({ userId }: { userId: string }) {
  useRealtimeRefresh(`notifications:${userId}`, (channel, refresh) =>
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        refresh,
      ),
  );

  return null;
}
