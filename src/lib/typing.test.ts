import { describe, expect, it } from "vitest";
import {
  TYPING_HEARTBEAT_MS,
  TYPING_TIMEOUT_MS,
  TypingRoster,
  TypingSender,
  chatTopic,
  typingLabel,
} from "./typing";

describe("TypingSender", () => {
  it("announces typing once per heartbeat, however fast the keystrokes", () => {
    const sender = new TypingSender();
    expect(sender.input("h", 0)).toBe("typing");
    expect(sender.input("he", 100)).toBeNull();
    expect(sender.input("hel", TYPING_HEARTBEAT_MS - 1)).toBeNull();
    expect(sender.input("hell", TYPING_HEARTBEAT_MS)).toBe("typing");
  });

  it("sends stop when the draft is cleared, but only after announcing", () => {
    const sender = new TypingSender();
    expect(sender.input("   ", 0)).toBeNull();
    expect(sender.stop()).toBeNull();

    sender.input("hi", 0);
    expect(sender.input("", 50)).toBe("stop");
    expect(sender.stop()).toBeNull();
  });

  it("announces again straight away after stopping", () => {
    const sender = new TypingSender();
    sender.input("hi", 0);
    sender.stop();
    expect(sender.input("next", 10)).toBe("typing");
  });
});

describe("TypingRoster", () => {
  it("lists typists in the order they started, and drops them on stop", () => {
    const roster = new TypingRoster();
    expect(roster.typing("a", "Ann", 0)).toBe(true);
    expect(roster.typing("b", "Bob", 0)).toBe(true);
    expect(roster.typing("a", "Ann", 1000)).toBe(false);
    expect(roster.list().map((t) => t.name)).toEqual(["Ann", "Bob"]);

    expect(roster.stop("a")).toBe(true);
    expect(roster.stop("a")).toBe(false);
    expect(roster.list().map((t) => t.name)).toEqual(["Bob"]);
  });

  it("forgets typists whose heartbeats stop, and keeps those still typing", () => {
    const roster = new TypingRoster();
    roster.typing("a", "Ann", 0);
    roster.typing("b", "Bob", 0);
    roster.typing("b", "Bob", TYPING_HEARTBEAT_MS);

    expect(roster.nextExpiry()).toBe(TYPING_TIMEOUT_MS);
    expect(roster.expire(TYPING_TIMEOUT_MS - 1)).toBe(false);
    expect(roster.expire(TYPING_TIMEOUT_MS)).toBe(true);
    expect(roster.list().map((t) => t.name)).toEqual(["Bob"]);
    expect(roster.nextExpiry()).toBe(TYPING_HEARTBEAT_MS + TYPING_TIMEOUT_MS);
  });

  it("clears everyone (e.g. after a reconnect)", () => {
    const roster = new TypingRoster();
    expect(roster.clear()).toBe(false);
    roster.typing("a", "Ann", 0);
    expect(roster.clear()).toBe(true);
    expect(roster.nextExpiry()).toBeNull();
  });
});

describe("typingLabel", () => {
  const t = (...names: string[]) => names.map((name, i) => ({ userId: String(i), name }));

  it("reads naturally for any number of typists", () => {
    expect(typingLabel([])).toBe("");
    expect(typingLabel(t("Ann"))).toBe("Ann is typing…");
    expect(typingLabel(t("Ann", "Bob"))).toBe("Ann and Bob are typing…");
    expect(typingLabel(t("Ann", "Bob", "Cy"))).toBe("Ann, Bob and Cy are typing…");
    expect(typingLabel(t("Ann", "Bob", "Cy", "Di", "Ed"))).toBe("Ann, Bob and 3 others are typing…");
  });
});

it("names the chat topic the way the database does", () => {
  expect(chatTopic(42)).toBe("chat:42");
});
