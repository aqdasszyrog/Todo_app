import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { syncStripeCustomer } from "@/lib/billing/sync";
import { logError } from "@/lib/log";

// Stripe calls this when a subscription starts, renews, fails to renew or is
// cancelled. Register it in Stripe Dashboard → Developers → Webhooks (see
// README). It's public (no session), so the signature check is what proves
// the request came from Stripe.

const CUSTOMER_EVENTS = new Set<Stripe.Event["type"]>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
]);

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Stripe webhook: missing STRIPE_WEBHOOK_SECRET");
    return new Response("Webhook not configured", { status: 500 });
  }

  // The signature covers the exact bytes Stripe sent, so read the raw body.
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    logError("Stripe webhook: bad signature", error);
    return new Response("Invalid signature", { status: 400 });
  }

  if (!CUSTOMER_EVENTS.has(event.type)) return Response.json({ received: true });

  const customer = (event.data.object as { customer?: string | { id: string } | null }).customer;
  const customerId = typeof customer === "string" ? customer : customer?.id;
  if (!customerId) return Response.json({ received: true });

  try {
    await syncStripeCustomer(customerId);
  } catch (error) {
    // A 5xx makes Stripe retry the event later.
    logError(`Stripe webhook: ${event.type} sync failed`, error);
    return new Response("Sync failed", { status: 500 });
  }
  return Response.json({ received: true });
}
