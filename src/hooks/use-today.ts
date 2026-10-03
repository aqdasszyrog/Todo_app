import { useSyncExternalStore } from "react";
import { localDateString } from "@/lib/dates";

const subscribe = () => () => {};

/**
 * Today's date in the user's timezone, or null during server rendering.
 * The server can't know the user's timezone, so anything that depends on
 * "today" (overdue, "Tomorrow") renders neutrally there and fills in once
 * the page hydrates, instead of causing a hydration mismatch.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, localDateString, () => null);
}
