"use client";

import { useState, useTransition } from "react";
import { openBillingPortal, startPremiumCheckout } from "@/actions/billing";
import { SpinnerIcon } from "@/components/ui/icons";

const ACTIONS = {
  upgrade: { run: startPremiumCheckout, label: "Upgrade to Premium" },
  manage: { run: openBillingPortal, label: "Manage billing" },
};

const styles = {
  upgrade:
    "bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-[length:200%_100%] text-white shadow-lg shadow-violet-500/25 hover:bg-right hover:shadow-violet-500/40",
  manage: "border border-line-strong bg-surface-2 text-fg hover:bg-white/10",
};

// On success the action redirects to Stripe, so the spinner stays until the
// browser leaves the page.
export function BillingButton({ kind }: { kind: keyof typeof ACTIONS }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { run, label } = ACTIONS[kind];

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await run();
            if (result?.error) setError(result.error);
          })
        }
        className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all duration-300 active:scale-95 disabled:cursor-wait disabled:opacity-60 disabled:active:scale-100 ${styles[kind]}`}
      >
        {pending && <SpinnerIcon />}
        {label}
      </button>
      {error && (
        <p className="animate-fade-up mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
