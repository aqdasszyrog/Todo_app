"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthedClient, SIGNED_OUT, type ActionResult } from "@/lib/actions";
import { getStripe, premiumPriceId, stripeConfigured } from "@/lib/billing/stripe";
import { logError } from "@/lib/log";
import { isPremium } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

const NOT_CONFIGURED: ActionResult = { error: "Premium isn't available yet. Try again later." };

// Both actions send the browser off to a page hosted by Stripe. Nothing about
// the plan changes here: that only happens once Stripe confirms the payment
// (src/lib/billing/sync.ts).

export async function startPremiumCheckout(): Promise<ActionResult> {
  if (!stripeConfigured()) return NOT_CONFIGURED;
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;
  const { supabase, userId } = session;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("name, email, plan, stripe_customer_id")
    .eq("id", userId)
    .single();
  if (error) {
    logError("startPremiumCheckout profile failed", error);
    return { error: "Couldn't start the upgrade. Try again." };
  }
  if (isPremium(profile.plan)) return { error: "You're already on Premium." };

  let url: string | null;
  try {
    const customerId =
      profile.stripe_customer_id ?? (await createCustomer(userId, profile.email, profile.name));
    const origin = await appOrigin();

    const checkout = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: premiumPriceId(), quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/plans?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plans?checkout=cancelled`,
    });
    url = checkout.url;
  } catch (e) {
    logError("startPremiumCheckout failed", e);
    return { error: "Couldn't start the upgrade. Try again." };
  }
  if (!url) return { error: "Couldn't start the upgrade. Try again." };

  // Outside the try: redirect() works by throwing.
  redirect(url);
}

// Stripe's Customer Portal: change card, see invoices, cancel.
export async function openBillingPortal(): Promise<ActionResult> {
  if (!stripeConfigured()) return NOT_CONFIGURED;
  const session = await getAuthedClient();
  if (!session) return SIGNED_OUT;
  const { supabase, userId } = session;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();
  if (error) logError("openBillingPortal profile failed", error);
  if (!profile?.stripe_customer_id) return { error: "No billing account found." };

  let url: string;
  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${await appOrigin()}/plans`,
    });
    url = portal.url;
  } catch (e) {
    logError("openBillingPortal failed", e);
    return { error: "Couldn't open billing. Try again." };
  }

  redirect(url);
}

// One Stripe customer per user, remembered on their profile. The idempotency
// key makes a double click reuse the same customer rather than create two.
async function createCustomer(userId: string, email: string | null, name: string | null) {
  const customer = await getStripe().customers.create(
    { email: email ?? undefined, name: name ?? undefined, metadata: { user_id: userId } },
    { idempotencyKey: `customer-${userId}` },
  );

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);
  if (error) throw error;

  return customer.id;
}

// Where Stripe should send the user back to. Browsers send Origin with every
// Server Action request (Next.js checks it), so this is the URL they're on.
async function appOrigin() {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) return origin;
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
