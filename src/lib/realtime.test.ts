import { describe, expect, it, vi } from "vitest";
import { RealtimeBus, userTopic } from "./realtime";

describe("RealtimeBus", () => {
  it("delivers each event only to its own listeners, until they unsubscribe", () => {
    const bus = new RealtimeBus("u1");
    const onTask = vi.fn();
    const onComment = vi.fn();
    const off = bus.on("task", onTask);
    bus.on("comment", onComment);

    bus.emit("task", { op: "update", ids: [1] });
    expect(onTask).toHaveBeenCalledWith({ op: "update", ids: [1] });
    expect(onComment).not.toHaveBeenCalled();

    off();
    bus.emit("task", { op: "update", ids: [2] });
    expect(onTask).toHaveBeenCalledTimes(1);
  });

  it("keeps notifying other listeners when one throws", () => {
    const bus = new RealtimeBus("u1");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const after = vi.fn();
    bus.on("task", () => {
      throw new Error("boom");
    });
    bus.on("task", after);
    bus.emit("task", {});
    expect(after).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("names the user's topic the way the database does", () => {
    expect(userTopic("abc")).toBe("user:abc");
  });
});
