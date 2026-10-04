import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  TypingRoster,
  TypingSender,
  chatTopic,
  type Typist,
  type TypingEvents,
} from "@/lib/typing";
import { useRealtimeEvent } from "./use-realtime";

// Names longer than this are cut short; it's someone else's browser talking.
const MAX_NAME_LENGTH = 60;

/**
 * "Is typing…" for one shared task's chat. Joins the private `chat:<id>`
 * channel while the chat is open; it rides on the tab's single Realtime
 * WebSocket, so it costs a channel, not a connection.
 *
 * Returns who else is typing, plus `onDraftChange` (call on every edit) and
 * `stopTyping` (call on send or blur).
 */
export function useTyping(taskId: number, userId: string, myName: string) {
  const supabase = useMemo(() => createClient(), []);
  const [typists, setTypists] = useState<Typist[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const roster = useRef(new TypingRoster());
  const sender = useRef(new TypingSender());
  const myNameRef = useRef(myName);

  useEffect(() => {
    myNameRef.current = myName;
  });

  // Typists expire on a single timer set for whoever is due next, rather
  // than polling.
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // A heartbeat from someone already shown only moves their expiry, so it
  // doesn't re-render.
  const update = useCallback((listChanged: boolean) => {
    function run(changed: boolean) {
      clearTimeout(expiryTimer.current);
      const next = roster.current.nextExpiry();
      if (next !== null) {
        expiryTimer.current = setTimeout(() => run(roster.current.expire(Date.now())), Math.max(0, next - Date.now()));
      }
      if (changed) setTypists(roster.current.list());
    }
    run(listChanged);
  }, []);

  const send = useCallback(
    <E extends keyof TypingEvents>(event: E, payload: TypingEvents[E]) => {
      const channel = channelRef.current;
      // Only over the open socket: channel.send() would otherwise fall back
      // to an HTTP request per call, which is exactly what we don't want.
      if (channel?.state !== "joined") return;
      void channel.send({ type: "broadcast", event, payload });
    },
    [],
  );

  useEffect(() => {
    let channel: RealtimeChannel | undefined;
    let cancelled = false;
    const currentRoster = roster.current;
    const currentSender = sender.current;

    async function join() {
      // The private channel is authorized with the session token.
      await supabase.realtime.setAuth();
      if (cancelled) return;

      channel = supabase
        .channel(chatTopic(taskId), { config: { private: true } })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          const { user_id, name } = (payload ?? {}) as Partial<TypingEvents["typing"]>;
          if (typeof user_id !== "string" || typeof name !== "string" || user_id === userId) return;
          update(currentRoster.typing(user_id, name.slice(0, MAX_NAME_LENGTH) || "Someone", Date.now()));
        })
        .on("broadcast", { event: "stop" }, ({ payload }) => {
          const { user_id } = (payload ?? {}) as Partial<TypingEvents["stop"]>;
          if (typeof user_id === "string" && currentRoster.stop(user_id)) update(true);
        })
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error(`Realtime ${chatTopic(taskId)}: ${status}`, err);
          }
          // Whatever we knew before a drop is stale; heartbeats will refill it.
          if (status !== "SUBSCRIBED" && currentRoster.clear()) update(true);
          // Others missed our heartbeats while we were away; re-announce on
          // the next keystroke instead of waiting out the throttle.
          if (status === "SUBSCRIBED") currentSender.stop();
        });
      channelRef.current = channel;
    }

    join().catch((err) => console.error("Realtime: couldn't join chat", err));

    return () => {
      cancelled = true;
      if (currentSender.stop()) send("stop", { user_id: userId });
      channelRef.current = null;
      if (channel) supabase.removeChannel(channel);
      currentRoster.clear();
      clearTimeout(expiryTimer.current);
      setTypists([]);
    };
  }, [supabase, taskId, userId, update, send]);

  // Their message landed, so they've stopped typing (it can arrive before
  // their `stop`).
  useRealtimeEvent("comment", ({ comment }) => {
    if (comment.task_id === taskId && comment.author_id && roster.current.stop(comment.author_id)) update(true);
  });

  const onDraftChange = useCallback(
    (draft: string) => {
      const event = sender.current.input(draft, Date.now());
      if (event === "typing") send("typing", { user_id: userId, name: myNameRef.current });
      else if (event === "stop") send("stop", { user_id: userId });
    },
    [send, userId],
  );

  const stopTyping = useCallback(() => {
    if (sender.current.stop()) send("stop", { user_id: userId });
  }, [send, userId]);

  return { typists, onDraftChange, stopTyping };
}
