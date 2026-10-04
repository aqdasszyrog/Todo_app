import { createContext, useContext, useEffect, useRef } from "react";
import type { RealtimeBus, RealtimeEvent, RealtimeEvents } from "@/lib/realtime";

export const RealtimeContext = createContext<RealtimeBus | null>(null);

function useBus() {
  const bus = useContext(RealtimeContext);
  if (!bus) throw new Error("useRealtimeEvent must be used inside <RealtimeProvider>");
  return bus;
}

/** The signed-in user's id, as known to the realtime connection. */
export function useRealtimeUserId() {
  return useBus().userId;
}

/**
 * Calls `handler` for every `event` broadcast to the signed-in user. The
 * handler may change between renders; the latest one is always used.
 */
export function useRealtimeEvent<E extends RealtimeEvent>(
  event: E,
  handler: (payload: RealtimeEvents[E]) => void,
) {
  const bus = useBus();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(
    () => bus.on(event, (payload) => handlerRef.current(payload as RealtimeEvents[E])),
    [bus, event],
  );
}
