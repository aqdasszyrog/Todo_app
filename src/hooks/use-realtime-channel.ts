import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Joins a Supabase Realtime channel for the component's lifetime.
 *
 * `bind` adds the `.on(...)` listeners. It runs once per subscription, so
 * read values that change between renders from refs. `onReconnect` runs when
 * the channel rejoins after a drop (sleep, network loss), when events may
 * have been missed.
 */
export function useRealtimeChannel(
  channelName: string,
  bind: (channel: RealtimeChannel) => RealtimeChannel,
  onReconnect?: () => void,
) {
  const bindRef = useRef(bind);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    bindRef.current = bind;
    onReconnectRef.current = onReconnect;
  });

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancelled = false;
    let hasSubscribed = false;

    async function subscribe() {
      // Load the session token before joining. Otherwise the channel can join
      // as `anon`, and RLS then hides every event from it.
      await supabase.realtime.setAuth();
      if (cancelled) return;

      channel = bindRef.current(supabase.channel(channelName)).subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`Realtime ${channelName}: ${status}`, err);
        }
        if (status !== "SUBSCRIBED") return;
        if (hasSubscribed) onReconnectRef.current?.();
        hasSubscribed = true;
      });
    }

    subscribe().catch((err) => console.error(`Realtime ${channelName}: couldn't subscribe`, err));

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [channelName]);
}
