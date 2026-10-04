"use client";

import { useEffect, useRef, useState } from "react";
import { BellIcon, SpinnerIcon } from "@/components/ui/icons";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationItem } from "./notification-item";

export function NotificationBell() {
  const { notifications, unreadCount, loaded, readAll, answerInvite } = useNotifications();
  const [open, setOpen] = useState(false);
  // Ids that were unread when the panel opened. Opening marks everything as
  // read, but we keep highlighting these until the panel closes.
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  function openPanel() {
    setOpen(true);
    setHighlighted(new Set(notifications.filter((n) => !n.read_at).map((n) => n.id)));
    if (unreadCount > 0) void readAll();
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

  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        className="relative grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg active:scale-90"
      >
        <BellIcon />
        {unreadCount > 0 && (
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

          {!loaded ? (
            <div className="grid place-items-center py-10 text-muted">
              <SpinnerIcon className="size-5" />
            </div>
          ) : notifications.length === 0 ? (
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
                  onAnswered={answerInvite}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
