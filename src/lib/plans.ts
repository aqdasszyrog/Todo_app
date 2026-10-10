// Pricing plans. Shared by the server (billing sync) and the Plans page.

export type PlanId = "basic" | "premium";

export const PLANS: Record<PlanId, { name: string; tagline: string; features: string[] }> = {
  basic: {
    name: "Basic",
    tagline: "Everything you need to stay on top of your tasks.",
    features: [
      "Unlimited personal tasks",
      "Shared tasks with live updates",
      "Chat on every shared task",
      "Notifications",
    ],
  },
  premium: {
    name: "Premium",
    tagline: "Everything in Basic, plus help whenever you need it.",
    features: [
      "Everything in Basic",
      "AI assistant for questions about the app",
      "Priority support",
    ],
  },
};

// Subscription statuses that keep Premium switched on. `past_due` is a grace
// period while Stripe retries a failed payment; once it gives up the status
// becomes `canceled` or `unpaid` and the account drops back to Basic.
const PREMIUM_STATUSES = new Set(["active", "trialing", "past_due"]);

export function planForStatus(status: string | null | undefined): PlanId {
  return status && PREMIUM_STATUSES.has(status) ? "premium" : "basic";
}

export function isPremium(plan: string | null | undefined) {
  return plan === "premium";
}

/** The billing details the Plans page shows. */
export type PlanState = {
  plan: PlanId;
  status: string | null;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingAccount: boolean;
};

/** e.g. "£4.99 / month" */
export function formatPrice(amount: number, currency: string, interval: string | null) {
  const price = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
  return interval ? `${price} / ${interval}` : price;
}
