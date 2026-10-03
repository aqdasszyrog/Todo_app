"use client";

import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDownIcon, SearchIcon, SpinnerIcon } from "@/components/ui/icons";
import {
  SEARCH_MAX_LENGTH,
  SORT_LABEL,
  SORTS,
  tasksHref,
  type TaskFilters as Filters,
} from "@/lib/task-filters";
import { PRIORITY, PRIORITY_LABEL, PROGRESS, PROGRESS_LABEL, type TaskSummary } from "@/lib/tasks";

type Props = { filters: Filters; summary: TaskSummary | null };

const PRIORITY_OPTIONS = [
  { value: "all", label: "Any priority" },
  ...PRIORITY.map((p) => ({ value: p, label: `${PRIORITY_LABEL[p]} priority` })),
];
const SORT_OPTIONS = SORTS.map((s) => ({ value: s, label: SORT_LABEL[s] }));

// Every control here only changes the URL; the page reads it on the server
// and loads the matching tasks. Filters come in as props (already parsed and
// validated), so this component never reads the URL itself.
export function TaskFilters({ filters, summary }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(changes: Partial<Filters>) {
    // Changing what's shown always starts again from the first page.
    startTransition(() => router.push(tasksHref({ ...filters, ...changes, page: 1 })));
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    apply({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
  }

  // Counts are across all tasks, so hide them while search or priority
  // narrows the list; they'd contradict what's on screen.
  const showCounts = summary && !filters.q && filters.priority === "all";
  const statusTabs = [
    { key: "all" as const, label: "All", count: summary && PROGRESS.reduce((n, p) => n + summary[p], 0) },
    ...PROGRESS.map((p) => ({ key: p, label: PROGRESS_LABEL[p], count: summary?.[p] })),
  ];

  return (
    <div className="animate-fade-up space-y-3 [animation-delay:180ms]">
      <div className="flex flex-col gap-2 sm:flex-row">
        <form role="search" onSubmit={handleSearch} className="relative flex-1">
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            {pending ? <SpinnerIcon /> : <SearchIcon />}
          </span>
          <input
            // Re-mount when the URL's search changes (back button, "clear filters").
            key={filters.q}
            id="task-search"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Search tasks… (press Enter)"
            maxLength={SEARCH_MAX_LENGTH}
            autoComplete="off"
            // The browser's ✕ button empties the field without submitting.
            onChange={(e) => e.target.value === "" && filters.q && apply({ q: "" })}
            className="h-10 w-full rounded-xl border border-line bg-surface pr-3 pl-9 text-sm text-fg placeholder:text-muted transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
          />
        </form>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <FilterSelect
            id="task-priority-filter"
            label="Filter by priority"
            value={filters.priority}
            options={PRIORITY_OPTIONS}
            onChange={(priority) => apply({ priority: priority as Filters["priority"] })}
          />
          <FilterSelect
            id="task-sort"
            label="Sort tasks"
            value={filters.sort}
            options={SORT_OPTIONS}
            onChange={(sort) => apply({ sort: sort as Filters["sort"] })}
          />
        </div>
      </div>

      {/* Status tabs: scroll sideways on narrow screens instead of wrapping */}
      <nav
        aria-label="Filter by status"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,black_85%,transparent)] [scrollbar-width:none] sm:mx-0 sm:px-0 sm:[mask-image:none]"
      >
        {statusTabs.map((tab) => {
          const active = filters.status === tab.key;
          return (
            <Link
              key={tab.key}
              href={tasksHref({ ...filters, status: tab.key, page: 1 })}
              aria-current={active ? "page" : undefined}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-indigo-500/25 via-violet-500/25 to-fuchsia-500/25 text-fg ring-1 ring-violet-400/40 ring-inset"
                  : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              {tab.label}
              {showCounts && (
                <span
                  className={`min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums ${
                    active ? "bg-white/15 text-fg" : "bg-surface-2 text-muted"
                  }`}
                >
                  {tab.count}
                </span>
              )}
              <LinkPending />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-line bg-surface pr-8 pl-3 text-sm text-fg transition hover:border-line-strong focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted" />
    </div>
  );
}

function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <SpinnerIcon className="size-3.5" /> : null;
}
