import { formatPrice } from "@/lib/plans";
import { logError } from "@/lib/log";
import { getStripe, premiumPriceId, stripeConfigured } from "./stripe";

/**
 * Premium's price as set in the Stripe Dashboard, e.g. "£4.99 / month", so
 * changing the price there is all it takes. Null when Stripe isn't set up or
 * can't be reached.
 */
export async function getPremiumPriceLabel() {
  if (!stripeConfigured()) return null;
  try {
    const price = await getStripe().prices.retrieve(premiumPriceId());
    if (price.unit_amount === null) return null;
    return formatPrice(price.unit_amount, price.currency, price.recurring?.interval ?? null);
  } catch (error) {
    logError("getPremiumPriceLabel failed", error);
    return null;
  }
}
