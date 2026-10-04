"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { RealtimeContext } from "@/hooks/use-realtime";
import { RealtimeBus, userTopic } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";

// One Realtime channel per tab, for the whole signed-in app. Components
// listen with useRealtimeEvent() instead of opening channels of their own,
// so the number of connections doesn't grow with what's on screen.
export function RealtimeProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [bus] = useState(() => new RealtimeBus(userId));

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let cancelled = false;
    let hasSubscribed = false;

    async function join() {
      // Load the session token first: a private channel joined without it
      // is rejected by the realtime.messages policy.
      await supabase.realtime.setAuth();
      if (cancelled) return;

      channel = supabase
        .channel(userTopic(userId), { config: { private: true } })
        .on("broadcast", { event: "*" }, ({ event, payload }) => bus.emit(event, payload))
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error(`Realtime ${userTopic(userId)}: ${status}`, err);
          }
          if (status !== "SUBSCRIBED") return;
          // Rejoined after a drop (sleep, network loss): events may have
          // been missed, so let listeners reload.
          if (hasSubscribed) bus.emit("resync", undefined);
          hasSubscribed = true;
        });
    }

    join().catch((err) => console.error("Realtime: couldn't join", err));

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [bus, userId]);

  return <RealtimeContext value={bus}>{children}</RealtimeContext>;
}
