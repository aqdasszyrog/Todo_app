import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, parseTaskFilters, tasksHref } from "./task-filters";

describe("task filters", () => {
  it("falls back to defaults for anything unknown", () => {
    expect(parseTaskFilters({ status: "nope", sort: "random", page: "-3" })).toEqual(DEFAULT_FILTERS);
  });

  it("round-trips through the URL, leaving defaults out", () => {
    const filters = parseTaskFilters({ q: " milk ", status: "completed", page: "2" });
    expect(filters).toMatchObject({ q: "milk", status: "completed", page: 2 });
    expect(tasksHref(filters)).toBe("/?q=milk&status=completed&page=2");
    expect(tasksHref(DEFAULT_FILTERS)).toBe("/");
  });
});
