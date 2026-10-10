import type { ReactNode } from "react";
import { CheckIcon, SparklesIcon } from "@/components/ui/icons";
import { PLANS, type PlanId } from "@/lib/plans";

type Props = {
  id: PlanId;
  price: string;
  current: boolean;
  /** Button or status shown at the bottom of the card. */
  children?: ReactNode;
};

export function PlanCard({ id, price, current, children }: Props) {
  const { name, tagline, features } = PLANS[id];
  const premium = id === "premium";

  return (
    <section
      aria-labelledby={`plan-${id}`}
      className={`relative flex flex-col rounded-2xl border bg-surface p-5 backdrop-blur-sm sm:p-6 ${
        premium ? "border-violet-500/40 shadow-lg shadow-violet-500/10" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={`plan-${id}`} className="flex items-center gap-2 text-lg font-semibold">
          {premium && <SparklesIcon className="size-4 text-violet-300" />}
          {name}
        </h2>
        {current && (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/30">
            Current plan
          </span>
        )}
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight">{price}</p>
      <p className="mt-1 text-sm text-muted">{tagline}</p>

      <ul className="mt-5 space-y-2.5 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <CheckIcon className={`mt-0.5 size-4 shrink-0 ${premium ? "text-violet-300" : "text-muted"}`} />
            {feature}
          </li>
        ))}
      </ul>

      {children && <div className="mt-auto pt-6">{children}</div>}
    </section>
  );
}
