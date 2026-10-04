import { useCallback, useEffect, useMemo, useState } from "react";
import { markNotificationsRead } from "@/actions/notifications";
import {
  applyNotificationChanges,
  loadNotifications,
  markAllRead,
  setInviteStatus,
  withInviteStatus,
  type MemberStatus,
  type NotificationsState,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeEvent, useRealtimeUserId } from "./use-realtime";

// The bell's data. Loaded once from the browser (the layout stays mounted
// between pages, so this runs once per visit, not per navigation), then kept
// current by `notifications` and `membership` broadcasts. Nothing here
// re-renders the page.
export function useNotifications() {
  const userId = useRealtimeUserId();
  const [state, setState] = useState<NotificationsState | null>(null);

  const reload = useCallback(async () => {
    try {
      setState(await loadNotifications(createClient(), userId));
    } catch (err) {
      console.error("Loading notifications failed", err);
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    loadNotifications(createClient(), userId)
      .then((loaded) => {
        if (!cancelled) setState(loaded);
      })
      .catch((err) => console.error("Loading notifications failed", err));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useRealtimeEvent("notifications", (changes) =>
    setState((current) => current && applyNotificationChanges(current, changes)),
  );
  useRealtimeEvent("membership", ({ task_id, status }) =>
    setState((current) => current && setInviteStatus(current, task_id, status)),
  );
  useRealtimeEvent("resync", () => void reload());

  const notifications = useMemo(() => (state ? withInviteStatus(state) : []), [state]);

  /** Marks everything read now; the broadcast that follows confirms it. */
  const readAll = useCallback(async () => {
    setState((current) => current && markAllRead(current, new Date().toISOString()));
    const result = await markNotificationsRead();
    if (result.error) await reload();
  }, [reload]);

  const answerInvite = useCallback((taskId: number, status: MemberStatus) => {
    setState((current) => current && setInviteStatus(current, taskId, status));
  }, []);

  return {
    notifications,
    unreadCount: state?.unreadCount ?? 0,
    loaded: state !== null,
    readAll,
    answerInvite,
  };
}
