import { describe, expect, it } from "vitest";
import {
  nextCursorOf,
  SHARED_TASKS_PAGE_SIZE,
  sharedTasksReducer,
  type SharedTask,
  type SharedTaskPerson,
} from "./shared-tasks";

const owner: SharedTaskPerson = { user_id: "u1", name: "Ann", email: "ann@x.io", role: "owner" };
const member: SharedTaskPerson = { user_id: "u2", name: "Bo", email: "bo@x.io", role: "accepted" };

function task(id: number, overrides: Partial<SharedTask> = {}): SharedTask {
  return {
    id,
    owner_id: "u1",
    title: `Task ${id}`,
    description: null,
    progress: "incomplete",
    priority: "medium",
    due_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    people: [owner],
    ...overrides,
  };
}

/** The row without people, as an edit broadcast or action result carries it. */
function fields(t: SharedTask) {
  return Object.fromEntries(Object.entries(t).filter(([key]) => key !== "people")) as Omit<SharedTask, "people">;
}

describe("sharedTasksReducer", () => {
  it("adds a new task with people in newest-first order", () => {
    const state = sharedTasksReducer([task(1)], { type: "upsert", task: task(2) });
    expect(state.map((t) => t.id)).toEqual([2, 1]);
  });

  it("ignores an edit to a task it doesn't show", () => {
    const state = sharedTasksReducer([task(1)], { type: "upsert", task: fields(task(9)) });
    expect(state.map((t) => t.id)).toEqual([1]);
  });

  it("applies an edit and keeps the people it already has", () => {
    const start = [task(1, { people: [owner, member] })];
    const edited = fields(task(1, { progress: "completed", updated_at: "2026-01-02T00:00:00Z" }));
    const [result] = sharedTasksReducer(start, { type: "upsert", task: edited });
    expect(result.progress).toBe("completed");
    expect(result.people).toEqual([owner, member]);
  });

  it("never lets an older version overwrite a newer one", () => {
    const start = [task(1, { progress: "completed", updated_at: "2026-01-02T00:00:00Z" })];
    const stale = task(1, { progress: "in_progress", updated_at: "2026-01-01T00:00:00Z" });
    const [result] = sharedTasksReducer(start, { type: "upsert", task: stale });
    expect(result.progress).toBe("completed");
  });

  it("removes, replaces people, merges pages without duplicates", () => {
    let state = sharedTasksReducer([task(3), task(2)], { type: "remove", id: 3 });
    expect(state.map((t) => t.id)).toEqual([2]);

    state = sharedTasksReducer(state, { type: "people", id: 2, people: [owner, member] });
    expect(state[0].people).toEqual([owner, member]);

    state = sharedTasksReducer(state, { type: "merge", tasks: [task(2), task(1)] });
    expect(state.map((t) => t.id)).toEqual([2, 1]);
  });
});

describe("nextCursorOf", () => {
  it("continues after a full page and stops after a short one", () => {
    const full = Array.from({ length: SHARED_TASKS_PAGE_SIZE }, (_, i) => task(100 - i));
    expect(nextCursorOf(full)).toBe(100 - SHARED_TASKS_PAGE_SIZE + 1);
    expect(nextCursorOf([task(1)])).toBeNull();
  });
});
