import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { PAGE_SIZE, tasksHref, type TaskFilters } from "@/lib/task-filters";

type Props = { filters: TaskFilters; total: number };

const pageButton =
  "grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm tabular-nums transition";

/** Page numbers to show, e.g. [1, "…", 4, 5, 6, "…", 12]. */
function pageItems(current: number, count: number): (number | "…")[] {
  const pages = new Set([1, count, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);

  const items: (number | "…")[] = [];
  for (const page of sorted) {
    const previous = items.at(-1);
    if (typeof previous === "number" && page - previous > 1) items.push("…");
    items.push(page);
  }
  return items;
}

export function TaskPagination({ filters, total }: Props) {
  const pageCount = Math.ceil(total / PAGE_SIZE);
  if (total === 0) return null;

  const { page } = filters;
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted">
        Showing <span className="text-fg tabular-nums">{first}–{last}</span> of{" "}
        <span className="text-fg tabular-nums">{total}</span>
      </p>

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <PageLink filters={filters} page={page - 1} disabled={page <= 1} label="Previous page">
            <ChevronLeftIcon />
          </PageLink>

          {pageItems(page, pageCount).map((item, i) =>
            item === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-muted">
                …
              </span>
            ) : (
              <Link
                key={item}
                href={tasksHref({ ...filters, page: item })}
                aria-current={item === page ? "page" : undefined}
                className={`${pageButton} ${
                  item === page
                    ? "bg-surface-2 font-semibold text-fg ring-1 ring-line-strong"
                    : "text-muted hover:bg-surface hover:text-fg"
                }`}
              >
                {item}
              </Link>
            ),
          )}

          <PageLink filters={filters} page={page + 1} disabled={page >= pageCount} label="Next page">
            <ChevronRightIcon />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  filters,
  page,
  disabled,
  label,
  children,
}: {
  filters: TaskFilters;
  page: number;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-hidden className={`${pageButton} text-muted opacity-40`}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={tasksHref({ ...filters, page })}
      aria-label={label}
      className={`${pageButton} text-muted hover:bg-surface hover:text-fg`}
    >
      {children}
    </Link>
  );
}
