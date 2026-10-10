import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly when navigating to Plans, while it loads.
export default function PlansLoading() {
  return (
    <div role="status" aria-label="Loading plans">
      <Skeleton className="h-10 w-28 sm:h-11" />
      <Skeleton className="mt-3 h-5 w-56 max-w-full" />
      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-4 h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
