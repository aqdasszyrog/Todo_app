"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeEvent } from "@/hooks/use-realtime";

// Several events can arrive together (e.g. our own action's revalidation plus
// its broadcast), so wait briefly and refresh once.
const REFRESH_DELAY_MS = 150;

// Keeps the task list in sync across tabs and devices signed in to the same
// account. Personal tasks only ever change by this user's own hand, so a
// refresh here is rare, and it re-renders the page's Server Components so
// the filtered page, counts and subtitle all come from one fresh query.
export function RealtimeTasks() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refresh = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
  }, [router]);

  useEffect(() => () => clearTimeout(timer.current), []);

  useRealtimeEvent("task", refresh);
  useRealtimeEvent("resync", refresh);

  return null;
}
