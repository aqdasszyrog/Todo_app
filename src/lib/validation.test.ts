import { describe, expect, it } from "vitest";
import { isInvalid, validateCommentBody, validateDueDate, validateEmail, validateTaskChanges, validateTitle } from "./validation";

describe("validation", () => {
  it("trims titles and rejects empty or overlong ones", () => {
    expect(validateTitle("  Buy milk ")).toBe("Buy milk");
    expect(isInvalid(validateTitle("   "))).toBe(true);
    expect(isInvalid(validateTitle("x".repeat(501)))).toBe(true);
  });

  it("accepts only real calendar dates", () => {
    expect(validateDueDate("2026-02-28")).toBe("2026-02-28");
    expect(validateDueDate("")).toBeNull();
    expect(isInvalid(validateDueDate("2026-02-31"))).toBe(true);
  });

  it("normalises emails", () => {
    expect(validateEmail(" Ann@Example.COM ")).toBe("ann@example.com");
    expect(isInvalid(validateEmail("not-an-email"))).toBe(true);
  });

  it("limits chat messages", () => {
    expect(validateCommentBody(" hi ")).toBe("hi");
    expect(isInvalid(validateCommentBody(""))).toBe(true);
    expect(isInvalid(validateCommentBody("x".repeat(2001)))).toBe(true);
  });

  it("only includes the fields that were sent", () => {
    expect(validateTaskChanges({ progress: "completed" })).toEqual({ progress: "completed" });
    expect(validateTaskChanges({ dueDate: "" })).toEqual({ due_date: null });
    expect(isInvalid(validateTaskChanges({ priority: "urgent" as never }))).toBe(true);
  });
});
