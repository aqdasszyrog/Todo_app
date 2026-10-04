import { describe, expect, it } from "vitest";
import { mergeComments, type TaskComment } from "./comments";

const comment = (id: number, body = `m${id}`): TaskComment => ({
  id,
  author_id: "u1",
  author_name: "Ann",
  body,
  created_at: "2026-01-01T00:00:00Z",
});

describe("mergeComments", () => {
  it("keeps one copy of a message that arrives from both the send and the broadcast", () => {
    const merged = mergeComments([comment(1), comment(2)], [comment(2), comment(3)]);
    expect(merged.map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it("puts an earlier page before the messages already shown", () => {
    const merged = mergeComments([comment(5), comment(6)], [comment(4), comment(3)]);
    expect(merged.map((c) => c.id)).toEqual([3, 4, 5, 6]);
  });
});
