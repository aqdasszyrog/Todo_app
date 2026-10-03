"use client";

import { MenuIcon } from "@/components/ui/icons";
import { useSidebar } from "./sidebar-provider";

export function SidebarToggle() {
  const { toggle } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-controls="app-sidebar"
      aria-label="Toggle navigation"
      title="Toggle navigation"
      className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg active:scale-90"
    >
      <MenuIcon />
    </button>
  );
}
