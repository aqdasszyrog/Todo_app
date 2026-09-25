import { LogoutIcon } from "./icons";
import { Logo } from "./logo";

export function AppHeader({ displayName }: { displayName: string }) {
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-base font-semibold tracking-tight">Todo</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 rounded-full py-1 pr-1 sm:pr-3 sm:pl-1 sm:ring-1 sm:ring-line">
            <span className="rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-px">
              <span className="grid size-8 place-items-center rounded-full bg-bg text-xs font-semibold">
                {initials}
              </span>
            </span>
            <span className="hidden max-w-40 truncate text-sm text-fg sm:block">{displayName}</span>
          </div>
          <form action="/auth/signout" method="post">
            <button
              className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg active:scale-90"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogoutIcon />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
