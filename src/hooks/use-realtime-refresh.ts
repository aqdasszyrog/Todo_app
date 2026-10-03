import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Several events can arrive together (e.g. our own action's revalidation plus
// its Realtime echo), so wait briefly and refresh once.
const REFRESH_DELAY_MS = 150;

/**
 * Subscribes to Supabase Realtime and re-renders the current route's Server
 * Components when something changes, so the page always shows one fresh,
 * consistent query instead of patching state by hand.
 *
 * `bind` adds the `.on(...)` listeners to the channel and calls `refresh`
 * from them. It runs once per subscription; read changing values from refs.
 */
export function useRealtimeRefresh(
  channelName: string,
  bind: (channel: RealtimeChannel, refresh: () => void) => RealtimeChannel,
) {
  const router = useRouter();
  const bindRef = useRef(bind);

  useEffect(() => {
    bindRef.current = bind;
  });

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hasSubscribed = false;

    function scheduleRefresh() {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
    }

    async function subscribe() {
      // Load the session token before joining. Otherwise the channel can join
      // as `anon`, and RLS then hides every event from it.
      await supabase.realtime.setAuth();
      if (cancelled) return;

      channel = bindRef.current(supabase.channel(channelName), scheduleRefresh).subscribe(
        (status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error(`Realtime ${channelName}: ${status}`, err);
          }
          if (status !== "SUBSCRIBED") return;
          // After a reconnect (sleep, network drop) we may have missed events.
          if (hasSubscribed) scheduleRefresh();
          hasSubscribed = true;
        },
      );
    }

    subscribe().catch((err) => console.error(`Realtime ${channelName}: couldn't subscribe`, err));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [channelName, router]);
}
