"use client";

import { createContext, use, useEffect, useState } from "react";
import { SIDEBAR_COOKIE, SIDEBAR_COOKIE_MAX_AGE } from "@/lib/sidebar";

// Matches Tailwind's `md` breakpoint, where the sidebar stops being a drawer.
const DESKTOP_QUERY = "(min-width: 48rem)";

type SidebarContextValue = {
  /** Desktop: panel shown beside the content. Remembered in a cookie. */
  desktopOpen: boolean;
  /** Phones: panel slides over the content. Always starts closed. */
  mobileOpen: boolean;
  toggle: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [desktopOpen, setDesktopOpen] = useState(defaultOpen);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggle() {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      const next = !desktopOpen;
      setDesktopOpen(next);
      document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
    } else {
      setMobileOpen((open) => !open);
    }
  }

  // Escape closes the drawer, like any other overlay.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <SidebarContext
      value={{ desktopOpen, mobileOpen, toggle, closeMobile: () => setMobileOpen(false) }}
    >
      {children}
    </SidebarContext>
  );
}

export function useSidebar() {
  const context = use(SidebarContext);
  if (!context) throw new Error("useSidebar must be used inside <SidebarProvider>.");
  return context;
}
