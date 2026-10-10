import { logError } from "@/lib/log";
import type { PlanState } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

// The signed-in user's plan, for the Plans page. RLS limits it to their row.
export async function getPlanState(userId: string): Promise<PlanState | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("plan, subscription_status, plan_renews_at, plan_cancel_at_period_end, stripe_customer_id")
    .eq("id", userId)
    .single();

  if (error) {
    logError("getPlanState failed", error);
    return null;
  }
  return {
    plan: data.plan === "premium" ? "premium" : "basic",
    status: data.subscription_status,
    renewsAt: data.plan_renews_at,
    cancelAtPeriodEnd: data.plan_cancel_at_period_end,
    hasBillingAccount: Boolean(data.stripe_customer_id),
  };
}
