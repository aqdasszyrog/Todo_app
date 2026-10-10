import Stripe from "stripe";

// Server-only Stripe setup. Read lazily rather than at import, so the app
// (and `next build`) still works before Stripe is configured; the Plans page
// then shows Premium as unavailable instead of crashing.

let client: Stripe | null = null;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PREMIUM_PRICE_ID);
}

export function getStripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Missing environment variable STRIPE_SECRET_KEY. See .env.example.");
    client = new Stripe(key);
  }
  return client;
}

/** The recurring Price customers subscribe to for Premium (`price_…`). */
export function premiumPriceId() {
  const id = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!id) throw new Error("Missing environment variable STRIPE_PREMIUM_PRICE_ID. See .env.example.");
  return id;
}
