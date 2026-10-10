import type Stripe from "stripe";
import { logError } from "@/lib/log";
import { planForStatus, type PlanId } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "./stripe";

// Stripe is the source of truth for who has paid. Rather than piecing the
// plan together from individual webhook payloads (which can arrive out of
// order), every change re-reads the customer's subscriptions from Stripe and
// writes the result onto their profile.
export async function syncStripeCustomer(customerId: string): Promise<PlanId> {
  const { data: subscriptions } = await getStripe().subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  // Newest first. Prefer one that grants Premium over, say, an older
  // cancelled one.
  const subscription =
    subscriptions.find((s) => planForStatus(s.status) === "premium") ?? subscriptions[0] ?? null;
  const plan = planForStatus(subscription?.status);

  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({
      plan,
      stripe_subscription_id: subscription?.id ?? null,
      subscription_status: subscription?.status ?? null,
      ...periodDetails(plan === "premium" ? subscription : null),
    })
    .eq("stripe_customer_id", customerId)
    .select("id");

  if (error) {
    logError("syncStripeCustomer failed", error);
    throw new Error("Couldn't save the subscription");
  }
  if (!data.length) console.warn("syncStripeCustomer: no profile has Stripe customer", customerId);
  return plan;
}

// When Premium renews, or when it ends if the user has cancelled.
function periodDetails(subscription: Stripe.Subscription | null) {
  if (!subscription) return { plan_renews_at: null, plan_cancel_at_period_end: false };

  const periodEnd = subscription.items.data[0]?.current_period_end ?? null;
  const endsAt = subscription.cancel_at ?? (subscription.cancel_at_period_end ? periodEnd : null);
  const at = endsAt ?? periodEnd;
  return {
    plan_renews_at: at ? new Date(at * 1000).toISOString() : null,
    plan_cancel_at_period_end: endsAt !== null,
  };
}

/**
 * Called when the user lands back on the app after paying, so Premium shows
 * straight away even if the webhook hasn't arrived yet. Only syncs a
 * checkout that belongs to this user.
 */
export async function syncCheckoutSession(sessionId: string, userId: string) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== userId || !session.customer) return null;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
  return syncStripeCustomer(customerId);
}
