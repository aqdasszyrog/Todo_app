"use client";

import { createContext, useCallback, useContext, useMemo, useReducer, useState } from "react";
import { useRealtimeEvent } from "@/hooks/use-realtime";
import {
  fetchSharedTasks,
  nextCursorOf,
  sharedTasksReducer,
  type SharedTask,
  type SharedTasksAction,
} from "@/lib/shared-tasks";
import { createClient } from "@/lib/supabase/client";

type SharedTasksContextValue = {
  tasks: SharedTask[];
  /** Applies a change: from an action's result here, or a broadcast. */
  dispatch: (action: SharedTasksAction) => void;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  loadMore: () => Promise<void>;
};

const SharedTasksContext = createContext<SharedTasksContextValue | null>(null);

export function useSharedTasks() {
  const value = useContext(SharedTasksContext);
  if (!value) throw new Error("useSharedTasks must be used inside <SharedTasksProvider>");
  return value;
}

type Props = {
  /** First page from the server (plus a linked task, if any). */
  initialTasks: SharedTask[];
  initialCursor: number | null;
  children: React.ReactNode;
};

// Holds the /shared list in the browser. The server renders the first page;
// after that, the list changes only by actions taken here and by broadcasts,
// so another member's edit updates one card instead of re-rendering the page.
export function SharedTasksProvider({ initialTasks, initialCursor, children }: Props) {
  const [tasks, dispatch] = useReducer(sharedTasksReducer, initialTasks);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  // Following a link to this page while already on it (e.g. a task from the
  // bell) renders the server page again with new props; fold them in.
  const [seenInitial, setSeenInitial] = useState(initialTasks);
  if (initialTasks !== seenInitial) {
    setSeenInitial(initialTasks);
    dispatch({ type: "merge", tasks: initialTasks });
  }

  useRealtimeEvent("shared_task", ({ task }) => dispatch({ type: "upsert", task }));
  useRealtimeEvent("shared_task_deleted", ({ task_id }) => dispatch({ type: "remove", id: task_id }));
  useRealtimeEvent("shared_task_people", ({ task_id, people }) =>
    dispatch({ type: "people", id: task_id, people }),
  );
  useRealtimeEvent("membership", ({ task_id, status, task }) => {
    // Joined (here or on another device), or left / removed / declined.
    if (status === "accepted" && task) dispatch({ type: "upsert", task });
    else if (status !== "invited") dispatch({ type: "remove", id: task_id });
  });
  // After a dropped connection, start again from a fresh first page.
  useRealtimeEvent("resync", () => {
    fetchSharedTasks(createClient())
      .then((page) => {
        dispatch({ type: "reset", tasks: page });
        setCursor(nextCursorOf(page));
      })
      .catch((err) => console.error("Reloading shared tasks failed", err));
  });

  const loadMore = useCallback(async () => {
    if (cursor === null || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await fetchSharedTasks(createClient(), { beforeId: cursor });
      dispatch({ type: "merge", tasks: page });
      setCursor(nextCursorOf(page));
    } catch (err) {
      console.error("Loading more shared tasks failed", err);
      setLoadMoreError("Couldn't load more tasks. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  const value = useMemo(
    () => ({ tasks, dispatch, hasMore: cursor !== null, loadingMore, loadMoreError, loadMore }),
    [tasks, cursor, loadingMore, loadMoreError, loadMore],
  );

  return <SharedTasksContext value={value}>{children}</SharedTasksContext>;
}
