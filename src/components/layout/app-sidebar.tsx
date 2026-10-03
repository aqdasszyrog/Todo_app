"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  LogoutIcon,
  SpinnerIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { useSidebar } from "./sidebar-provider";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", Icon: DashboardIcon },
  { href: "/shared", label: "Shared tasks", Icon: UsersIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
] as const;

const itemClass =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";

// Desktop (md+): a panel beside the content that collapses to nothing.
// Phones: a drawer that slides in over the content with a backdrop.
// `invisible` on the closed state also takes it out of the tab order.
export function AppSidebar() {
  const pathname = usePathname();
  const { desktopOpen, mobileOpen, closeMobile } = useSidebar();

  return (
    <>
      {mobileOpen && (
        <div
          aria-hidden
          onClick={closeMobile}
          className="animate-fade-in fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 overflow-hidden border-r border-line bg-bg/95 backdrop-blur-xl transition-[translate,visibility] duration-300 md:sticky md:top-16 md:z-10 md:h-[calc(100dvh-4rem)] md:translate-x-0 md:bg-transparent md:backdrop-blur-none md:transition-[width,visibility] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full max-md:invisible"
        } ${desktopOpen ? "md:w-60" : "md:invisible md:w-0 md:border-r-0"}`}
      >
        {/* Fixed width so the contents don't squash while the panel animates. */}
        <div className="flex h-full w-72 flex-col p-3 md:w-60 md:pt-8">
          <div className="mb-4 flex h-10 items-center justify-between px-1 md:hidden">
            <span className="flex items-center gap-2.5">
              <Logo />
              <span className="font-semibold tracking-tight">Todo</span>
            </span>
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Close navigation"
              className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          <nav aria-label="Main" className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMobile}
                  aria-current={active ? "page" : undefined}
                  className={`${itemClass} ${
                    active
                      ? "bg-surface-2 text-fg ring-1 ring-line-strong"
                      : "text-muted hover:bg-surface hover:text-fg"
                  }`}
                >
                  <Icon className={`size-4 ${active ? "text-violet-300" : ""}`} />
                  <span className="flex-1">{label}</span>
                  <PendingIndicator />
                </Link>
              );
            })}
          </nav>

          <form action="/auth/signout" method="post" className="mt-auto border-t border-line pt-3">
            <button
              className={`${itemClass} w-full text-muted hover:bg-red-500/10 hover:text-red-300`}
            >
              <LogoutIcon />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

// Shows a spinner on the clicked link until the next page starts rendering.
function PendingIndicator() {
  const { pending } = useLinkStatus();
  return pending ? <SpinnerIcon className="size-3.5 text-muted" /> : null;
}
