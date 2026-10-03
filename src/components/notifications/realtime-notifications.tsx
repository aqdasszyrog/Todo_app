"use client";

import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

// Updates the bell as soon as someone invites us or answers our invite.
export function RealtimeNotifications({ userId }: { userId: string }) {
  useRealtimeRefresh(`notifications:${userId}`, (channel, refresh) =>
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      refresh,
    ),
  );

  return null;
}
