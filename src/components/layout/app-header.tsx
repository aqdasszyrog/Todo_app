import Link from "next/link";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import type { AppNotification } from "@/lib/notifications";
import { SidebarToggle } from "./sidebar-toggle";

type Props = {
  displayName: string;
  notifications: AppNotification[];
  unreadCount: number;
};

export function AppHeader({ displayName, notifications, unreadCount }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/60 backdrop-blur-xl">
      <div className="flex h-16 w-full items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <SidebarToggle />
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-base font-semibold tracking-tight">Todo</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          <Link
            href="/profile"
            title="Your profile"
            className="flex items-center gap-2.5 rounded-full py-1 pr-1 transition hover:bg-surface sm:pr-3 sm:pl-1 sm:ring-1 sm:ring-line"
          >
            <Avatar name={displayName} />
            <span className="hidden max-w-40 truncate text-sm text-fg sm:block">{displayName}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
