import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BillingButton } from "@/components/plans/billing-button";
import { PlanCard } from "@/components/plans/plan-card";
import { getPremiumPriceLabel } from "@/lib/billing/price";
import { syncCheckoutSession } from "@/lib/billing/sync";
import { getCurrentUser } from "@/lib/data/current-user";
import { getPlanState } from "@/lib/data/plans";
import { logError } from "@/lib/log";
import type { PlanState } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Plans · Todo",
};

export default async function PlansPage({ searchParams }: PageProps<"/plans">) {
  const { checkout, session_id } = await searchParams;
  const { userId } = await getCurrentUser();

  // Back from Stripe Checkout: confirm the payment now rather than wait for
  // the webhook, then drop the session id so a refresh doesn't redo it.
  if (typeof session_id === "string") {
    try {
      await syncCheckoutSession(session_id, userId);
    } catch (error) {
      logError("syncCheckoutSession failed", error);
    }
    redirect("/plans?checkout=success");
  }

  const [state, premiumPrice] = await Promise.all([getPlanState(userId), getPremiumPriceLabel()]);

  return (
    <>
      <div className="animate-fade-up mb-6 sm:mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Plans</h1>
        <p className="mt-2 text-muted">
          {state?.plan === "premium" ? "You're on Premium. Thanks for your support!" : "You're on the Basic plan."}
        </p>
      </div>

      {state ? (
        <>
          <CheckoutBanner checkout={checkout} plan={state.plan} />

          <div className="animate-fade-up grid gap-4 [animation-delay:60ms] sm:grid-cols-2">
            <PlanCard id="basic" price="Free" current={state.plan === "basic"} />

            <PlanCard id="premium" price={premiumPrice ?? "—"} current={state.plan === "premium"}>
              {state.plan === "premium" ? (
                <div className="space-y-3">
                  <SubscriptionStatus state={state} />
                  {state.hasBillingAccount && <BillingButton kind="manage" />}
                </div>
              ) : premiumPrice ? (
                <BillingButton kind="upgrade" />
              ) : (
                <p className="text-sm text-muted">Premium isn&apos;t available yet. Check back soon.</p>
              )}
            </PlanCard>
          </div>

          {state.plan === "basic" && state.hasBillingAccount && (
            <div className="mt-6 max-w-xs">
              <BillingButton kind="manage" />
            </div>
          )}
        </>
      ) : (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">
          Couldn&apos;t load your plan. Refresh the page to try again.
        </p>
      )}
    </>
  );
}

function CheckoutBanner({ checkout, plan }: { checkout: string | string[] | undefined; plan: PlanState["plan"] }) {
  if (checkout === "success") {
    return plan === "premium" ? (
      <Banner tone="success">Welcome to Premium! Your upgrade is active.</Banner>
    ) : (
      <Banner tone="info">Payment received. Premium will switch on in a moment, refresh if it doesn&apos;t.</Banner>
    );
  }
  if (checkout === "cancelled") {
    return <Banner tone="info">Checkout cancelled. You haven&apos;t been charged.</Banner>;
  }
  return null;
}

function Banner({ tone, children }: { tone: "success" | "info"; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={`animate-fade-up mb-6 rounded-2xl border p-4 text-sm ${
        tone === "success"
          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
          : "border-line bg-surface-2 text-fg"
      }`}
    >
      {children}
    </p>
  );
}

function SubscriptionStatus({ state }: { state: PlanState }) {
  if (state.status === "past_due") {
    return (
      <p className="text-sm text-amber-300">
        Your last payment didn&apos;t go through. Update your card to keep Premium.
      </p>
    );
  }
  if (!state.renewsAt) return null;

  const date = new Date(state.renewsAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <p className="text-sm text-muted">
      {state.cancelAtPeriodEnd ? `Premium ends on ${date}.` : `Renews on ${date}.`}
    </p>
  );
}
