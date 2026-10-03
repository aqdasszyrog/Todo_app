import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRealtimeChannel } from "./use-realtime-channel";

// Several events can arrive together (e.g. our own action's revalidation plus
// its Realtime echo), so wait briefly and refresh once.
const REFRESH_DELAY_MS = 150;

/**
 * Re-renders the current route's Server Components when a Realtime event
 * arrives, so the page always shows one fresh, consistent query instead of
 * patching state by hand.
 *
 * `bind` adds the `.on(...)` listeners and calls `refresh` from them.
 */
export function useRealtimeRefresh(
  channelName: string,
  bind: (channel: RealtimeChannel, refresh: () => void) => RealtimeChannel,
) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refresh = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
  }, [router]);

  useEffect(() => () => clearTimeout(timer.current), []);

  useRealtimeChannel(channelName, (channel) => bind(channel, refresh), refresh);
}
