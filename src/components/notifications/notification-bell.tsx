"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { markNotificationsRead } from "@/actions/notifications";
import { BellIcon } from "@/components/ui/icons";
import type { AppNotification } from "@/lib/notifications";
import { NotificationItem } from "./notification-item";

type Props = { notifications: AppNotification[]; unreadCount: number };

export function NotificationBell({ notifications, unreadCount }: Props) {
  const [open, setOpen] = useState(false);
  // Ids that were unread when the panel opened. Opening marks everything as
  // read, but we keep highlighting these until the panel closes.
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const [optimisticUnread, setOptimisticUnread] = useOptimistic(unreadCount);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  function openPanel() {
    setOpen(true);
    setHighlighted(new Set(notifications.filter((n) => !n.read_at).map((n) => n.id)));
    if (unreadCount > 0) {
      startTransition(async () => {
        setOptimisticUnread(0);
        await markNotificationsRead();
      });
    }
  }

  // Close on outside click or Escape, like any other popover.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const badge = optimisticUnread > 9 ? "9+" : String(optimisticUnread);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          optimisticUnread ? `Notifications, ${optimisticUnread} unread` : "Notifications"
        }
        className="relative grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg active:scale-90"
      >
        <BellIcon />
        {optimisticUnread > 0 && (
          <span className="animate-pop absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 px-1 text-[10px] font-bold text-white tabular-nums ring-2 ring-bg">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="animate-fade-in absolute top-full right-0 z-30 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line-strong bg-[#0d0e14]/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
          </div>

          {notifications.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <BellIcon className="mx-auto size-6 text-muted" />
              <p className="mt-2 text-sm text-muted">You&apos;re all caught up.</p>
            </div>
          ) : (
            <ul className="max-h-[min(28rem,70dvh)] divide-y divide-line overflow-y-auto">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  highlighted={highlighted.has(n.id)}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
