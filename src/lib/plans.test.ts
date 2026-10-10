import { describe, expect, it } from "vitest";
import { formatPrice, planForStatus } from "./plans";

describe("planForStatus", () => {
  it("gives Premium while the subscription is paid up, trialing or being retried", () => {
    expect(planForStatus("active")).toBe("premium");
    expect(planForStatus("trialing")).toBe("premium");
    expect(planForStatus("past_due")).toBe("premium");
  });

  it("falls back to Basic for ended, unpaid or missing subscriptions", () => {
    expect(planForStatus("canceled")).toBe("basic");
    expect(planForStatus("unpaid")).toBe("basic");
    expect(planForStatus("incomplete")).toBe("basic");
    expect(planForStatus("incomplete_expired")).toBe("basic");
    expect(planForStatus(null)).toBe("basic");
  });
});

describe("formatPrice", () => {
  it("formats Stripe's minor units with the billing interval", () => {
    expect(formatPrice(499, "gbp", "month")).toBe("£4.99 / month");
    expect(formatPrice(5000, "usd", "year")).toBe("US$50 / year");
    expect(formatPrice(900, "eur", null)).toBe("€9");
  });
});
