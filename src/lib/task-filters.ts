import { isPriority, isProgress, type Priority, type Progress } from "./tasks";

// The dashboard's search, filters, sort and page all live in the URL
// (?q=…&status=…&priority=…&sort=…&page=…), so they survive a refresh, can
// be shared, and work with the back button. This module is the single place
// that reads and writes those params; it's used on both server and client.

export const PAGE_SIZE = 10;
export const SEARCH_MAX_LENGTH = 100;

export const SORTS = ["newest", "oldest", "due", "priority"] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABEL: Record<Sort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  due: "Due date",
  priority: "Priority",
};

export type TaskFilters = {
  q: string;
  status: Progress | "all";
  priority: Priority | "all";
  sort: Sort;
  page: number;
};

export const DEFAULT_FILTERS: TaskFilters = {
  q: "",
  status: "all",
  priority: "all",
  sort: "newest",
  page: 1,
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Turns raw URL params into valid filters; anything unknown falls back to the default. */
export function parseTaskFilters(params: SearchParams): TaskFilters {
  const status = first(params.status);
  const priority = first(params.priority);
  const sort = first(params.sort);
  const page = Number(first(params.page));

  return {
    q: (first(params.q) ?? "").trim().slice(0, SEARCH_MAX_LENGTH),
    status: isProgress(status) ? status : "all",
    priority: isPriority(priority) ? priority : "all",
    sort: SORTS.includes(sort as Sort) ? (sort as Sort) : "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Dashboard URL for the given filters, leaving out defaults to keep it short. */
export function tasksHref(filters: Partial<TaskFilters>) {
  const params = new URLSearchParams();
  for (const key of ["q", "status", "priority", "sort", "page"] as const) {
    const value = filters[key];
    if (value !== undefined && value !== DEFAULT_FILTERS[key]) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function hasActiveFilters(filters: TaskFilters) {
  return filters.q !== "" || filters.status !== "all" || filters.priority !== "all";
}
