import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { RealtimeNotifications } from "@/components/notifications/realtime-notifications";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { getCurrentUser } from "@/lib/data/current-user";
import { getNotifications } from "@/lib/data/notifications";
import { displayNameOf } from "@/lib/profile";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

// Shared shell for every signed-in page: header on top, collapsible
// navigation on the left. It stays mounted while moving between pages.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [{ userId, profile }, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);
  const { notifications, unreadCount } = await getNotifications(userId);
  const sidebarOpen = cookieStore.get(SIDEBAR_COOKIE)?.value !== "false";

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <div className="flex flex-1 flex-col">
        <RealtimeNotifications userId={userId} />
        <AppHeader
          displayName={displayNameOf(profile)}
          notifications={notifications}
          unreadCount={unreadCount}
        />

        <div className="flex flex-1">
          <AppSidebar />
          <main className="mx-auto w-full max-w-3xl min-w-0 flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-14">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
