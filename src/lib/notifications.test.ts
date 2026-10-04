import { describe, expect, it } from "vitest";
import {
  applyNotificationChanges,
  markAllRead,
  NOTIFICATIONS_LIMIT,
  setInviteStatus,
  withInviteStatus,
  type NotificationRow,
  type NotificationsState,
} from "./notifications";

function row(id: number, overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id,
    type: "task_comment",
    actor_name: "Sam",
    task_title: "Plan trip",
    shared_task_id: 1,
    preview: "hi",
    comment_count: 1,
    read_at: null,
    created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, id)).toISOString(),
    ...overrides,
  };
}

const empty: NotificationsState = { items: [], unreadCount: 0, inviteStatus: {} };

describe("applyNotificationChanges", () => {
  it("adds new rows newest first and takes the server's unread count", () => {
    const state = applyNotificationChanges(empty, { upserts: [row(1), row(2)], deletes: [], unread_count: 2 });
    expect(state.items.map((n) => n.id)).toEqual([2, 1]);
    expect(state.unreadCount).toBe(2);
  });

  it("replaces a row that was bumped by a new chat message and moves it to the top", () => {
    const start = applyNotificationChanges(empty, { upserts: [row(1), row(2)], deletes: [], unread_count: 2 });
    const bumped = row(1, { comment_count: 2, created_at: new Date(Date.UTC(2026, 0, 2)).toISOString() });
    const state = applyNotificationChanges(start, { upserts: [bumped], deletes: [], unread_count: 2 });
    expect(state.items.map((n) => n.id)).toEqual([1, 2]);
    expect(state.items[0].comment_count).toBe(2);
  });

  it("drops deleted rows", () => {
    const start = applyNotificationChanges(empty, { upserts: [row(1), row(2)], deletes: [], unread_count: 2 });
    const state = applyNotificationChanges(start, { upserts: [], deletes: [2], unread_count: 1 });
    expect(state.items.map((n) => n.id)).toEqual([1]);
    expect(state.unreadCount).toBe(1);
  });

  it("keeps at most the bell's limit", () => {
    const rows = Array.from({ length: NOTIFICATIONS_LIMIT + 5 }, (_, i) => row(i + 1));
    const state = applyNotificationChanges(empty, { upserts: rows, deletes: [], unread_count: rows.length });
    expect(state.items).toHaveLength(NOTIFICATIONS_LIMIT);
    expect(state.items[0].id).toBe(NOTIFICATIONS_LIMIT + 5);
  });

  it("corrects an optimistic mark-all-read when a new message arrives", () => {
    const start = applyNotificationChanges(empty, { upserts: [row(1)], deletes: [], unread_count: 1 });
    const read = markAllRead(start, "2026-01-03T00:00:00.000Z");
    expect(read.unreadCount).toBe(0);
    // The server's count is absolute, so it can't drift below zero or double-count.
    const state = applyNotificationChanges(read, { upserts: [row(2)], deletes: [], unread_count: 1 });
    expect(state.unreadCount).toBe(1);
  });
});

describe("invite status", () => {
  it("attaches the latest status to invite notifications", () => {
    let state = applyNotificationChanges(empty, {
      upserts: [row(1, { type: "task_invite", shared_task_id: 7 })],
      deletes: [],
      unread_count: 1,
    });
    expect(withInviteStatus(state)[0].invite_status).toBeNull();
    state = setInviteStatus(state, 7, "accepted");
    expect(withInviteStatus(state)[0].invite_status).toBe("accepted");
  });
});
